import { SetMetadata } from '@nestjs/common';
import { Options } from 'amqplib/properties';

interface BasePubOptions {
  options?: Options.Publish;
}

interface ExchangePubOptions extends BasePubOptions {
  exchange: string;
  routingKey: string;
}

type QueuePubOptions = BasePubOptions &
  ({ queueToken?: string | symbol } | { queue?: string });

export type PubOptions = QueuePubOptions | ExchangePubOptions;

export const PUBLISH_KEY = Symbol('publish');

export function Pub(options: PubOptions) {
  return SetMetadata(PUBLISH_KEY, options);
}
