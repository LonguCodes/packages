#!/usr/bin/env node

import { program } from 'commander';
import { Logger } from '@longucodes/common';
import * as fs from 'fs/promises';
import { PluginDefinition } from '@longucodes/plugin-system-core';
import * as child_process from 'child_process';
import { promisify } from 'util';
async function checkIfInstalled(definition: PluginDefinition) {
  const isStringDefinition = typeof definition === 'string';
  const name = isStringDefinition ? definition : definition.name;

  try {
    await import(name);
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
      let plugins: PluginDefinition[] = [];
      try {
        plugins = JSON.parse((await fs.readFile(pluginsPath)).toString());
      } catch (e) {
        Logger.error('Plugins file malformed, skipping');
      }

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
        Logger.info(`Missing plugins: ${missingPlugins.join(', ')}`);
        Logger.info(`Installing...`);

        await promisify(child_process.exec)(
          `${cli} ${missingPlugins.join(' ')}`
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
    console.log(await fs.realpath('.'));
  });

program.parse();
