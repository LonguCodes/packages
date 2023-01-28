# @longucodes/plugin-system-cli

### Purpose

This package provides a companion cli to [`@longucodes/plugin-system-loader`](../plugin-system-loader/README.md). It allows for easy installation for plugins to be loaded by mentioned package.


### Usage

To allow for automatic plugin installation, run your application with `plugins-cli "your command"`. The cli will look for `plugins.json` in current directory and install necessary plugins. 
For plugin definitions, see [End user usage](../plugin-system-loader/README.md#end-user-usage).

Additional flags: 
- `-p, --pluginsPath <path>` - Set custom path to definitions file, default `./plugins.json`
- `-c, --cli <cli command>` - Set installation cli, default `npm install`
- `-h, --help` - Show command help
