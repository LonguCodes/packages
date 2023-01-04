import { SetMetadata } from '@nestjs/common';

export interface TokenSubOptions {
  exchange?: string;
  routingKey?: string;
  queueToken?: string | symbol;
}

export interface QueueSubOptions {
  exchange?: string;
  routingKey?: string;
  queue?: string;
}

export type SubOptions = TokenSubOptions | QueueSubOptions;

export const SUBSCRIBE_KEY = Symbol('subscribe');

export function Sub(options: SubOptions) {
  return SetMetadata(SUBSCRIBE_KEY, options);
}
