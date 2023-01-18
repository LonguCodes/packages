export type PluginDefinition<
  T extends Record<string, string | number | boolean> = Record<
    string,
    string | number | boolean
  >
> =
  | {
      version?: string;
      name: string;
      config?: T;
    }
  | string;
