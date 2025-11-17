/**
 * Prompt 数据结构
 */
export interface Prompt {
  /** 唯一标识符 */
  id: string;
  /** Prompt 内容文本 */
  content: string;
  /** 创建时间戳 */
  timestamp: number;
  /** 关联的 DOM 元素（用于跳转） */
  element: HTMLElement | null;
  /** 数据来源 */
  source: PromptSource;
  /** 是否可见 */
  visible?: boolean;
}

/**
 * Prompt 数据来源类型
 */
export enum PromptSource {
  /** 来自 DOM 解析 */
  DOM = 'dom',
  /** 来自 API 拦截 */
  API = 'api',
}

/**
 * Prompt 预览数据（用于列表显示）
 */
export interface PromptPreview {
  id: string;
  preview: string;
  fullContent: string;
  timestamp: number;
  element: HTMLElement | null;
}

/**
 * Prompt 过滤选项
 */
export interface PromptFilterOptions {
  /** 搜索关键词 */
  searchQuery?: string;
  /** 时间范围（开始） */
  startTime?: number;
  /** 时间范围（结束） */
  endTime?: number;
  /** 最小长度 */
  minLength?: number;
  /** 最大长度 */
  maxLength?: number;
}

/**
 * Prompt 导出格式
 */
export enum ExportFormat {
  JSON = 'json',
  TXT = 'txt',
  MARKDOWN = 'md',
}

/**
 * 导出选项
 */
export interface ExportOptions {
  format: ExportFormat;
  includeTimestamp?: boolean;
  includeMetadata?: boolean;
}
