# @longucodes/config

## Sections

- [Purpose](#Purpose)
- [Usage](#Usage)
  - [ConfigModule](#ConfigModule)

## Purpose

This package aims to simplify and organize the use of environment variables in NestJS applications.

## Usage

The main module provided by this library is `ConfigModule`

### ConfigModule

To provide configuration for your modules from environment variables, add `ConfigModule` to imports of the module.

```typescript
import {Module} from "@nestjs/common";
import {AuthModule} from "./auth.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      schema: yourValidationSchema
    })
  ]
})
class SomeModule {

}
```

For more configuration, provide following options: 
 - `envFilePath: string` - path to the .env file to be read (default `.env`)
 - `global: boolean` - should the module be global (default `false`)
 - `loadEnv: boolean` - should the `.env` file be loaded automatically (default `true`)

### Validation schema

To validate the provided environment variables, `Joi` schemas are used.
Only variables defined in the schema will be processed.

Resulting config object is created according to naming of the environment variables, where:
- all properties of the object will be in camel case
- `_` (single underscore) represents new word, eg. `SOME_SECRET` will become `{someSecret: value}`
- `__` (double underscore) represents nesting, eg. `AUTH__SECRET` will be converted into `{auth: {secret: value}}`


Example schema and resulting config object

```typescript
const schema = Joi.object({
  AUTH__SECRET: Joi.string().required(),
  AUTH__TOKEN_LIFESPAN: Joi.number().default(3600),
  DATABASE_URL: Joi.string().required(),
  ADMIN_USER: Joi.string().optional()
})

// Will result in 

const config = {
    auth: {
        secret: 'someSecret',
        tokenLifespan: 3600
    },
    databaseUrl: 'someUrl',
    adminUser: 'someUser',
}
```

### ConfigToken

To access processed config, use `ConfigToken`, which is an object with values from the environment.

```typescript
import {ConfigToken} from "@longucodes/config";
import {Inject} from "@nestjs/common";

class SomeService {
  constructor(@Inject(ConfigToken) config: ConfigInterface) { }
  
  someMethod(){
      return config.auth.secret
  }
}
```

We recommend creating a type, representing the processed config. 
Example type corresponding to the schema from previous section would be as follows
```typescript
export interface ConfigInterface {
    auth: {
        secret: string,
        tokenLifespan: number
    },
    databaseUrl: string,
    adminUser?: string
}
```

