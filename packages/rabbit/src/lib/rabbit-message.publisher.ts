import { Inject, Injectable } from '@nestjs/common';
import { RABBIT_CHANNEL_KEY, RABBIT_QUEUES_KEY } from './tokens';
import { Channel, Options } from 'amqplib';
import { NameResolver } from '../name.resolver';

@Injectable()
export class RabbitMessagePublisher {
  constructor(
    @Inject(RABBIT_CHANNEL_KEY) private readonly channel: Channel,
    private readonly nameResolver: NameResolver
  ) {}
  public send<T>(
    queue: string | symbol,
    message: T,
    options?: Options.Publish
  ) {
    const queueName = this.nameResolver.getQueueName(queue);
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
