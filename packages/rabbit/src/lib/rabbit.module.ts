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
import { MESSAGE_KEY } from './decorators/message.decorator';
import { ParseFailedError } from './errors/parse-failed.error';
import {
  RABBIT_CHANNEL_KEY,
  RABBIT_CONNECTION_KEY,
  RABBIT_QUEUES_KEY,
} from './tokens';
import { ModuleOptionsFactory } from '@longucodes/common';
import { RabbitMessagePublisher } from './rabbit-message.publisher';
import { RABBIT_CONFIG_KEY } from './tokens.internal';
import { NameResolver } from '../name.resolver';
import { RabbitMessageConsumer } from './rabbit-message.consumer';
import { TemporaryQueueRegistry } from './temporary-queue.registry';

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

@Module({
  imports: [DiscoveryModule],
  providers: [
    RabbitMessagePublisher,
    RabbitMessageConsumer,
    NameResolver,
    TemporaryQueueRegistry,
  ],
  exports: [
    RABBIT_CONNECTION_KEY,
    RABBIT_CHANNEL_KEY,
    RabbitMessagePublisher,
    RabbitMessageConsumer,
  ],
})
export class RabbitModule implements OnModuleInit {
  public static async forRoot(
    options: RabbitModuleOptions
  ): Promise<DynamicModule> {
    return {
      module: RabbitModule,
      global: options.global,
      providers: [
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
                curr[queue.token] = new NameResolver(
                  options,
                  null
                ).resolveConfigPrefix(queue.name);
                return curr;
              }, {}) ?? [],
        },
      ],
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
                curr[queue.token] = new NameResolver(
                  options,
                  null
                ).resolveConfigPrefix(queue.name);
                return curr;
              }, {}),
        },
      ],
    };
  }

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
    @Inject(RABBIT_CHANNEL_KEY) private readonly channel: Channel | null,
    @Inject(RABBIT_CONFIG_KEY) private readonly config: RabbitModuleOptions,
    private readonly nameResolver: NameResolver,
    private readonly messageConsumer: RabbitMessageConsumer
  ) {}

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
          this.nameResolver.resolveConfigPrefix(queue.name),
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

    try {
      if ('exchange' in subOptions)
        await this.messageConsumer.consumeFromExchange(
          subOptions.exchange,
          subOptions.routingKey,
          (_, message) =>
            controllerInstance[listenerName](
              ...this.resolveListenerArguments(
                message,
                controllerInstance,
                listenerName
              )
            )
        );
      else
        await this.messageConsumer.consumeQueue(
          subOptions.queue,
          (_, message) =>
            controllerInstance[listenerName](
              ...this.resolveListenerArguments(
                message,
                controllerInstance,
                listenerName
              )
            )
        );
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
}
