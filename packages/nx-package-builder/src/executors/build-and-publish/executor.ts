import { BuildAndPublishExecutorSchema } from './schema';
import { ExecutorContext } from '@nrwl/devkit';
import { promisify } from 'util';
import { exec } from 'child_process';
import { runNxTask } from '../../common/run-nx-task';

export default async function executor(
  {
    buildScript = 'build',
    publishCli = 'npm',
    publishArgs = [],
    dry = false,
  }: BuildAndPublishExecutorSchema,
  context: ExecutorContext
) {
  await runNxTask(
    { project: context.projectName, target: buildScript },
    {},
    context
  );

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
