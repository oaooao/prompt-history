/**
 * 应用全局配置常量
 * 将所有 Magic Numbers 和 Magic Strings 集中管理
 */

import { AppConfig } from '@/types/Config';

/**
 * 主配置对象
 */
export const CONFIG: Readonly<AppConfig> = {
  ui: {
    sidebarWidth: 240,
    previewLength: 60,
    animationDuration: 150,
    minScreenWidth: 1280,
  },
  timing: {
    scrollDebounce: 150,
    extractDelay: 500,
    secondExtractDelay: 1000,
    urlCheckInterval: 500,
    highlightDuration: 2000,
    copyFeedbackDuration: 2000,
    searchDebounce: 300,
  },
  selectors: {
    userMessages: ['你说', 'You said', 'You:', '你：'],
    article: 'article',
    userBubble: '.user-message-bubble-color',
  },
  colors: {
    nextjsBlue: '#0070f3',
    textGray: '#666',
    borderGray: '#e5e5e5',
    activeColor: '#0070f3',
    background: 'transparent',
  },
  extraction: {
    enableAPIExtraction: true,
    enableDOMExtraction: true,
    autoDeduplicate: true,
    ignoredTags: ['BUTTON', 'SVG', 'SCRIPT', 'STYLE'],
  },
};

/**
 * DOM 选择器常量
 */
export const SELECTORS = {
  /** 侧边栏容器 ID */
  SIDEBAR: 'prompt-history-sidebar',
  /** 导航容器 class */
  NAV_CONTAINER: 'ph-nav-container',
  /** 头部 class */
  HEADER: 'ph-header',
  /** 链接列表 class */
  LINKS: 'ph-links',
  /** 链接项 class */
  LINK_ITEM: 'ph-link-item',
  /** 激活状态 class */
  ACTIVE: 'active',
  /** 搜索框 class */
  SEARCH_BAR: 'ph-search-bar',
  /** 导出按钮 class */
  EXPORT_BUTTON: 'ph-export-button',
  /** 复制按钮 class */
  COPY_BUTTON: 'ph-copy-button',
  /** 复制所有按钮 class */
  COPY_ALL_BUTTON: 'ph-copy-all-button',
  /** 展开/收起按钮 class */
  TOGGLE_BUTTON: 'ph-toggle-button',
  /** 头部按钮组 class */
  HEADER_ACTIONS: 'ph-header-actions',
  /** 右上角小卡片 ID */
  COMPACT_CARD: 'ph-compact-card',
  /** 折叠状态 class */
  COLLAPSED: 'collapsed',
} as const;

/**
 * CSS Class 名称常量
 */
export const CSS_CLASSES = {
  /** 隐藏 */
  HIDDEN: 'hidden',
  /** 可见 */
  VISIBLE: 'visible',
  /** 激活 */
  ACTIVE: 'active',
  /** 高亮 */
  HIGHLIGHT: 'highlight',
  /** 禁用 */
  DISABLED: 'disabled',
  /** 加载中 */
  LOADING: 'loading',
} as const;

/**
 * 图标 SVG 常量
 */
export const ICONS = {
  /** 复制图标 */
  COPY: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>`,
  /** 复选标记图标 */
  CHECK: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>`,
  /** 搜索图标 */
  SEARCH: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>`,
  /** 导出图标 */
  EXPORT: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>`,
  /** 关闭图标 */
  CLOSE: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>`,
  /** 箭头图标（展开/收起） - 双向箭头 */
  CHEVRON_RIGHT: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
    <polyline points="15 18 21 12 15 6"></polyline>
  </svg>`,
  CHEVRON_LEFT: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
    <polyline points="9 18 3 12 9 6"></polyline>
  </svg>`,
} as const;

/**
 * 错误消息常量
 */
export const ERROR_MESSAGES = {
  /** 复制失败 */
  COPY_FAILED: '复制失败，请重试',
  /** 提取失败 */
  EXTRACT_FAILED: '提取 Prompt 失败',
  /** 导出失败 */
  EXPORT_FAILED: '导出失败',
  /** 未找到元素 */
  ELEMENT_NOT_FOUND: '未找到目标元素',
  /** 无效配置 */
  INVALID_CONFIG: '无效的配置参数',
} as const;

/**
 * 成功消息常量
 */
export const SUCCESS_MESSAGES = {
  /** 复制成功 */
  COPIED: '已复制',
  /** 全部复制成功 */
  ALL_COPIED: '已复制所有 Prompts',
  /** 导出成功 */
  EXPORTED: '导出成功',
} as const;

/**
 * 本地存储键常量
 */
export const STORAGE_KEYS = {
  /** 用户偏好设置 */
  PREFERENCES: 'prompt-history:preferences',
  /** 缓存的 Prompts */
  CACHED_PROMPTS: 'prompt-history:cache',
  /** 最后访问的 URL */
  LAST_URL: 'prompt-history:last-url',
  /** 侧边栏折叠状态 */
  SIDEBAR_COLLAPSED: 'prompt-history:sidebar-collapsed',
} as const;

/**
 * API 相关常量
 */
export const API = {
  /** ChatGPT API 基础URL */
  BASE_URL: 'https://chatgpt.com',
  /** Conversation API 路径 */
  CONVERSATION_PATH: '/backend-api/conversation',
  /** 超时时间（ms） */
  TIMEOUT: 30000,
} as const;

/**
 * 调试模式（开发环境启用，或通过 localStorage 手动启用）
 * 在浏览器控制台执行以启用：localStorage.setItem('prompt-history:debug', 'true')
 */
export const DEBUG =
  process.env['NODE_ENV'] === 'development' ||
  (typeof localStorage !== 'undefined' &&
    localStorage.getItem('prompt-history:debug') === 'true');

/**
 * 版本号
 */
export const VERSION = '2.0.0';

/**
 * 扩展名称
 */
export const EXTENSION_NAME = 'Prompt History';

/**
 * 扩展描述
 */
export const EXTENSION_DESCRIPTION =
  'Track and manage your ChatGPT prompts with ease';
