import { Injectable, inject, InjectionToken } from '@angular/core';
import { isDevMode } from '@angular/core';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export const LOG_LEVEL = new InjectionToken<LogLevel>('LOG_LEVEL');

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private logLevel = inject(LOG_LEVEL, { optional: true }) ?? (isDevMode() ? LogLevel.DEBUG : LogLevel.NONE);
  
  debug(message: string, ...args: unknown[]): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }
  
  info(message: string, ...args: unknown[]): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }
  
  warn(message: string, ...args: unknown[]): void {
    if (this.logLevel <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }
  
  error(message: string, error?: unknown, ...args: unknown[]): void {
    if (this.logLevel <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, error, ...args);
    }
  }
}

