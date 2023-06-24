import { blue, yellow, red } from 'chalk';

export class Logger {
  public static log(...args: any[]) {
    console.log(...args);
  }
  public static info(...parts: any[]) {
    this.log(blue('[INFO]'), ...parts);
  }

  public static warn(...parts: any[]) {
    this.log(yellow('[WARN]'), ...parts);
  }

  public static error(...parts: any[]) {
    this.log(red('[ERROR]'), ...parts);
  }
}
