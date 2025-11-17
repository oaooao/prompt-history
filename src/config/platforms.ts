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
 * 注意：这些配置需要实际调研 Gemini 的 DOM 结构后完善
 */
export const GEMINI_CONFIG: PlatformConfig = {
  name: 'Gemini',
  type: PlatformType.GEMINI,
  urlPatterns: ['https://gemini.google.com/*'],
  hostname: 'gemini.google.com',
  selectors: {
    // TODO: 需要实际调研 Gemini 的选择器
    userMessages: ['You'],
    articleContainer: '.conversation-turn, message-content',
    ignoredTags: ['BUTTON', 'SVG', 'SCRIPT', 'STYLE'],
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
 * 注意：这些配置需要实际调研 Claude 的 DOM 结构后完善
 */
export const CLAUDE_CONFIG: PlatformConfig = {
  name: 'Claude',
  type: PlatformType.CLAUDE,
  urlPatterns: ['https://claude.ai/*'],
  hostname: 'claude.ai',
  selectors: {
    // TODO: 需要实际调研 Claude 的选择器
    userMessages: ['You', 'User'],
    articleContainer: '[data-test-render-count], .font-user-message',
    ignoredTags: ['BUTTON', 'SVG', 'SCRIPT', 'STYLE'],
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
 * 注意：这些配置需要实际调研 DeepSeek 的 DOM 结构后完善
 */
export const DEEPSEEK_CONFIG: PlatformConfig = {
  name: 'DeepSeek',
  type: PlatformType.DEEPSEEK,
  urlPatterns: ['https://chat.deepseek.com/*'],
  hostname: 'chat.deepseek.com',
  selectors: {
    // TODO: 需要实际调研 DeepSeek 的选择器
    userMessages: ['You', 'User'],
    articleContainer: '.message-item, .chat-message',
    ignoredTags: ['BUTTON', 'SVG', 'SCRIPT', 'STYLE'],
  },
  ui: {
    primaryColor: '#0084ff',
    activeColor: '#006bd6',
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
} as const;
