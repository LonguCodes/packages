import { CiExecutorSchema } from './schema';
import { ExecutorContext } from '@nrwl/devkit';
import simpleGit from 'simple-git';
import * as fs from 'fs/promises';
import * as semver from 'semver';
import { VersionChangeEnum } from '../../common/version-change.enum';
import * as path from 'path';
import { runNxTask } from '../../common/run-nx-task';
import * as process from 'process';
import {Logger} from "@longucodes/common";

function parseCommit(message: string) {
  const lines = message.split('\n');
  const merge = lines[0].match(/^Merge/i) ? lines[0] : null;
  if (merge) lines.splice(0, 1);

  const header = lines[0];

  const scope = header.match(/^[^(:]+\((.*)\)/);
  const type = header.match(/^([^(:]+)[(:]/)[1];
  const subject = header.match(/^[^(:]+(?:\(.*\))?:\s*(.*)/)[1];
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

  const currentBranch = (await git.branch()).current;

  Logger.info(`Currently on branch ${currentBranch}`);
  await git.fetch(`origin`);
  await git.checkout(currentBranch);
  await git.pull(`origin`, currentBranch);

  const commitLog = await git.log();

  const latestCommit = commitLog.latest;
  const commitMessage =
    latestCommit.body.length > 0
      ? latestCommit.message + '\n' + latestCommit.body
      : latestCommit.message;

  const { type, breaking } = parseCommit(commitMessage);

  const change = breaking
    ? VersionChangeEnum.major
    : versionBumpPattern[type] ?? VersionChangeEnum.patch;

  const packageJsonPath = path.resolve(
    context.workspace.projects[context.projectName].root,
    'package.json'
  );

  const newVersion = await bumpVersion(packageJsonPath, change);
  Logger.info(`Bumped version to ${newVersion}`);

  await git.addConfig('user.email', 'ci@ci.com');
  await git.addConfig('user.name', 'ci');

  if (commit) {
    await git.add(packageJsonPath);
    await git.commit(
      `${noCiMessage ?? ''} ci(${
        context.projectName
      }): Bumped version of packages`
    );
    Logger.info('Added new commit');
  } else {
    Logger.info('Dry run, skipping commit');
  }

  if (tag) {
    if (!commit) {
      Logger.warn('No commit, skipping tagging');
    } else {
      const tagName = `${context.projectName}${tagDelimiter}${newVersion}`;
      await git.addTag(tagName);
      Logger.info(`Added tag ${tagName}`);
    }
  }
  if (push) {
    if (!commit) {
      Logger.warn('No commit, skipping push');
    } else {
      await git.push(['--follow-tags']);
      Logger.info('Pushed tags and commits');
    }
  }
  if (publish) {
    process.env.NX_PUBLISH_VERSION = newVersion;
    await runNxTask(
      {
        project: context.projectName,
        target: publishScript,
      },
      {},
      context
    );
    Logger.info(`Published ${context.projectName}`);
  }
  return {
    success: true,
  };
}
