import { SetMetadata } from '@nestjs/common';

export type SubOptions =
  | {
      exchange: string;
      routingKey: string;
      queue?: string | symbol;
    }
  | { queue: string | symbol };

export const SUBSCRIBE_KEY = Symbol('subscribe');

export function Sub(options: SubOptions) {
  return SetMetadata(SUBSCRIBE_KEY, options);
}
