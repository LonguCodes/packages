import { ExecutorContext } from 'nx/src/config/misc-interfaces';
import { runExecutor } from '@nrwl/devkit';

export async function runNxTask(
  targetDescription: {
    project: string;
    target: string;
    configuration?: string;
  },
  overrides: {
    [k: string]: any;
  },
  context: ExecutorContext
) {
  const iterator = await runExecutor(targetDescription, overrides, context);

  const results = [];
  for await (const resultPromise of iterator) {
    results.push(resultPromise);
  }
  return results;
}
