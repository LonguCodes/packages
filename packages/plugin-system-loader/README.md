# @longucodes/plugin-system-loader

### Purpose

This package provides a Nestjs module for dynamically loading modules during runtime. The goal is to create a way of extending ready-to-go services without needing to edit their code.

### Developer usage

To use the system, import the module in your application

```typescript
import {Module} from "@nestjs/common";
import {PluginModule} from "@longucodes/plugin-system-loader";

@Module({
  imports: [
    PluginModule.forRoot({})
  ]
})
export class AppModule {}
```

Optionally, path to the definition file can be provided
```typescript
import {Module} from "@nestjs/common";
import {PluginModule} from "@longucodes/plugin-system-loader";

@Module({
  imports: [
    PluginModule.forRoot({pluginsDefinitionFilePath: '/path/to/plugins.json'})
  ]
})
export class AppModule {}
```

It's recommended to use this module in conjunction with [`@longucodes/plugin-system-cli`](../plugin-system-cli/README.md) for runtime installation of plugins.

### End-user usage

To add a plugin, add `plugins.json` file in the directory, where microservice is running and add plugin definitions.
The file should consist of an array, with each entry representing one plugin.

##### Simple definition

Simples plugin definition is just the name of the NPM package
```json
[
  "plugin-name"
]
```

The plugin will be automatically installed by the cli and  loaded into the application.

##### Advanced definition

To add more capabilities, like config or specific version, advanced definition should be used.
```json
[
  {
    "name": "plugin-name"
  }
]
```

In addition to name, following properties can be provided.

- `version` - install specific version of the package
- `mode` - can be `static` (default) and `dynamic`. Dynamic plugins will not be installed by cli
- `config` - object with configuration values

##### Config

The config object can contain direct values or read them from environment.
To use environment variable , the config value should be the name of the environment variable with `$` at the beginning.
All variables consisting only of uppercase letters and `_`, and a `$` will be treated as a environment variable read.
```json
[
  {
    "name": "plugin-name",
    "config": {
      "staticVariable": "123",
      "dynamicVariable": "$SOME_VAR"
    }
  }
]
```
Not all plugins are configurable, check documentation of used plugin.

### Plugin development

To create your own plugin, create NPM package, that default exports a Nestjs module.
If you want your package to be configurable, add static method `forRoot` returning a dynamic module.





