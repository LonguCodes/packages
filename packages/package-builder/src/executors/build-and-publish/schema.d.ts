interface PublishArg {
  name: string;
  value?: string;
}

export interface BuildAndPublishExecutorSchema {
  buildScript?: string;
  publishArgs?: PublishArg[];
  publishCli?: 'yarn' | 'npm';
  versionChange?: 'patch' | 'minor' | 'major';
} // eslint-disable-line
