/**
 * Claude 平台适配器
 * 实现 Claude 平台特定的功能和逻辑
 */

import { PlatformAdapter } from '@/platforms/base/PlatformAdapter';
import { ClaudeExtractor } from './ClaudeExtractor';
import { PlatformType, PlatformConfig } from '@/types/Platform';
import { Prompt } from '@/types/Prompt';
import { CLAUDE_CONFIG } from '@/config/platforms';
import { Logger } from '@/utils/logger';

export class ClaudeAdapter extends PlatformAdapter {
  readonly name = 'Claude';
  readonly type = PlatformType.CLAUDE;
  readonly version = '2.0.0';

  /** DOM 提取器 */
  private extractor: ClaudeExtractor;
  /** URL 检查定时器 */
  private urlCheckInterval: ReturnType<typeof setInterval> | null = null;
  /** 最后的 URL */
  private lastUrl = '';

  constructor() {
    super();
    this.extractor = new ClaudeExtractor();
  }

  /**
   * 检测是否为 Claude 页面
   */
  detect(): boolean {
    return window.location.href.includes('claude.ai');
  }

  /**
   * 获取平台配置
   */
  getConfig(): PlatformConfig {
    return CLAUDE_CONFIG;
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
    Logger.info('ClaudeAdapter', 'Initializing Claude adapter');

    // 记录当前 URL
    this.lastUrl = window.location.href;

    // 启动 URL 检查（用于检测对话切换）
    this.startURLCheck();

    Logger.info('ClaudeAdapter', 'Claude adapter initialized successfully');
  }

  /**
   * 清理钩子
   */
  protected override onDestroy(): void {
    Logger.info('ClaudeAdapter', 'Destroying Claude adapter');

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
        Logger.info('ClaudeAdapter', 'URL changed, conversation switched');
        this.lastUrl = currentUrl;

        // 清空缓存（新对话）
        this.extractor.clearCache();
      }
    }, interval);

    this.addCleanupTask(() => this.stopURLCheck());

    Logger.debug('ClaudeAdapter', 'Started URL check');
  }

  /**
   * 停止 URL 检查
   */
  private stopURLCheck(): void {
    if (this.urlCheckInterval) {
      clearInterval(this.urlCheckInterval);
      this.urlCheckInterval = null;
      Logger.debug('ClaudeAdapter', 'Stopped URL check');
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
      // 格式: https://claude.ai/chat/<conversation-id>
      const match = window.location.pathname.match(/\/chat\/([a-f0-9-]+)/);
      return match ? match[1] : null;
    } catch (error) {
      Logger.error('ClaudeAdapter', 'Failed to get conversation ID', error as Error);
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
      await this.waitForElement('[data-testid="user-message"]', timeout);
      Logger.info('ClaudeAdapter', 'Conversation loaded');
      return true;
    } catch (error) {
      Logger.error('ClaudeAdapter', 'Conversation load timeout', error as Error);
      return false;
    }
  }
}
