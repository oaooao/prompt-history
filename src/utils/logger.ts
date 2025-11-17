/**
 * 日志工具
 * 提供统一的日志输出接口
 */

import { DEBUG, EXTENSION_NAME } from '@/config/constants';

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * 日志配置
 */
interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  prefix: string;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: LoggerConfig = {
  enabled: DEBUG,
  level: LogLevel.INFO,
  prefix: `[${EXTENSION_NAME}]`,
};

/**
 * Logger 类
 */
export class Logger {
  private static config: LoggerConfig = { ...DEFAULT_CONFIG };

  /**
   * 配置 Logger
   */
  static configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  static getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * 调试日志
   */
  static debug(context: string, message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) {
      return;
    }
    console.debug(this.format(context, message), ...args);
  }

  /**
   * 信息日志
   */
  static info(context: string, message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.INFO)) {
      return;
    }
    console.info(this.format(context, message), ...args);
  }

  /**
   * 警告日志
   */
  static warn(context: string, message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.WARN)) {
      return;
    }
    console.warn(this.format(context, message), ...args);
  }

  /**
   * 错误日志
   */
  static error(context: string, message: string, error?: Error, data?: Record<string, unknown>): void {
    if (!this.shouldLog(LogLevel.ERROR)) {
      return;
    }

    console.error(this.format(context, message), error, data);

    // 可选：发送错误到事件总线
    // EventBus.emit(EventType.ERROR_OCCURRED, { context, error, data });
  }

  /**
   * 格式化日志消息
   */
  private static format(context: string, message: string): string {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    return `${this.config.prefix} [${timestamp}] [${context}] ${message}`;
  }

  /**
   * 判断是否应该输出日志
   */
  private static shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const requestedLevelIndex = levels.indexOf(level);

    return requestedLevelIndex >= currentLevelIndex;
  }

  /**
   * 启用日志
   */
  static enable(): void {
    this.config.enabled = true;
  }

  /**
   * 禁用日志
   */
  static disable(): void {
    this.config.enabled = false;
  }

  /**
   * 设置日志级别
   */
  static setLevel(level: LogLevel): void {
    this.config.level = level;
  }
}
