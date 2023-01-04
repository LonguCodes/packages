import { BuildAndPublishExecutorSchema } from './schema';
import { runExecutor, ExecutorContext } from '@nrwl/devkit';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as semver from 'semver';
import { promisify } from 'util';
import { exec } from 'child_process';

export default async function executor(
  {
    buildScript = 'build',
    publishCli = 'npm',
    publishArgs = [],
    versionChange = 'patch',
  }: BuildAndPublishExecutorSchema,
  context: ExecutorContext
) {
  const result = await runExecutor(
    { project: context.projectName, target: buildScript },
    {},
    context
  );
  for await (const resultPromise of result) {
  }

  const projectConfiguration = context.workspace.projects[context.projectName];
  if (!(buildScript in projectConfiguration.targets))
    throw new Error(`${buildScript} not in targets`);
  const buildTarget = projectConfiguration.targets[buildScript];

  const packageJsonRaw = await fs.readFile(
    path.resolve(projectConfiguration.root, 'package.json')
  );

  const packageJson = JSON.parse(packageJsonRaw.toString());

  packageJson.version = semver
    .parse(packageJson.version)
    .inc(versionChange).version;

  await fs.writeFile(
    path.resolve(buildTarget.options.outputPath, 'package.json'),
    JSON.stringify(packageJson, null, 4),
    { flag: 'w+' }
  );
  await fs.writeFile(
    path.resolve(projectConfiguration.root, 'package.json'),
    JSON.stringify(packageJson, null, 4),
    { flag: 'w+' }
  );

  await promisify(exec)(
    `${publishCli} publish ${publishArgs
      .map((arg) =>
        arg.value ? `--${arg.name}=${arg.value}` : `--${arg.name}`
      )
      .join(' ')}`,
    { cwd: buildTarget.options.outputPath }
  );

  return {
    success: true,
  };
}
