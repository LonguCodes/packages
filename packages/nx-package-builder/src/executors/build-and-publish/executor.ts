import { BuildAndPublishExecutorSchema } from './schema';
import { ExecutorContext } from '@nrwl/devkit';
import { promisify } from 'util';
import { exec } from 'child_process';
import { runNxTask } from '../../common/run-nx-task';
import { Logger } from '@longucodes/common';

async function buildWithDeps(projectName: string, context: ExecutorContext) {
  Logger.info(`Trying to build ${projectName}`);

  const deps = context.projectGraph.dependencies[projectName].filter(
    (dependency) => !dependency.target.startsWith('npm:')
  );

  const depNames = deps.map((dep) => dep.target);
  if (depNames.length > 0)
    Logger.info(`${projectName} requires ${depNames.join(', ')}`);
  for (const depName of depNames) {
    await buildWithDeps(depName, context);
  }

  Logger.info(`Building ${projectName}`);

  await runNxTask({ project: projectName, target: 'build' }, {}, context);
}

export default async function executor(
  {
    buildScript = 'build',
    publishCli = 'npm',
    publishArgs = [],
    dry = false,
  }: BuildAndPublishExecutorSchema,
  context: ExecutorContext
) {
  await buildWithDeps(context.projectName, context);

  const projectConfiguration = context.workspace.projects[context.projectName];
  if (!(buildScript in projectConfiguration.targets))
    throw new Error(`${buildScript} not in targets`);
  const buildTarget = projectConfiguration.targets[buildScript];

  if (!dry) {
    await promisify(exec)(
      `${publishCli} publish ${publishArgs
        .map((arg) =>
          arg.value ? `--${arg.name}=${arg.value}` : `--${arg.name}`
        )
        .join(' ')}`,
      { cwd: buildTarget.options.outputPath }
    );
  }

  return {
    success: true,
  };
}
