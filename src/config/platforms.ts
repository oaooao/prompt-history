/**
 * 平台特定配置
 * 每个 AI 聊天平台的独特配置
 */

import { PlatformType, PlatformConfig } from '@/types/Platform';

/**
 * ChatGPT 平台配置
 */
export const CHATGPT_CONFIG: PlatformConfig = {
  name: 'ChatGPT',
  type: PlatformType.CHATGPT,
  urlPatterns: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
  hostname: 'chatgpt.com',
  selectors: {
    userMessages: ['你说', 'You said', 'You:', '你：'],
    articleContainer: 'article',
    userBubble: '.user-message-bubble-color',
    ignoredTags: ['BUTTON', 'SVG', 'SCRIPT', 'STYLE'],
  },
  api: {
    baseURL: 'https://chatgpt.com',
    conversationPath: '/backend-api/conversation',
    method: 'POST',
    timeout: 30000,
  },
  ui: {
    primaryColor: '#10a37f',
    activeColor: '#0070f3',
    supportsDarkMode: true,
    sidebarPosition: 'right',
  },
};

/**
 * Gemini 平台配置
 * 基于 DOM 结构深度分析完成
 */
export const GEMINI_CONFIG: PlatformConfig = {
  name: 'Gemini',
  type: PlatformType.GEMINI,
  urlPatterns: ['https://gemini.google.com/*'],
  hostname: 'gemini.google.com',
  selectors: {
    // Gemini 不使用文本标识区分用户消息
    userMessages: [],
    // 对话容器（每个容器包含一个用户消息和一个 AI 回复）
    articleContainer: '.conversation-container',
    // Gemini 特有选择器
    userQueryElement: 'user-query',
    userQueryText: '.horizontal-container',
    chatHistory: 'infinite-scroller.chat-history',
    // 需要过滤的标签（包含 Angular Material 组件）
    ignoredTags: [
      'BUTTON',
      'MAT-ICON',
      'SVG',
      'SCRIPT',
      'STYLE',
      'NOSCRIPT',
      'TTS-CONTROL',
      'MESSAGE-ACTIONS',
    ],
  },
  ui: {
    primaryColor: '#4285f4',
    activeColor: '#1a73e8',
    supportsDarkMode: true,
    sidebarPosition: 'right',
  },
};

/**
 * Claude 平台配置
 * 基于 DOM 结构深度分析完成
 */
export const CLAUDE_CONFIG: PlatformConfig = {
  name: 'Claude',
  type: PlatformType.CLAUDE,
  urlPatterns: ['https://claude.ai/*'],
  hostname: 'claude.ai',
  selectors: {
    // Claude 使用 data-testid 属性标识用户消息（最简洁的平台）
    userMessages: [],
    // 用户消息容器（使用 data-testid 属性）
    articleContainer: '[data-testid="user-message"]',
    // 文本元素选择器
    userMessageText: 'p',
    // 需要过滤的标签
    ignoredTags: ['BUTTON', 'SVG', 'SCRIPT', 'STYLE', 'NOSCRIPT'],
  },
  ui: {
    primaryColor: '#cc785c',
    activeColor: '#ab6b51',
    supportsDarkMode: true,
    sidebarPosition: 'right',
  },
};

/**
 * DeepSeek 平台配置
 * 基于 DOM 结构深度分析完成
 */
export const DEEPSEEK_CONFIG: PlatformConfig = {
  name: 'DeepSeek',
  type: PlatformType.DEEPSEEK,
  urlPatterns: ['https://chat.deepseek.com/*'],
  hostname: 'chat.deepseek.com',
  selectors: {
    // DeepSeek 不使用文本标识区分用户消息
    userMessages: [],
    // 用户消息容器（使用 data-um-id 属性）
    articleContainer: '[data-um-id]',
    // DeepSeek 特有选择器
    userMessageText: '.fbb737a4',
    chatContainer: '._0f72b0b.ds-scroll-area',
    messageList: '.dad65929',
    // 需要过滤的标签和元素
    ignoredTags: [
      'BUTTON',
      'SVG',
      'SCRIPT',
      'STYLE',
      'NOSCRIPT',
    ],
    ignoredClasses: [
      '_11d6b3a',  // 用户消息操作区
      '_0a3d93b',  // AI 回复操作区
    ],
  },
  ui: {
    primaryColor: '#4D6BFE',
    activeColor: '#3654E8',
    supportsDarkMode: true,
    sidebarPosition: 'right',
  },
};

/**
 * Qwen 中文版（通义千问）平台配置
 * 基于 DOM 结构深度分析完成
 */
export const QWEN_CN_CONFIG: PlatformConfig = {
  name: 'Qwen (通义千问)',
  type: PlatformType.QWEN_CN,
  urlPatterns: ['https://www.tongyi.com/*', 'https://tongyi.com/*'],
  hostname: 'tongyi.com',
  selectors: {
    // 不使用文本标识区分用户消息
    userMessages: [],
    // 用户消息容器（使用 CSS Modules 哈希类名）
    articleContainer: '.questionItem-MPmrIl',
    // 用户消息气泡选择器
    userBubble: '.bubble-uo23is',
    // 文本容器选择器
    textContainer: '.contentBox-t7l7vJ',
    // 需要过滤的标签
    ignoredTags: [
      'BUTTON',
      'SVG',
      'SCRIPT',
      'STYLE',
      'NOSCRIPT',
    ],
  },
  ui: {
    primaryColor: '#722ED1',  // 千问紫色
    activeColor: '#531DAB',
    supportsDarkMode: true,
    sidebarPosition: 'right',
  },
};

/**
 * Qwen 国际版平台配置
 * 基于 DOM 结构深度分析完成
 */
