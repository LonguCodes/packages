import { Logger } from '@longucodes/common';
import { VersionChangeEnum } from '../../common/version-change.enum';
import { DefaultLogFields } from 'simple-git';

export function getCommitMessage(commit: DefaultLogFields): string {
  return commit.body.length > 0
    ? commit.message + '\n' + commit.body
    : commit.message;
}

export function parseCommit(commit: DefaultLogFields) {
  const message = getCommitMessage(commit);
  const lines = message.split('\n');
  const merge = lines[0].match(/^Merge/i) ? lines[0] : null;
  if (merge) lines.splice(0, 1);

  const header = lines[0];

  if (!header.match(/^[^(:]+(?:\([^)]+\))?:.*/)) {
    Logger.warn(
      `Unable to parse commit ${commit.hash} according to conventional commit`
    );
    return {};
  }

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
export function getVersionBump(
  commits: DefaultLogFields[],
  bumpPattern: Record<string, VersionChangeEnum>
): VersionChangeEnum {
  const parsed = commits.map(parseCommit);
  let maxBump = VersionChangeEnum.patch;
  for (const { type = 'unknown', breaking = false } of parsed) {
    if (breaking) return VersionChangeEnum.major;
    const typeBump = bumpPattern[type] ?? VersionChangeEnum.patch;
    if (typeBump === VersionChangeEnum.major) return VersionChangeEnum.major;
    if (
      typeBump === VersionChangeEnum.minor &&
      maxBump === VersionChangeEnum.patch
    )
      maxBump = typeBump;
  }
  return maxBump;
}
