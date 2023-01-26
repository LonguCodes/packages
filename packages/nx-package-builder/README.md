# @longucodes/nx-package-builder


### Sections



### Purpose

This package allows for easy version bumping and publishing of applications and libraries managed in a nx monorepo.
It automatically bumps up the version depending on the commit according to conventional commits, create a commit with it, tags it and publishes the package/application.

### Usage

The library consist of 2 executors, `@logucodes/nx-package-builder:build-and-publish` and `@longucodes/nx-package-builder:ci`

#### build-and-publish executor

This executor builds the package using provided executor, then publishes it using selected cli.

It can run without any configuration

```json
{
  "publish": {
    "executor": "@longucodes/nx-package-builder:build-and-publish"
  }
}
```

The full configuration consists of following options:

- `buildScript` - name of the build executor, default `build`
- `publishCli` - cli used for publishing, default `npm`
- `publishArgs` - list of arguments to pass to the cli, default `[]`
- `dry` - run without publishing, default `false`


To pass argument `--tag abc` to the cli, add to publishArgs:
```json
{
  "name": "tag",
  "value": "abc"
}
```


To pass argument `--minor` to the cli, add to publishArgs:
```json
{
  "name": "minor"
}
```

:warning: Due to NX limitations, if your library is dependent on other buildable libraries, they will be build using `build` executor (not the executor specified in `buildScript`) :warning:


#### ci executor

The `ci` executor is designed to work with previous one out of the box.
It will detect commit type, bump the version in the package.json and then run selected "publish" executor.

It can run without any configuration.
```json
{
  "publish": {
    "executor": "@longucodes/nx-package-builder:ci"
  }
}
```

The full configuration consists of following options:

- `commit` - should a commit with the new version be made, default `true`
- `tag` - should the commit be tagged, requires `commit` to be `true`, default `true`
- `tagDelimiter` - delimiter between the name of the package and the version, default `||`
- `push` - should the commit be pushed, requires `commit` to be `true`, default `true`
- `publish` - should the publish executor be run, default `true`
- `publishScript` - name of the publish executor, default `publish`
- `publishCli` - cli used for publishing, default `npm`
- `noCiMessage` - additional message added in front of the commit, used for disabling CI run for this commit
- `versionBumpPattern` - pattern of bumping the version depending on the commit type, default `{feat: minor}`


By default, every commit type will be considered a `patch` bump, except commit of `feat` type, which will bump `minor` and commits containing the words `BREAKING CHANGE`, which will bump `major`

If the commit header does not match conventional commit format, the commit type will be treated as `unknown` and not a breaking change.

:information_source: If your executor requires the version through environment variables, use `NX_PUBLISH_VERSION` :information_source:
