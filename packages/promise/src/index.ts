import { BetterPromise } from './lib/promise';

export * from './lib/promise';
import './types';

global.Promise = BetterPromise;
