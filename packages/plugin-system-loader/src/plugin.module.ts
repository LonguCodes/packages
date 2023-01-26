import { DynamicModule, Logger, Module } from '@nestjs/common';
import * as fs from 'fs/promises';
import { PluginDefinition } from '@longucodes/plugin-system-core';
import * as process from 'process';

export interface PluginModuleOptions {
  pluginsDefinitionFilePath?: string;
}

@Module({})
export class PluginModule {
  private static resolveConfig(config: Record<string, any>) {
    if (!config) return {};
    const envEntries = Object.entries(config)
      .filter(
        ([_, value]) => typeof value === 'string' && value.match(/^\$[A-Z_]*$/)
      )
      .map(([key, value]) => [
        key,
        process.env[(value as string).substring(1)],
      ]);
    return {
      ...config,
      ...Object.fromEntries(envEntries),
    };
  }

  private static async getModuleFromPlugin(definition: PluginDefinition) {
    const isStringDefinition = typeof definition == 'string';
    const name = isStringDefinition ? definition : definition.name;
    const config = isStringDefinition
      ? {}
      : this.resolveConfig(definition.config);

    try {
      const nodeModule = await import(name);
      const nestModuleClass = nodeModule.default;
      return 'forRoot' in nestModuleClass
        ? nestModuleClass.forRoot(config)
        : nestModuleClass;
    } catch (e) {
      Logger.error(`Failed to load ${name}. Is it installed?`, 'Plugin');
      return null;
    }
  }

  private static async getPluginList(path: string) {
    try {
      await fs.access(path);
      return JSON.parse((await fs.readFile(path)).toString());
    } catch (e) {
      return [];
    }
  }

  public static async forRoot(
    options: PluginModuleOptions
  ): Promise<DynamicModule> {
    const pluginDefinitions: PluginDefinition[] = await this.getPluginList(
      options.pluginsDefinitionFilePath
    );

    const modules = await Promise.all(
      pluginDefinitions.map((definition) =>
        this.getModuleFromPlugin(definition)
      )
    );

    return {
      module: PluginModule,
      imports: modules.filter((module) => module),
      global: false,
    };
  }
}
