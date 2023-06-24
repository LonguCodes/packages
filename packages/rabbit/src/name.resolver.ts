import { Inject, Injectable } from '@nestjs/common';
import { RabbitModuleOptions } from './lib/rabbit.module';
import { RABBIT_CONFIG_KEY } from './lib/tokens.internal';
import { RABBIT_QUEUES_KEY } from './lib/tokens';

@Injectable()
export class NameResolver {
  constructor(
    @Inject(RABBIT_CONFIG_KEY) private readonly config: RabbitModuleOptions,
    @Inject(RABBIT_QUEUES_KEY)
    private readonly queueMap: Record<string | symbol, string>
  ) {}

  public getQueueName(nameOrToken: string | symbol) {
    const queueName =
      nameOrToken in this.queueMap
        ? this.queueMap[nameOrToken]
        : (nameOrToken as string);
    return this.resolveConfigPrefix(queueName);
  }

  public resolveConfigPrefix(queueName: string) {
    const queueConfig = this.config.queues?.find(
      (queue) => queue.name === queueName
    );

    return this.config.queuePrefix && !queueConfig?.ignorePrefix
      ? `${this.config.queuePrefix}-${queueName}`
      : queueName;
  }
}
