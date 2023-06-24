import { Inject, Injectable } from '@nestjs/common';
import { RABBIT_CHANNEL_KEY, RABBIT_QUEUES_KEY } from './tokens';
import { Channel, ConsumeMessage, Options } from 'amqplib';
import { NameResolver } from './name.resolver';
import { v4 } from 'uuid';
import { TemporaryQueueRegistry } from './temporary-queue.registry';

@Injectable()
export class RabbitMessageConsumer {
  constructor(
    @Inject(RABBIT_CHANNEL_KEY) private readonly channel: Channel,
    private readonly nameResolver: NameResolver,
    private readonly queueRegistry: TemporaryQueueRegistry
  ) {}
  public async consumeQueue<T>(
    queue: string | symbol,
    callback: (message: T, rawMessage: ConsumeMessage) => void | Promise<void>,
    options?: Options.Consume
  ) {
    const queueName = this.nameResolver.getQueueName(queue);

    await this.channel.consume(
      queueName,
      async (message) => {
        await callback(JSON.parse(message.content.toString()), message);
        this.channel.ack(message);
      },
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
    await this.queueRegistry.register(queueName);

    await this.channel.bindQueue(queueName, exchange, key);

    await this.channel.consume(
      queueName,
      async (message) => {
        await callback(JSON.parse(message.content.toString()), message);
        this.channel.ack(message);
      },
      options
    );
  }
}
