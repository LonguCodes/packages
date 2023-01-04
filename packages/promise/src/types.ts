declare global {
  interface Type<T = any> extends Function {
    new (...args: any[]): T;
  }

  interface TransformOptions {
    groups: string[];
  }

  interface Promise<T> {
    rethrowAs<TSource extends Type<Error>, TDest extends Type<Error>>(
      source: TSource,
      dest: TDest
    ): this;

    failed(): Promise<boolean>;

    transform<TDest extends Type>(
      to: TDest,
      options?: Partial<TransformOptions>
    ): Promise<InstanceType<TDest>>;
  }
}

export {};

// eslint-disable-next-line no-var
