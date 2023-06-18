import { Inject, Injectable } from '@nestjs/common';
import { RABBIT_CHANNEL_KEY, RABBIT_QUEUES_KEY } from './tokens';
import { Channel, Options } from 'amqplib';

@Injectable()
export class RabbitMessagePublisher {
  constructor(
    @Inject(RABBIT_CHANNEL_KEY) private readonly channel: Channel,
    @Inject(RABBIT_QUEUES_KEY)
    private readonly queueMap: Record<string | symbol, string>
  ) {}
  public send<T>(
    queue: string | symbol,
    message: T,
    options?: Options.Publish
  ) {
    const queueName =
      queue in this.queueMap ? this.queueMap[queue] : (queue as string);

    this.channel.sendToQueue(
      queueName,
      Buffer.from(JSON.stringify(message)),
      options
    );
  }

  public publish<T>(
    exchange: string,
    key: string,
    message: T,
    options?: Options.Publish
  ) {
    this.channel.publish(
      exchange,
      key,
      Buffer.from(JSON.stringify(message)),
      options
    );
  }
}
