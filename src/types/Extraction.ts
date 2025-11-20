/**
 * 提取系统类型定义
 * 用于 ExtractionCoordinator 和相关组件
 */

import type { Prompt } from './Prompt';

/**
 * 提取状态枚举
 */
export enum ExtractionState {
  /** 空闲状态，可以开始新的提取 */
  IDLE = 'idle',
  /** 正在提取中 */
  EXTRACTING = 'extracting',
  /** 提取完成 */
  COMPLETED = 'completed',
  /** 提取出错 */
  ERROR = 'error',
}

/**
 * 提取策略枚举
 */
export enum ExtractionStrategy {
  /** 全量提取：扫描所有 Prompts */
  FULL = 'full',
  /** 增量提取：只提取新增的 Prompts */
  INCREMENTAL = 'incremental',
  /** 视口提取：只提取当前可见的 Prompts */
  VIEWPORT = 'viewport',
}

/**
 * 提取选项
 */
export interface ExtractionOptions {
  /** 提取策略，默认 FULL */
  strategy?: ExtractionStrategy;
  /** 是否强制重新提取（忽略缓存） */
  force?: boolean;
  /** 自定义超时时间（毫秒） */
  timeout?: number;
  /** 是否静默提取（不触发事件） */
  silent?: boolean;
}

/**
 * 提取结果
 */
export interface ExtractionResult {
  /** 提取到的 Prompts */
  prompts: Prompt[];
  /** 数据来源 */
  source: 'fresh' | 'queued' | 'cached';
  /** 是否为增量更新 */
  isIncremental: boolean;
  /** 提取耗时（毫秒） */
  duration?: number;
  /** 提取时的时间戳 */
  timestamp?: number;
}

/**
 * 提取错误
 */
export class ExtractionError extends Error {
  public readonly code: ExtractionErrorCode;
  public override readonly cause?: Error;

  constructor(
    message: string,
    code: ExtractionErrorCode,
    cause?: Error
  ) {
    super(message);
    this.name = 'ExtractionError';
    this.code = code;
    this.cause = cause;
  }
}

/**
 * 提取错误代码
 */
export enum ExtractionErrorCode {
  /** 超时错误 */
  TIMEOUT = 'timeout',
  /** DOM 未就绪 */
  DOM_NOT_READY = 'dom_not_ready',
  /** 适配器未初始化 */
  ADAPTER_NOT_INITIALIZED = 'adapter_not_initialized',
  /** 未知错误 */
  UNKNOWN = 'unknown',
}

/**
 * 合并选项
 */
export interface MergeOptions {
  /** 是否去重（基于内容） */
  deduplicate?: boolean;
  /** 时间窗口内的重复才去重（毫秒），0 表示不限制 */
  timeWindow?: number;
  /** 是否保留原有数据的顺序 */
  preserveOrder?: boolean;
}