export const QWEN_INTL_CONFIG: PlatformConfig = {
  name: 'Qwen',
  type: PlatformType.QWEN_INTL,
  urlPatterns: ['https://chat.qwen.ai/*'],
  hostname: 'chat.qwen.ai',
  selectors: {
    // 不使用文本标识区分用户消息
    userMessages: [],
    // 用户消息容器（使用语义化类名）
    articleContainer: '.chat-user',
    // 用户消息内容选择器
    userBubble: '.user-message-content',
    // 文本容器选择器
    textContainer: '.user-message-text-content',
    // 需要过滤的标签
    ignoredTags: [
      'BUTTON',
      'SVG',
      'SCRIPT',
      'STYLE',
      'NOSCRIPT',
    ],
  },
  ui: {
    primaryColor: '#722ED1',  // 千问紫色
    activeColor: '#531DAB',
    supportsDarkMode: true,
    sidebarPosition: 'right',
  },
};

/**
 * Kimi（月之暗面）平台配置
 * 基于 DOM 结构深度分析完成
 */
export const KIMI_CONFIG: PlatformConfig = {
  name: 'Kimi',
  type: PlatformType.KIMI,
  urlPatterns: ['https://www.kimi.com/*', 'https://kimi.com/*', 'https://kimi.moonshot.cn/*'],
  hostname: 'kimi.com',
  selectors: {
    // 不使用文本标识区分用户消息
    userMessages: [],
    // 用户消息容器（使用语义化类名）
    articleContainer: '.segment-user',
    // 消息内容选择器
    userBubble: '.segment-content-box',
    // 需要过滤的标签
    ignoredTags: [
      'BUTTON',
      'SVG',
      'SCRIPT',
      'STYLE',
      'NOSCRIPT',
    ],
  },
  ui: {
    primaryColor: '#00C3B4',  // Kimi 青色
    activeColor: '#00A89D',
    supportsDarkMode: true,
    sidebarPosition: 'right',
  },
};

/**
 * 豆包（字节跳动）平台配置
 * 基于 DOM 结构深度分析完成
 */
export const DOUBAO_CONFIG: PlatformConfig = {
  name: 'Doubao (豆包)',
  type: PlatformType.DOUBAO,
  urlPatterns: ['https://www.doubao.com/*', 'https://doubao.com/*'],
  hostname: 'doubao.com',
  selectors: {
    // 不使用文本标识区分用户消息
    userMessages: [],
    // 用户消息容器（使用 data-message-id 属性）
    articleContainer: '[data-message-id]',
    // 需要过滤的标签
    ignoredTags: [
      'BUTTON',
      'SVG',
      'SCRIPT',
      'STYLE',
      'NOSCRIPT',
    ],
  },
  ui: {
    primaryColor: '#6366F1',  // 豆包紫蓝色
    activeColor: '#4F46E5',
    supportsDarkMode: true,
    sidebarPosition: 'right',
  },
};

/**
 * 所有平台配置的映射
 */
export const PLATFORM_CONFIGS: Record<PlatformType, PlatformConfig | null> = {
  [PlatformType.CHATGPT]: CHATGPT_CONFIG,
  [PlatformType.GEMINI]: GEMINI_CONFIG,
  [PlatformType.CLAUDE]: CLAUDE_CONFIG,
  [PlatformType.DEEPSEEK]: DEEPSEEK_CONFIG,
  [PlatformType.QWEN_CN]: QWEN_CN_CONFIG,
  [PlatformType.QWEN_INTL]: QWEN_INTL_CONFIG,
  [PlatformType.KIMI]: KIMI_CONFIG,
  [PlatformType.DOUBAO]: DOUBAO_CONFIG,
  [PlatformType.UNKNOWN]: null,
};

/**
 * 根据平台类型获取配置
 */
export function getPlatformConfig(
  platform: PlatformType
): PlatformConfig | null {
  return PLATFORM_CONFIGS[platform] || null;
}

/**
 * 平台检测特征
 */
export const PLATFORM_FEATURES = {
  [PlatformType.CHATGPT]: {
    urlPattern: /chat(gpt)?\.openai\.com|chatgpt\.com/i,
    domFeatures: ['[class*="react-scroll-to-bottom"]', 'article'],
    windowFeatures: [],
  },
  [PlatformType.GEMINI]: {
    urlPattern: /gemini\.google\.com/i,
    domFeatures: ['.conversation-container', 'bard-app'],
    windowFeatures: [],
  },
  [PlatformType.CLAUDE]: {
    urlPattern: /claude\.ai/i,
    domFeatures: ['[data-test-render-count]', '.font-claude-message'],
    windowFeatures: [],
  },
  [PlatformType.DEEPSEEK]: {
    urlPattern: /chat\.deepseek\.com/i,
    domFeatures: ['.chat-container', '.message-list'],
    windowFeatures: [],
  },
  [PlatformType.QWEN_CN]: {
    urlPattern: /tongyi\.com/i,
    domFeatures: ['.questionItem-MPmrIl', '.bubble-uo23is', '.answerItem-SsrVa_'],
    windowFeatures: [],
  },
  [PlatformType.QWEN_INTL]: {
    urlPattern: /chat\.qwen\.ai/i,
    domFeatures: ['.user-message-content', '.chat-user', '.response-message-body'],
    windowFeatures: [],
  },
  [PlatformType.KIMI]: {
    urlPattern: /kimi\.(com|moonshot\.cn)/i,
    domFeatures: ['.segment-user', '.segment-content-box', '.segment-container'],
    windowFeatures: [],
  },
  [PlatformType.DOUBAO]: {
    urlPattern: /doubao\.com/i,
    domFeatures: ['[data-message-id]', '.justify-end'],
    windowFeatures: [],
  },
} as const;
