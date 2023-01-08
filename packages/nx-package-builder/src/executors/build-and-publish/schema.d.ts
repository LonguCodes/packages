import { VersionChangeEnum } from '../../common/version-change.enum';

interface PublishArg {
  name: string;
  value?: string;
}

export interface BuildAndPublishExecutorSchema {
  buildScript?: string;
  publishArgs?: PublishArg[];
  publishCli?: 'yarn' | 'npm';
  dry?: boolean;
} // eslint-disable-line
