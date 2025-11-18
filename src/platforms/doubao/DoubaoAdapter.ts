/**
 * 豆包（字节跳动）平台适配器
 * 实现豆包平台特定的功能和逻辑
 */

import { PlatformAdapter } from '@/platforms/base/PlatformAdapter';
import { DoubaoExtractor } from './DoubaoExtractor';
import { PlatformType, PlatformConfig } from '@/types/Platform';
import { Prompt } from '@/types/Prompt';
import { DOUBAO_CONFIG } from '@/config/platforms';
import { Logger } from '@/utils/logger';

export class DoubaoAdapter extends PlatformAdapter {
  readonly name = 'Doubao (豆包)';
  readonly type = PlatformType.DOUBAO;
  readonly version = '1.0.0';

  /** DOM 提取器 */
  private extractor: DoubaoExtractor;
  /** URL 检查定时器 */
  private urlCheckInterval: ReturnType<typeof setInterval> | null = null;
  /** 最后的 URL */
  private lastUrl = '';

  constructor() {
    super();
    this.extractor = new DoubaoExtractor();
  }

  /**
   * 检测是否为豆包页面
   */
  detect(): boolean {
    return window.location.href.includes('doubao.com');
  }

  /**
   * 获取平台配置
   */
  getConfig(): PlatformConfig {
    return DOUBAO_CONFIG;
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
    Logger.info('DoubaoAdapter', 'Initializing Doubao adapter');

    // 记录当前 URL
    this.lastUrl = window.location.href;

    // 启动 URL 检查（用于检测对话切换）
    this.startURLCheck();

    Logger.info('DoubaoAdapter', 'Doubao adapter initialized successfully');
  }

  /**
   * 清理钩子
   */
  protected override onDestroy(): void {
    Logger.info('DoubaoAdapter', 'Destroying Doubao adapter');

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
        Logger.info('DoubaoAdapter', 'URL changed, conversation switched');
        this.lastUrl = currentUrl;

        // 清空缓存（新对话）
        this.extractor.clearCache();
      }
    }, interval);

    this.addCleanupTask(() => this.stopURLCheck());

    Logger.debug('DoubaoAdapter', 'Started URL check');
  }

  /**
   * 停止 URL 检查
   */
  private stopURLCheck(): void {
    if (this.urlCheckInterval) {
      clearInterval(this.urlCheckInterval);
      this.urlCheckInterval = null;
      Logger.debug('DoubaoAdapter', 'Stopped URL check');
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
      // 格式: https://www.doubao.com/chat/xxx
      const match = window.location.pathname.match(/\/chat\/(\d+)/);
      return match ? match[1] : null;
    } catch (error) {
      Logger.error('DoubaoAdapter', 'Failed to get conversation ID', error as Error);
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
      await this.waitForElement('[data-message-id]', timeout);
      Logger.info('DoubaoAdapter', 'Conversation loaded');
      return true;
    } catch (error) {
      Logger.error('DoubaoAdapter', 'Conversation load timeout', error as Error);
      return false;
    }
  }
}
