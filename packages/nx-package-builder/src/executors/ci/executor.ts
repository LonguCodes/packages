import { CiExecutorSchema } from './schema';
import { ExecutorContext } from '@nrwl/devkit';
import simpleGit from 'simple-git';
import * as fs from 'fs/promises';
import * as semver from 'semver';
import { VersionChangeEnum } from '../../common/version-change.enum';
import * as path from 'path';
import { Logger } from '../../common/logger';
import { runNxTask } from '../../common/run-nx-task';

function parseCommit(message: string) {
  const lines = message.split('\n');
  const merge = lines[0].match(/^Merge/i) ? lines[0] : null;
  if (merge) lines.splice(0, 1);

  const header = lines[0];

  const scope = header.match(/^[^(:]+\((.*)\)/);
  const type = header.match(/^([^(:]+)[(:]/)[1];
  const subject = header.match(/^[^(:]+\(.*\):\s*(.*)/)[1];
  return {
    type,
    scopes: scope ? scope[1].split(',').map((scope) => scope.trim()) : null,
    subject,
    merge,
    description: lines.slice(1),
    breaking: !!lines.find((line) => line.match(/BREAKING CHANGE/)),
  };
}

const defaultVersionBump: Record<string, VersionChangeEnum> = {
  feat: VersionChangeEnum.minor,
};

async function bumpVersion(
  packagePath: string,
  versionChange: VersionChangeEnum
) {
  const packageJsonRaw = await fs.readFile(packagePath);

  const packageJson = JSON.parse(packageJsonRaw.toString());

  packageJson.version = semver
    .parse(packageJson.version)
    .inc(versionChange).version;

  await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 4), {
    flag: 'w+',
  });
  return packageJson.version;
}

export default async function executor(
  {
    commit = true,
    publish = true,
    push = true,
    tag = true,
    tagDelimiter = '||',
    versionBumpPattern = defaultVersionBump,
    noCiMessage,
    publishScript = 'publish',
  }: CiExecutorSchema,
  context: ExecutorContext
) {
  versionBumpPattern = { ...defaultVersionBump, ...versionBumpPattern };

  const git = simpleGit();

  const commitLog = await git.log();

  Logger.info(commitLog);

  const latestCommit = commitLog.latest;
  const commitMessage =
    latestCommit.body.length > 0
      ? latestCommit.message + '\n' + latestCommit.body
      : latestCommit.message;

  const { scopes, type, breaking } = parseCommit(commitMessage);

  const projectNames = Object.keys(context.workspace.projects);

  scopes.forEach((scope) => {
    if (!projectNames.includes(scope))
      throw new Error(`Project ${scope} does not exist`);
  });

  const change = breaking
    ? VersionChangeEnum.major
    : versionBumpPattern[type] ?? VersionChangeEnum.patch;

  const versionChanges = {};

  for (const scope of scopes) {
    const newVersion = await bumpVersion(
      path.resolve(context.workspace.projects[scope].root, 'package.json'),
      change
    );
    Logger.info(`Bumped version of ${scope} to ${newVersion}`);
    versionChanges[scope] = newVersion;
  }

  const packageJsonFiles = scopes.map((scope) =>
    path.resolve(context.workspace.projects[scope].root, 'package.json')
  );

  await git.addConfig('user.email', 'ci@ci.com');
  await git.addConfig('user.name', 'ci');

  if (commit) {
    await git.add(packageJsonFiles);
    await git.commit(
      `${noCiMessage ?? ''} ci(${scopes.join(',')}): Bumped version of packages`
    );
  } else {
    Logger.info('Dry run, skipping commit');
    Logger.info(`Would commit ${packageJsonFiles.join('\n')}`);
  }

  if (tag) {
    if (!commit) {
      Logger.warn('No commit, skipping tagging');
    } else {
      for (const scope of scopes) {
        const tagName = `${scope}${tagDelimiter}${versionChanges[scope]}`;
        await git.addTag(tagName);
        Logger.info(`Added tag ${tagName}`);
      }
    }
  }
  if (push) {
    if (!commit) {
      Logger.warn('No commit, skipping push');
    } else {
      await git.push(['--tags']);
    }
  }
  if (publish) {
    for (const scope of scopes) {
      await runNxTask(
        {
          project: scope,
          target: publishScript,
        },
        {},
        context
      );
      Logger.info(`Published ${scope}`);
    }
  }
  return {
    success: true,
  };
}
