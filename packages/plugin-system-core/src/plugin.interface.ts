export type PluginDefinition<
  T extends Record<string, string | number | boolean> = Record<
    string,
    string | number | boolean
  >
> = FullPluginDefinition<T> | string;
export type FullPluginDefinition<
  T extends Record<string, string | number | boolean> = Record<
    string,
    string | number | boolean
  >
> = {
  version?: string;
  mode?: 'static' | 'dynamic';
  name: string;
  config?: T;
};
