/**
 * 应用配置接口
 */
export interface AppConfig {
  ui: UIConfig;
  timing: TimingConfig;
  selectors: SelectorsConfig;
  colors: ColorsConfig;
  extraction: ExtractionConfig;
}

/**
 * UI 配置
 */
export interface UIConfig {
  /** 侧边栏宽度（px） */
  sidebarWidth: number;
  /** 预览文本长度 */
  previewLength: number;
  /** 动画持续时间（ms） */
  animationDuration: number;
  /** 最小屏幕宽度（低于此宽度隐藏侧边栏） */
  minScreenWidth: number;
}

/**
 * 时间配置
 */
export interface TimingConfig {
  /** 滚动防抖延迟（ms） */
  scrollDebounce: number;
  /** 提取延迟（ms） */
  extractDelay: number;
  /** 二次提取延迟（ms） */
  secondExtractDelay: number;
  /** URL 检查间隔（ms） */
  urlCheckInterval: number;
  /** 高亮持续时间（ms） */
  highlightDuration: number;
  /** 复制反馈持续时间（ms） */
  copyFeedbackDuration: number;
  /** 搜索防抖延迟（ms） */
  searchDebounce: number;
}

/**
 * 选择器配置
 */
export interface SelectorsConfig {
  /** 用户消息关键词 */
  userMessages: string[];
  /** 文章元素选择器 */
  article: string;
  /** 用户气泡颜色 class */
  userBubble: string;
}

/**
 * 颜色配置
 */
export interface ColorsConfig {
  /** Next.js 蓝色 */
  nextjsBlue: string;
  /** 文本灰色 */
  textGray: string;
  /** 边框灰色 */
  borderGray: string;
  /** 激活颜色 */
  activeColor: string;
  /** 背景色 */
  background: string;
}

/**
 * 提取配置
 */
export interface ExtractionConfig {
  /** 启用 API 拦截 */
  enableAPIExtraction: boolean;
  /** 启用 DOM 提取 */
  enableDOMExtraction: boolean;
  /** 自动去重 */
  autoDeduplicate: boolean;
  /** 忽略的标签 */
  ignoredTags: string[];
}

/**
 * 用户偏好设置
 */
export interface UserPreferences {
  /** 是否启用搜索高亮 */
  enableSearchHighlight: boolean;
  /** 默认导出格式 */
  defaultExportFormat: string;
  /** 是否显示时间戳 */
  showTimestamp: boolean;
  /** 是否启用暗色模式 */
  darkMode: boolean;
}
