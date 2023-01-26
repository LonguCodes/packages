export type PluginDefinition<
  T extends Record<string, string | number | boolean> = Record<
    string,
    string | number | boolean
  >
> =
  | {
      version?: string;
      mode?: 'static' | 'dynamic';
      name: string;
      config?: T;
    }
  | string;
