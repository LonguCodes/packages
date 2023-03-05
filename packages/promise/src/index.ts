import { BetterPromise } from './lib/promise';

export * from './lib/promise';
import './types';

Object.defineProperty(Promise, 'resolve', {
  value: BetterPromise.resolve,
});

Object.defineProperty(Promise, 'reject', {
  value: BetterPromise.reject,
});

Object.defineProperty(Promise, 'all', {
  value: BetterPromise.all,
});

Object.defineProperty(Promise, 'race', {
  value: BetterPromise.race,
});

global.Promise = BetterPromise;
