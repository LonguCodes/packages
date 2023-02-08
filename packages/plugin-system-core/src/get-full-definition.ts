import { FullPluginDefinition, PluginDefinition } from './plugin.interface';

export function getFullDefinition(
  plugin: PluginDefinition
): FullPluginDefinition {
  if (typeof plugin === 'string')
    return {
      name: plugin,
    };
  return plugin;
}
