import { Inject, Injectable, Logger } from '@nestjs/common';
import { RABBIT_CHANNEL_KEY, RABBIT_QUEUES_KEY } from './tokens';
import { Channel, ConsumeMessage, Options } from 'amqplib';
import { NameResolver } from './name.resolver';
import { v4 } from 'uuid';
import { TemporaryQueueRegistry } from './temporary-queue.registry';
import { NackEvent } from './errors/nack-event';

@Injectable()
export class RabbitMessageConsumer {
  constructor(
    @Inject(RABBIT_CHANNEL_KEY) private readonly channel: Channel,
    private readonly nameResolver: NameResolver,
    private readonly queueRegistry: TemporaryQueueRegistry
  ) {}

  public async consumeTemporaryQueue<T>(
    callback: (message: T, rawMessage: ConsumeMessage) => void | Promise<void>,
    options?: Options.Consume
  ): Promise<string> {
    const queueName = this.nameResolver.getQueueName(v4());

    await this.channel.assertQueue(queueName);
    this.queueRegistry.register(queueName);

    await this.channel.consume(
      queueName,
      async (message) => this.executeCallbackWithMessage(callback, message),
      options
    );
    return queueName;
  }

  public async consumeQueue<T>(
    queue: string | symbol,
    callback: (message: T, rawMessage: ConsumeMessage) => void | Promise<void>,
    options?: Options.Consume
  ) {
    const queueName = this.nameResolver.getQueueName(queue);

    await this.channel.consume(
      queueName,
      async (message) => this.executeCallbackWithMessage(callback, message),
      options
    );
  }

  public async consumeFromExchange<T>(
    exchange: string,
    key: string,
    callback: (message: T, rawMessage: ConsumeMessage) => void | Promise<void>,
    options?: Options.Consume
  ) {
    const queueName = this.nameResolver.getQueueName(v4());

    await this.channel.assertQueue(queueName);
    this.queueRegistry.register(queueName);

    await this.channel.bindQueue(queueName, exchange, key);

    await this.channel.consume(
      queueName,
      (message) => this.executeCallbackWithMessage(callback, message),
      options
    );
  }

  private async executeCallbackWithMessage(
    callback: (
      message: any,
      rawMessage: ConsumeMessage
    ) => void | Promise<void>,
    message: ConsumeMessage
  ) {
    try {
      await callback(JSON.parse(message.content.toString()), message);
      this.channel.ack(message);
    } catch (e) {
      Logger.log(e, 'Rabbit');
      if (e instanceof NackEvent) this.channel.nack(message);
      else this.channel.ack(message);
    }
  }
}
