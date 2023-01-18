import * as chalk from 'chalk';

export class Logger {
  public static log(...args: any[]) {
    console.log(...args);
  }
  public static info(...parts: any[]) {
    this.log(chalk.blue('[INFO]'), ...parts);
  }

  public static warn(...parts: any[]) {
    this.log(chalk.yellow('[WARN]'), ...parts);
  }

  public static error(...parts: any[]) {
    this.log(chalk.red('[ERROR]'), ...parts);
  }
}
