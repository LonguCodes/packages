import { VersionChangeEnum } from '../../common/version-change.enum';

export interface CiExecutorSchema {
  commit?: boolean;
  push?: boolean;
  publish?: boolean;
  tag?: boolean;
  tagDelimiter?: string;
  versionBumpPattern: Record<string, VersionChangeEnum>;
  noCiMessage?: string;
  publishScript?: string;
  baseCommit?: string;
} // eslint-disable-line
