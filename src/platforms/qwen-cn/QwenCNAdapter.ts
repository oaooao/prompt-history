/**
 * Qwen 中文版（通义千问）平台适配器
 * 实现通义千问平台特定的功能和逻辑
 */

import { PlatformAdapter } from '@/platforms/base/PlatformAdapter';
import { QwenCNExtractor } from './QwenCNExtractor';
import { PlatformType, PlatformConfig } from '@/types/Platform';
import { Prompt } from '@/types/Prompt';
import { QWEN_CN_CONFIG } from '@/config/platforms';
import { Logger } from '@/utils/logger';

export class QwenCNAdapter extends PlatformAdapter {
  readonly name = 'Qwen (通义千问)';
  readonly type = PlatformType.QWEN_CN;
  readonly version = '1.0.0';

  /** DOM 提取器 */
  private extractor: QwenCNExtractor;
  /** URL 检查定时器 */
  private urlCheckInterval: ReturnType<typeof setInterval> | null = null;
  /** 最后的 URL */
  private lastUrl = '';

  constructor() {
    super();
    this.extractor = new QwenCNExtractor();
  }

  /**
   * 检测是否为通义千问页面
   */
  detect(): boolean {
    return window.location.href.includes('tongyi.com');
  }

  /**
   * 获取平台配置
   */
  getConfig(): PlatformConfig {
    return QWEN_CN_CONFIG;
  }

  /**
   * 提取 Prompts
   */
  async extractPrompts(): Promise<Prompt[]> {
    this.ensureInitialized();
    return this.extractor.extract();
  }

  /**
   * 初始化钩子
   */
  protected override onInitialize(): void {
    Logger.info('QwenCNAdapter', 'Initializing Qwen CN adapter');

    // 记录当前 URL
    this.lastUrl = window.location.href;

    // 启动 URL 检查（用于检测对话切换）
    this.startURLCheck();

    Logger.info('QwenCNAdapter', 'Qwen CN adapter initialized successfully');
  }

  /**
   * 清理钩子
   */
  protected override onDestroy(): void {
    Logger.info('QwenCNAdapter', 'Destroying Qwen CN adapter');

    // 停止 URL 检查
    this.stopURLCheck();

    // 清理提取器缓存
    this.extractor.clearCache();
  }

  /**
   * 启动 URL 检查
   * 用于检测用户切换对话
   */
  private startURLCheck(): void {
    if (this.urlCheckInterval) {
      return;
    }

    const interval = 500; // 500ms 检查一次

    this.urlCheckInterval = setInterval(() => {
      const currentUrl = window.location.href;

      if (currentUrl !== this.lastUrl) {
        Logger.info('QwenCNAdapter', 'URL changed, conversation switched');
        this.lastUrl = currentUrl;

        // 清空缓存（新对话）
        this.extractor.clearCache();
      }
    }, interval);

    this.addCleanupTask(() => this.stopURLCheck());

    Logger.debug('QwenCNAdapter', 'Started URL check');
  }

  /**
   * 停止 URL 检查
   */
  private stopURLCheck(): void {
    if (this.urlCheckInterval) {
      clearInterval(this.urlCheckInterval);
      this.urlCheckInterval = null;
      Logger.debug('QwenCNAdapter', 'Stopped URL check');
    }
  }

  /**
   * 检查是否有新消息
   */
  hasNewMessages(): boolean {
    return this.extractor.hasNewMessages();
  }

  /**
   * 增量提取新消息
   */
  async extractNewMessages(): Promise<Prompt[]> {
    this.ensureInitialized();
    return this.extractor.extractNew();
  }

  /**
   * 获取当前对话 ID
   */
  getCurrentConversationId(): string | null {
    try {
      // 从 URL 提取会话 ID
      // 格式: https://www.tongyi.com/?sessionId=xxx
      const url = new URL(window.location.href);
      return url.searchParams.get('sessionId');
    } catch (error) {
      Logger.error('QwenCNAdapter', 'Failed to get conversation ID', error as Error);
      return null;
    }
  }

  /**
   * 检查是否在对话页面
   */
  isInConversation(): boolean {
    return this.getCurrentConversationId() !== null;
  }

  /**
   * 等待对话加载完成
   */
  async waitForConversationLoad(timeout = 10000): Promise<boolean> {
    try {
      await this.waitForElement('.questionItem-MPmrIl', timeout);
      Logger.info('QwenCNAdapter', 'Conversation loaded');
      return true;
    } catch (error) {
      Logger.error('QwenCNAdapter', 'Conversation load timeout', error as Error);
      return false;
    }
  }
}
