/**
 * Qwen 国际版平台适配器
 * 实现 Qwen 国际版平台特定的功能和逻辑
 */

import { PlatformAdapter } from '@/platforms/base/PlatformAdapter';
import { QwenIntlExtractor } from './QwenIntlExtractor';
import { PlatformType, PlatformConfig } from '@/types/Platform';
import { Prompt } from '@/types/Prompt';
import { QWEN_INTL_CONFIG } from '@/config/platforms';
import { Logger } from '@/utils/logger';

export class QwenIntlAdapter extends PlatformAdapter {
  readonly name = 'Qwen';
  readonly type = PlatformType.QWEN_INTL;
  readonly version = '1.0.0';

  /** DOM 提取器 */
  private extractor: QwenIntlExtractor;
  /** URL 检查定时器 */
  private urlCheckInterval: ReturnType<typeof setInterval> | null = null;
  /** 最后的 URL */
  private lastUrl = '';

  constructor() {
    super();
    this.extractor = new QwenIntlExtractor();
  }

  /**
   * 检测是否为 Qwen 国际版页面
   */
  detect(): boolean {
    return window.location.href.includes('chat.qwen.ai');
  }

  /**
   * 获取平台配置
   */
  getConfig(): PlatformConfig {
    return QWEN_INTL_CONFIG;
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
    Logger.info('QwenIntlAdapter', 'Initializing Qwen Intl adapter');

    // 记录当前 URL
    this.lastUrl = window.location.href;

    // 启动 URL 检查（用于检测对话切换）
    this.startURLCheck();

    Logger.info('QwenIntlAdapter', 'Qwen Intl adapter initialized successfully');
  }

  /**
   * 清理钩子
   */
  protected override onDestroy(): void {
    Logger.info('QwenIntlAdapter', 'Destroying Qwen Intl adapter');

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
        Logger.info('QwenIntlAdapter', 'URL changed, conversation switched');
        this.lastUrl = currentUrl;

        // 清空缓存（新对话）
        this.extractor.clearCache();
      }
    }, interval);

    this.addCleanupTask(() => this.stopURLCheck());

    Logger.debug('QwenIntlAdapter', 'Started URL check');
  }

  /**
   * 停止 URL 检查
   */
  private stopURLCheck(): void {
    if (this.urlCheckInterval) {
      clearInterval(this.urlCheckInterval);
      this.urlCheckInterval = null;
      Logger.debug('QwenIntlAdapter', 'Stopped URL check');
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
      // 从 URL 提取对话 ID
      // 格式: https://chat.qwen.ai/c/xxx
      const match = window.location.pathname.match(/\/c\/([a-f0-9-]+)/);
      return match ? match[1] : null;
    } catch (error) {
      Logger.error('QwenIntlAdapter', 'Failed to get conversation ID', error as Error);
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
      await this.waitForElement('.chat-user', timeout);
      Logger.info('QwenIntlAdapter', 'Conversation loaded');
      return true;
    } catch (error) {
      Logger.error('QwenIntlAdapter', 'Conversation load timeout', error as Error);
      return false;
    }
  }
}
