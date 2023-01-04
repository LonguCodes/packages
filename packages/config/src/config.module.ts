import { DynamicModule, Module } from '@nestjs/common';
import * as Joi from 'joi';
import * as dotenv from 'dotenv';
import { ConfigFactory, ConfigToken } from './config.factory';

export interface ConfigModuleOptions {
  envFilePath?: string;
  schema: Joi.Schema;
  global?: boolean;
  loadEnv?: boolean;
}

@Module({})
export class ConfigModule {
  public static forRoot(options: ConfigModuleOptions): DynamicModule {
    return {
      module: ConfigModule,
      global: options.global,
      providers: [
        {
          provide: ConfigToken,
          useFactory: () => {
            if (options.loadEnv !== false)
              dotenv.config({
                path: options.envFilePath,
              });
            return new ConfigFactory(options.schema).config;
          },
        },
      ],
      exports: [ConfigToken],
    };
  }
}
