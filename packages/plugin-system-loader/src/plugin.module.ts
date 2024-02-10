import { DynamicModule, Logger, Module } from '@nestjs/common';
import * as fs from 'fs/promises';
import {
  FullPluginDefinition,
  getFullDefinition,
  PluginDefinition,
  PluginModuleInterface,
} from '@longucodes/plugin-system-core';
import * as process from 'process';
import { RouterModule } from '@nestjs/core';
import { fork, sift } from 'radash';

export interface PluginModuleOptions {
  pluginsDefinitionFilePath?: string;
  controllerPathPrefixTransformer?: (moduleName: string) => string;
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

  private static async getModuleWithMetadataFromPlugin(
    definition: FullPluginDefinition
  ): Promise<[any, { pluginName?: string }]> {
    const config = this.resolveConfig(definition.config);

    try {
      const nodeModule = await import(definition.name);
      const nestModuleClass = nodeModule.default;
      const moduleType = 'forRoot' in nestModuleClass ? 'dynamic' : 'static';
      const moduleInstance =
        moduleType === 'dynamic'
          ? await nestModuleClass.forRoot(config)
          : nestModuleClass;
      if (!moduleInstance) return null;

      const moduleMetadataSource: PluginModuleInterface =
        moduleType === 'dynamic' ? moduleInstance.module : moduleInstance;

      return [moduleInstance, moduleMetadataSource];
    } catch (e) {
      Logger.error(
        `Failed to load ${definition.name}. Is it installed?`,
        'Plugin'
      );
      return null;
    }
  }

  private static async getPluginList(path: string) {
    try {
      await fs.access(path);
      const rawPlugins: PluginDefinition[] = JSON.parse(
        (await fs.readFile(path)).toString()
      );
      return rawPlugins.map(getFullDefinition);
    } catch (e) {
      return [];
    }
  }

  public static async forRoot(
    options: PluginModuleOptions
  ): Promise<DynamicModule> {
    const pluginDefinitions: FullPluginDefinition[] = await this.getPluginList(
      options.pluginsDefinitionFilePath
    );

    const modules = sift(
      await Promise.all(
        pluginDefinitions.map((definition) =>
          this.getModuleWithMetadataFromPlugin(definition)
        )
      )
    );

    const [routableModules, nonRoutableModule] = fork(
      modules,
      (module) => !!module[1].pluginName
    );

    return {
      module: PluginModule,
      imports: [
        ...nonRoutableModule.map(([module]) => module),
        RouterModule.register(
          routableModules.map(([module, metadata]) => ({
            module,
            path: metadata.pluginName,
          }))
        ),
      ],
      global: false,
    };
  }
}
