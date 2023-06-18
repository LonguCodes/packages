import {
  DynamicModule,
  Inject,
  Logger,
  LogLevel,
  Module,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DiscoveryModule, DiscoveryService, Reflector } from '@nestjs/core';
import { SubOptions, SUBSCRIBE_KEY } from './decorators/subscribe.decorator';
import * as amqplib from 'amqplib';
import { Channel, Connection } from 'amqplib';
import { ConsumeMessage, Options } from 'amqplib';
import { v4 } from 'uuid';
import { MESSAGE_KEY } from './decorators/message.decorator';
import { ParseFailedError } from './errors/parse-failed.error';
import { PUBLISH_KEY, PubOptions } from './decorators/publish.decorator';
import { QueueConfigMissingError } from './errors/queue-config-missing.error';
import {
  RABBIT_CHANNEL_KEY,
  RABBIT_CONNECTION_KEY,
  RABBIT_QUEUES_KEY,
} from './tokens';
import { ModuleOptionsFactory } from '@longucodes/common';
import { RabbitMessagePublisher } from './rabbit-message.publisher';

export interface RabbitModuleExchange {
  name: string;
  type: 'direct' | 'topic' | 'headers' | 'fanout' | 'match';
}

export interface RabbitModuleQueue extends Options.AssertQueue {
  name: string;
  token?: string | symbol;
  ignorePrefix?: boolean;
  options?: Options.AssertQueue;
}

export interface RabbitModuleOptions {
  exchanges?: RabbitModuleExchange[];
  queues?: RabbitModuleQueue[];
  url: string;
  global?: boolean;
  assert?: boolean;
  logLevel?: LogLevel;
  queuePrefix?: string;
}

const RABBIT_CONFIG_KEY = Symbol('rabbit-config');

@Module({
  imports: [DiscoveryModule],
  exports: [RABBIT_CONNECTION_KEY, RABBIT_CHANNEL_KEY],
})
export class RabbitModule implements OnModuleInit, OnModuleDestroy {
  public static async forRoot(
    options: RabbitModuleOptions
  ): Promise<DynamicModule> {
    return {
      module: RabbitModule,
      global: options.global,
      providers: [
        RabbitMessagePublisher,
        {
          provide: RABBIT_CONNECTION_KEY,
          useFactory: async () => {
            try {
              const connection = await amqplib.connect(options.url);
              connection.on('error', (e) => {
                Logger[options.logLevel ?? 'error'](e);
              });
              return connection;
            } catch (e) {
              Logger[options.logLevel ?? 'error'](e);
              return null;
            }
          },
        },
        {
          inject: [{ token: RABBIT_CONNECTION_KEY, optional: true }],
          provide: RABBIT_CHANNEL_KEY,
          useFactory: async (connection?: Connection) => {
            if (!connection) return null;
            const channel = await connection.createChannel();
            await channel.prefetch(1, true);
            return channel;
          },
        },
        {
          provide: RABBIT_CONFIG_KEY,
          useValue: options,
        },
        {
          provide: RABBIT_QUEUES_KEY,
          useValue:
            options.queues
              ?.filter((queue) => queue.token)
              .reduce((curr, queue) => {
                curr[queue.token] = this.getQueueName(options, queue.name);
                return curr;
              }, {}) ?? [],
        },
      ],
      exports: [RabbitMessagePublisher],
    };
  }

