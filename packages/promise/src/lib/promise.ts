import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { rewriteClass } from './rewrite-class';

const BasePromiseAll = Promise.all;
const BasePromiseRace = Promise.race;

export class BetterPromise<T> extends Promise<T> {
  rethrowMap = new Map<Type<Error>, Type<Error>>();

  rethrowAs<TSource extends Type<Error>, TDest extends Type<Error>>(
    source: TSource,
    dest: TDest
  ): this {
    const first = this.rethrowMap.size === 0;
    this.rethrowMap.set(source, dest);
    if (!first) {
      return this;
    }

    return this.catch((error) => {
      const mappedError = this.rethrowMap.get(
        Object.getPrototypeOf(error).constructor
      );
      if (mappedError) throw new mappedError(error.message);
      throw error;
    }) as this;
  }

  transform<TDest extends Type>(
    to: TDest,
    options: Partial<TransformOptions> = {}
  ): Promise<
    T extends Array<any> ? InstanceType<TDest>[] : InstanceType<TDest>
  > {
    return this.then((value) =>
      plainToInstance(to, value, { excludeExtraneousValues: true, ...options })
    );
  }

  failed(): Promise<boolean> {
    return this.then(() => false).catch(() => true);
  }
  wrap<TProperty extends string | symbol | number>(
    property: TProperty
  ): Promise<Record<TProperty, T>> {
    return this.then(
      (result) => ({ [property]: result } as Record<TProperty, T>)
    );
  }

  extract<TProperty extends keyof T>(
    property: TProperty
  ): Promise<T[TProperty]> {
    return this.then((result) => result[property]);
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?:
      | ((value: T) => PromiseLike<TResult1> | TResult1)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => PromiseLike<TResult2> | TResult2)
      | undefined
      | null
  ): Promise<TResult1 | TResult2> {
    return rewriteClass(
      this,
      super.then(onfulfilled, onrejected)
    ) as unknown as Promise<TResult1 | TResult2>;
  }

  define<TProperty extends string | symbol | number, TValue>(
    property: TProperty,
    value: TValue | ((value: T) => TValue)
  ): Promise<T & Record<TProperty, TValue>> {
    return this.then((promiseValue) => {
      (promiseValue as Record<TProperty, TValue>)[property] =
        typeof value === 'function'
          ? (value as (value: T) => TValue)(promiseValue)
          : (value as TValue);
      return promiseValue as T & Record<TProperty, TValue>;
    });
  }

  remove<TProperty extends keyof T>(
    property: TProperty
  ): Promise<Omit<T, TProperty>> {
    return this.then((value) => {
      delete value[property];
      return value;
    });
  }

  tap(callback: (value: T) => void): Promise<T> {
    return this.then((value) => {
      callback(value);
      return value;
    });
  }

  static from<T>(promise: Promise<T>) {
    if (promise instanceof BetterPromise) return promise as BetterPromise<T>;
    return BetterPromise.resolve<T>().then(() => promise);
  }

  static resolve<T>(value?: T | PromiseLike<T>): Promise<T> {
    return new BetterPromise<T>((resolve) => resolve(value));
  }
  static reject<T>(value?: T | PromiseLike<T>): Promise<T> {
    return new BetterPromise<T>((resolve, reject) => reject(value));
  }

  static all<T>(values: Iterable<T | PromiseLike<T>>): Promise<Awaited<T>[]> {
    return BetterPromise.from(BasePromiseAll.call(this, values));
  }

  static race<T>(values: Iterable<T | PromiseLike<T>>): Promise<Awaited<T>> {
    return BetterPromise.from(BasePromiseRace.call(this, values));
  }
}
