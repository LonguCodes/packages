import {
  DynamicModule,
  FactoryProvider,
  ForwardReference,
  Type,
} from '@nestjs/common';

export type ModuleOptionsFactory<T> = Omit<
  FactoryProvider<T extends { global: boolean } ? Omit<T, 'global'> : T>,
  'provide' | 'scope' | 'durable'
> & {
  global?: boolean;
  imports?: Array<
    Type | DynamicModule | Promise<DynamicModule> | ForwardReference
  >;
};
