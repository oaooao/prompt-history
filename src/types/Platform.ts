/**
 * 平台相关类型定义
 */

import { Prompt } from './Prompt';

/**
 * 支持的平台类型枚举
 */
export enum PlatformType {
  CHATGPT = 'chatgpt',
  GEMINI = 'gemini',
  CLAUDE = 'claude',
  DEEPSEEK = 'deepseek',
  UNKNOWN = 'unknown',
}

/**
 * 平台配置接口
 */
export interface PlatformConfig {
  /** 平台名称 */
  name: string;
  /** 平台类型 */
  type: PlatformType;
  /** URL 匹配模式 */
  urlPatterns: string[];
  /** 主机名 */
  hostname: string;
  /** DOM 选择器配置 */
  selectors: PlatformSelectors;
  /** API 配置 */
  api?: PlatformAPIConfig;
  /** UI 配置 */
  ui: PlatformUIConfig;
}

/**
 * 平台选择器配置
 */
export interface PlatformSelectors {
  /** 用户消息关键词或选择器 */
  userMessages: string[];
  /** 文章/消息容器选择器 */
  articleContainer: string;
  /** 用户消息气泡选择器（可选） */
  userBubble?: string;
  /** 消息文本容器选择器（可选） */
  textContainer?: string;
  /** 忽略的元素标签 */
  ignoredTags: string[];
}

/**
 * 平台 API 配置
 */
export interface PlatformAPIConfig {
  /** API 基础 URL */
  baseURL: string;
  /** 对话 API 路径 */
  conversationPath: string;
  /** 请求方法 */
  method?: 'GET' | 'POST';
  /** 超时时间（ms） */
  timeout?: number;
}

/**
 * 平台 UI 配置
 */
export interface PlatformUIConfig {
  /** 主题颜色 */
  primaryColor: string;
  /** 激活颜色 */
  activeColor: string;
  /** 是否支持暗色模式 */
  supportsDarkMode: boolean;
  /** 侧边栏位置 */
  sidebarPosition: 'left' | 'right';
}

/**
 * 平台适配器接口
 */
export interface IPlatformAdapter {
  /** 平台名称 */
  readonly name: string;
  /** 平台类型 */
  readonly type: PlatformType;
  /** 平台版本 */
  readonly version: string;

  /**
   * 检测当前页面是否为该平台
   */
  detect(): boolean;

  /**
   * 提取 Prompts
   */
  extractPrompts(): Promise<Prompt[]>;

  /**
   * 获取平台配置
   */
  getConfig(): PlatformConfig;

  /**
   * 初始化平台适配器
   */
  initialize(): void;

  /**
   * 清理资源
   */
  destroy(): void;

  /**
   * 监听 DOM 变化
   */
  observeChanges(callback: () => void): void;

  /**
   * 停止监听
   */
  stopObserving(): void;
}

/**
 * 平台检测结果
 */
export interface PlatformDetectionResult {
  /** 检测到的平台类型 */
  platform: PlatformType;
  /** 是否检测成功 */
  detected: boolean;
  /** 置信度（0-1） */
  confidence: number;
  /** 检测方法 */
  method: 'url' | 'dom' | 'hybrid';
}

/**
 * 平台特征（用于检测）
 */
export interface PlatformFeatures {
  /** URL 特征 */
  urlPattern?: RegExp;
  /** DOM 特征（元素选择器） */
  domFeatures?: string[];
  /** 窗口对象特征 */
  windowFeatures?: string[];
}
