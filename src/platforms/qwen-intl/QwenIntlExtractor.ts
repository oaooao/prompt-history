/**
 * Qwen 国际版 Prompt 提取器
 * 从 Qwen 国际版页面的 DOM 中提取用户的 Prompts
 */

import { BaseExtractor } from '@/core/extractor/BaseExtractor';
import { Prompt, PromptSource } from '@/types/Prompt';
import { QWEN_INTL_CONFIG } from '@/config/platforms';
import { Logger } from '@/utils/logger';

export class QwenIntlExtractor extends BaseExtractor {
  constructor() {
    super(QWEN_INTL_CONFIG);
  }

  /**
   * 提取 Prompts
   */
  async extract(): Promise<Prompt[]> {
    try {
      Logger.info('QwenIntlExtractor', 'Starting extraction');

      const userMessages = this.findUserMessages();
      Logger.debug('QwenIntlExtractor', `Found ${userMessages.length} user messages`);

      const prompts: Prompt[] = [];

      for (const msgElement of userMessages) {
        const prompt = this.extractFromMessage(msgElement);
        if (prompt) {
          prompts.push(prompt);
          this.cachePrompt(prompt);
        }
      }

      Logger.info('QwenIntlExtractor', `Extracted ${prompts.length} prompts`);
      return this.sortByTimestamp(prompts);
    } catch (error) {
      this.logError('Extraction failed', error as Error);
      return [];
    }
  }

  /**
   * 查找所有用户消息容器（.chat-user）
   */
  private findUserMessages(): HTMLElement[] {
    const messages = document.querySelectorAll<HTMLElement>(
      this.config.selectors.articleContainer
    );
    return Array.from(messages);
  }

  /**
   * 从用户消息容器提取内容
   */
  private extractFromMessage(msgElement: HTMLElement): Prompt | null {
    const { userBubble } = this.config.selectors;

    if (!userBubble) {
      Logger.error('QwenIntlExtractor', 'Missing userBubble in config');
      return null;
    }

    // 查找用户消息内容元素（.user-message-content）
    const contentElement = msgElement.querySelector(userBubble);

    if (!contentElement) {
      Logger.warn('QwenIntlExtractor', 'Content element not found in message');
      return null;
    }

    // 提取文本内容（自动过滤 ignoredTags）
    const content = this.extractText(contentElement);

    // 验证内容
    if (!this.isValidContent(content)) {
      return null;
    }

    // 检查是否重复
    if (this.isDuplicate(content)) {
      return null;
    }

    // Qwen 国际版不提供时间戳，使用当前时间
    const timestamp = Date.now();

    // 创建 Prompt 对象
    return this.createPrompt(
      content,
      contentElement as HTMLElement,
      PromptSource.DOM,
      timestamp
    );
  }

  /**
   * 增量提取（只提取新的消息）
   */
  async extractNew(): Promise<Prompt[]> {
    const userMessages = this.findUserMessages();
    const newPrompts: Prompt[] = [];

    for (const msgElement of userMessages) {
      const { userBubble } = this.config.selectors;

      if (!userBubble) {
        continue;
      }

      const contentElement = msgElement.querySelector(userBubble);
      if (!contentElement) {
        continue;
      }

      const content = this.extractText(contentElement);
      if (!this.isValidContent(content) || this.isDuplicate(content)) {
        continue;
      }

      const timestamp = Date.now();
      const prompt = this.createPrompt(
        content,
        contentElement as HTMLElement,
        PromptSource.DOM,
        timestamp
      );

      newPrompts.push(prompt);
      this.cachePrompt(prompt);
    }

    Logger.info('QwenIntlExtractor', `Extracted ${newPrompts.length} new prompts`);
    return newPrompts;
  }

  /**
   * 快速检查是否有新消息（用于性能优化）
   */
  hasNewMessages(): boolean {
    const userMessages = this.findUserMessages();
    const currentCount = userMessages.length;
    const cachedCount = this.getCachedPrompts().length;

    return currentCount > cachedCount;
  }
}
