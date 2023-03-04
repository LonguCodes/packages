import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { rewriteClass } from './rewrite-class';

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

  tap(callback: (value: T) => void): Promise<T> {
    return this.then((value) => {
      callback(value);
      return value;
    });
  }
}
