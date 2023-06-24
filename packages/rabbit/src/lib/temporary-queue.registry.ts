import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { RABBIT_CHANNEL_KEY } from './tokens';
import { Channel } from 'amqplib';

@Injectable()
export class TemporaryQueueRegistry implements OnModuleDestroy {
  constructor(@Inject(RABBIT_CHANNEL_KEY) private readonly channel: Channel) {}
  private readonly registry: Set<string> = new Set<string>();

  public register(queueName: string) {
    this.registry.add(queueName);
  }

  async onModuleDestroy(): Promise<void> {
    for (const queue of this.registry) {
      await this.channel.deleteQueue(queue);
    }
  }
}
