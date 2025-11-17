import { Prompt } from './Prompt';

/**
 * 事件类型枚举
 */
export enum EventType {
  /** Prompts 已更新 */
  PROMPTS_UPDATED = 'prompts:updated',
  /** Prompt 已选中 */
  PROMPT_SELECTED = 'prompt:selected',
  /** 已复制 */
  COPIED = 'copied',
  /** URL 已变化 */
  URL_CHANGED = 'url:changed',
  /** 搜索查询已变化 */
  SEARCH_QUERY_CHANGED = 'search:query-changed',
  /** 导出请求 */
  EXPORT_REQUESTED = 'export:requested',
  /** 错误发生 */
  ERROR_OCCURRED = 'error:occurred',
}

/**
 * 事件数据映射
 */
export interface EventDataMap {
  [EventType.PROMPTS_UPDATED]: Prompt[];
  [EventType.PROMPT_SELECTED]: string; // Prompt ID
  [EventType.COPIED]: {
    count: number;
    success: boolean;
  };
  [EventType.URL_CHANGED]: string; // New URL
  [EventType.SEARCH_QUERY_CHANGED]: string; // Search query
  [EventType.EXPORT_REQUESTED]: {
    format: string;
    prompts: Prompt[];
  };
  [EventType.ERROR_OCCURRED]: {
    context: string;
    error: Error;
    data?: Record<string, unknown>;
  };
}

/**
 * 事件回调函数类型
 */
export type EventCallback<T extends EventType> = (
  data: EventDataMap[T]
) => void;

/**
 * 事件监听器配置
 */
export interface EventListenerOptions {
  /** 是否只触发一次 */
  once?: boolean;
  /** 优先级（数字越大优先级越高） */
  priority?: number;
}
