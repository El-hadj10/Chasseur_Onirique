// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see LICENSE)
// =============================================================================

import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  success: 25,
  warn: 30,
  error: 40,
};

export interface LogEvent {
  at: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: unknown;
}

export class Logger {
  private events: LogEvent[] = [];
  constructor(
    private readonly component: string,
    private readonly minLevel: LogLevel = 'debug',
  ) {}

  private emit(level: LogLevel, message: string, data?: unknown): void {
    if (LEVEL_RANK[level] < LEVEL_RANK[this.minLevel]) return;
    const event: LogEvent = {
      at: new Date().toISOString(),
      level,
      component: this.component,
      message,
      data,
    };
    this.events.push(event);
    const tag =
      level === 'error'
        ? chalk.red('[ERR]')
        : level === 'warn'
          ? chalk.yellow('[WRN]')
          : level === 'success'
            ? chalk.green('[OK ]')
            : level === 'info'
              ? chalk.blue('[INF]')
              : chalk.gray('[DBG]');
    const head = `${chalk.dim(event.at)} ${tag} ${chalk.bold(this.component)}`;
    const tail = data === undefined ? '' : ` ${chalk.dim(JSON.stringify(data))}`;
    // eslint-disable-next-line no-console
    console.log(`${head} ${message}${tail}`);
  }

  debug(message: string, data?: unknown) { void this.emit('debug', message, data); }
  info(message: string, data?: unknown)  { void this.emit('info',  message, data); }
  ok(message: string, data?: unknown)    { void this.emit('success', message, data); }
  warn(message: string, data?: unknown)  { void this.emit('warn',  message, data); }
  err(message: string, data?: unknown)   { void this.emit('error', message, data); }

  dumpJson(): string { return JSON.stringify(this.events, null, 2); }
}