  public static async forRootAsync(
    options: ModuleOptionsFactory<RabbitModuleOptions>
  ): Promise<DynamicModule> {
    return {
      module: RabbitModule,
      global: options.global,
      imports: options.imports,
      providers: [
        RabbitMessagePublisher,
        {
          inject: [RABBIT_CONFIG_KEY],
          provide: RABBIT_CONNECTION_KEY,
          useFactory: async (config: RabbitModuleOptions) => {
            try {
              const connection = await amqplib.connect(config.url);
              connection.on('error', (e) =>
                Logger[config.logLevel ?? 'error'](e)
              );
              return connection;
            } catch (e) {
              Logger[config.logLevel ?? 'error'](e);
              return null;
            }
          },
        },
        {
          inject: [{ optional: true, token: RABBIT_CONNECTION_KEY }],
          provide: RABBIT_CHANNEL_KEY,
          useFactory: async (connection?: Connection) => {
            if (!connection) return null;
            const channel = await connection.createChannel();
            await channel.prefetch(1, true);
            return channel;
          },
        },
        {
          provide: RABBIT_CONFIG_KEY,
          useFactory: options.useFactory,
          inject: options.inject,
        },
        {
          inject: [RABBIT_CONFIG_KEY],
          provide: RABBIT_QUEUES_KEY,
          useFactory: (options) =>
            options.queues
              ?.filter((queue) => queue.token)
              .reduce((curr, queue) => {
                curr[queue.token] = this.getQueueName(options, queue.name);
                return curr;
              }, {}),
        },
      ],
      exports: [RabbitMessagePublisher],
    };
  }

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
    @Inject(RABBIT_CHANNEL_KEY) private readonly channel: Channel | null,
    @Inject(RABBIT_CONFIG_KEY) private readonly config: RabbitModuleOptions,
    @Inject(RABBIT_QUEUES_KEY)
    private readonly queueMapping: Record<string | symbol, string>
  ) {}

  temporaryQueues = [];

  async onModuleDestroy() {
    if (!this.channel) return;
    await Promise.all(
      this.temporaryQueues.map((queue) => this.channel.deleteQueue(queue))
    );
  }

  async onModuleInit(): Promise<void> {
    if (!this.channel) {
      Logger[this.config.logLevel ?? 'error'](
        'Failed to initialize connection to rabbit server'
      );
      return;
    }

    if (this.config.assert) {
      for (const exchange of this.config.exchanges ?? []) {
        await this.channel.assertExchange(exchange.name, exchange.type);
      }
      for (const queue of this.config.queues ?? []) {
        await this.channel.assertQueue(
          RabbitModule.getQueueName(this.config, queue.name),
          queue.options
        );
      }
    }

    const controllers = this.discoveryService.getControllers();

    for (const controller of controllers) {
      const proto = Object.getPrototypeOf(controller.instance);
      const methodNames = Object.getOwnPropertyNames(proto).filter(
        (name) => name !== 'constructor'
      );
      await Promise.all(
        methodNames
          .filter((name) =>
            this.reflector.get<SubOptions>(
              SUBSCRIBE_KEY,
              controller.instance[name]
            )
          )
          .map((name) => this.registerSubscriber(controller.instance, name))
      );
    }
  }

  private async registerSubscriber(
    controllerInstance: any,
    listenerName: string
  ) {
    const subOptions = this.reflector.get<SubOptions>(
      SUBSCRIBE_KEY,
      controllerInstance[listenerName]
    );

    const pubOptions = this.reflector.get<PubOptions>(
      PUBLISH_KEY,
      controllerInstance[listenerName]
    );
    if (
      'queueToken' in pubOptions &&
      !(pubOptions.queueToken in this.queueMapping)
    )
      throw new QueueConfigMissingError();
    let queueName: string | null = null;

    if ('queueToken' in subOptions) {
      queueName = this.queueMapping[subOptions.queueToken];
      if (!queueName) throw new QueueConfigMissingError();
    } else if ('queue' in subOptions) {
      queueName = RabbitModule.getQueueName(this.config, subOptions.queue);
    } else {
      queueName = RabbitModule.getQueueName(this.config, v4());
      this.temporaryQueues.push(queueName);
    }

    await this.channel.assertQueue(queueName);

    if (subOptions.exchange)
      await this.channel.bindQueue(
        queueName,
        subOptions.exchange,
        subOptions.routingKey
      );
    try {
      await this.channel.consume(queueName, async (message) => {
        const result = await controllerInstance[listenerName](
          ...this.resolveListenerArguments(
            message,
            controllerInstance,
            listenerName
          )
        );
        this.channel.ack(message);
        if (!pubOptions || !result) return;
        if ('queueToken' in pubOptions) {
          this.channel.sendToQueue(
            this.queueMapping[pubOptions.queueToken],
            Buffer.from(JSON.stringify(result)),
            pubOptions.options
          );
        } else if ('queue' in pubOptions) {
          this.channel.sendToQueue(
            pubOptions.queue,
            Buffer.from(JSON.stringify(result)),
            pubOptions.options
          );
        } else if ('exchange' in pubOptions)
          this.channel.publish(
            pubOptions.exchange,
            pubOptions.routingKey,
            Buffer.from(JSON.stringify(result)),
            pubOptions.options
          );
      });
    } catch (e) {
      Logger.error(e);
    }
  }

  private resolveListenerArguments(
    message: ConsumeMessage,
    controller: any,
    listener: string | symbol
  ) {
    const metadata = Reflect.getMetadata(MESSAGE_KEY, controller, listener);

    const injectableValues = {
      contentRaw: message.content.toString(),
      headers: message.properties.headers,
    };
    try {
      injectableValues['content'] = JSON.parse(injectableValues.contentRaw);
    } catch (e) {
      if (Object.values(metadata).includes('content'))
        throw new ParseFailedError('Parsing of incoming message failed');
    }

    if (!metadata) return;

    return Object.entries(metadata).reduce((curr, [index, value]) => {
      curr[index] = injectableValues[value as any];
      return curr;
    }, []);
  }

  private static getQueueName(config: RabbitModuleOptions, queueName: string) {
    const queueConfig = config.queues?.find(
      (queue) => queue.name === queueName
    );

    return config.queuePrefix && !queueConfig?.ignorePrefix
      ? `${config.queuePrefix}-${queueName}`
      : queueName;
  }
}
