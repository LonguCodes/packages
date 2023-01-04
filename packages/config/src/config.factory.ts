import * as Joi from 'joi';
import { DeepPartial } from './types';

export const ConfigToken = Symbol('env-config');

export class ConfigFactory<
  TResult extends object,
  TEnv extends object = object
> {
  private configObject: object = {};

  constructor(private readonly schema: Joi.Schema, load = true) {
    const env = process.env as DeepPartial<TEnv>;
    const validated = this.validate(env);
    this.parse(validated);
  }

  private transformKey(rawKey: string): string {
    return rawKey
      .toLowerCase()
      .replace(/__/g, '.')
      .replace(/_(\w)/g, (v: string) => `${v.substring(1).toUpperCase()}`);
  }

  private appendValue(key: string, value: any) {
    if (value === null) return;
    const keyParts = key.split('.');
    let currentObj = this.configObject;
    for (const keyPart of keyParts.slice(0, -1)) {
      if (currentObj[keyPart] === undefined) currentObj[keyPart] = {};
      else if (
        typeof currentObj[keyPart] !== 'object' ||
        currentObj[keyPart] === null
      )
        throw new Error('Key already exists');
      currentObj = currentObj[keyPart];
    }

    const lastKey = keyParts[keyParts.length - 1];
    if (currentObj[lastKey] !== undefined)
      throw new Error('Key already exists');

    currentObj[lastKey] = value;
  }

  get config(): TResult {
    return this.configObject as TResult;
  }

  private parse(env: DeepPartial<TEnv>) {
    for (const key in env) {
      this.appendValue(this.transformKey(key), env[key]);
    }
  }

  private validate(env: DeepPartial<TEnv>): DeepPartial<TEnv> {
    const validated = this.schema.validate(env, {
      stripUnknown: true,
      convert: true,
    });
    if (validated.error) throw validated.error;
    return validated.value;
  }
}
