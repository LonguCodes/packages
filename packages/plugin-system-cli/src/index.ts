#!/usr/bin/env node

import { program } from 'commander';
import { Logger } from '@longucodes/common';
import * as fs from 'fs/promises';
import {
  FullPluginDefinition,
  getFullDefinition,
  PluginDefinition,
} from '@longucodes/plugin-system-core';
import * as child_process from 'child_process';
import { promisify } from 'util';
async function checkIfInstalled(definition: FullPluginDefinition) {
  if (definition.mode === 'dynamic') return true;
  try {
    await import(definition.name);
    return true;
  } catch (e) {
    return false;
  }
}

program
  .argument('<command>', 'Command to execute')
  .option(
    '-p, --pluginsPath <path>',
    'Path to plugin definitions',
    'plugins.json'
  )
  .option(
    '-c, --cli <cli command>',
    'Installation cli used to install plugins',
    'npm install'
  )
  .showHelpAfterError(true)
  .action(async (command, { pluginsPath, cli }) => {
    Logger.info('Loading plugin definitions file');
    const fileExists = await fs.access(pluginsPath).then(
      () => true,
      () => false
    );
    if (!fileExists) {
      Logger.warn(
        'Plugins file does not exist or cannot be accessed, skipping'
      );
    } else {
      let rawPlugins: PluginDefinition[] = [];
      try {
        rawPlugins = JSON.parse((await fs.readFile(pluginsPath)).toString());
      } catch (e) {
        Logger.error('Plugins file malformed, skipping');
      }

      const plugins: FullPluginDefinition[] = rawPlugins.map(getFullDefinition);

      Logger.info('Checking for plugin changes...');
      const missingPlugins = (
        await Promise.all(
          plugins.map(async (plugin) => ({
            plugin,
            installed: await checkIfInstalled(plugin),
          }))
        )
      )
        .filter(({ installed }) => !installed)
        .map(({ plugin }) => plugin);

      if (missingPlugins.length > 0) {
        Logger.info(
          `Missing plugins: ${missingPlugins
            .map((plugin) => plugin.name)
            .join(', ')}`
        );
        Logger.info(`Installing...`);

        await promisify(child_process.exec)(
          `${cli} ${missingPlugins.map((plugin) => plugin.name).join(' ')}`
        );

        Logger.info('Plugins successfully installed');
      } else {
        Logger.info('All plugins present, skipping installation');
      }
    }
    Logger.info('Running command');

    await new Promise((resolve) => {
      const child = child_process.exec(command);
      child.stdout.on('data', (data) => {
        console.log(data);
      });

      child.stderr.on('data', (data) => {
        console.error(data);
      });

      child.on('close', (code) => {
        resolve(code);
      });
    });
    Logger.info('Command run successfully');
  });

program.parse();
