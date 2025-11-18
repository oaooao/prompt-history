/**
 * Claude Prompt 提取器
 * 从 Claude 页面的 DOM 中提取用户的 Prompts
 */

import { BaseExtractor } from '@/core/extractor/BaseExtractor';
import { Prompt, PromptSource } from '@/types/Prompt';
import { CLAUDE_CONFIG } from '@/config/platforms';
import { Logger } from '@/utils/logger';

export class ClaudeExtractor extends BaseExtractor {
  constructor() {
    super(CLAUDE_CONFIG);
  }

  /**
   * 提取 Prompts
   */
  async extract(): Promise<Prompt[]> {
    try {
      Logger.info('ClaudeExtractor', 'Starting extraction');

      const userMessages = this.findUserMessages();
      Logger.debug('ClaudeExtractor', `Found ${userMessages.length} user messages`);

      const prompts: Prompt[] = [];

      for (const msgElement of userMessages) {
        const prompt = this.extractFromMessage(msgElement);
        if (prompt) {
          prompts.push(prompt);
          this.cachePrompt(prompt);
        }
      }

      Logger.info('ClaudeExtractor', `Extracted ${prompts.length} prompts`);
      return this.sortByTimestamp(prompts);
    } catch (error) {
      this.logError('Extraction failed', error as Error);
      return [];
    }
  }

  /**
   * 查找所有用户消息元素
   * Claude 使用 data-testid="user-message" 标识用户消息
   */
  private findUserMessages(): HTMLElement[] {
    const messages = document.querySelectorAll<HTMLElement>(
      this.config.selectors.articleContainer
    );
    return Array.from(messages);
  }

  /**
   * 从用户消息元素提取内容
   */
  private extractFromMessage(msgElement: HTMLElement): Prompt | null {
    const { userMessageText } = this.config.selectors;

    if (!userMessageText) {
      Logger.error('ClaudeExtractor', 'Missing userMessageText in config');
      return null;
    }

    // 查找用户消息文本容器
    const textContainer = msgElement.querySelector(userMessageText);

    if (!textContainer) {
      Logger.warn('ClaudeExtractor', 'Text container not found in message');
      return null;
    }

    // 提取文本内容（自动过滤 ignoredTags）
    const content = this.extractText(textContainer);

    // 验证内容
    if (!this.isValidContent(content)) {
      return null;
    }

    // 检查是否重复
    if (this.isDuplicate(content)) {
      return null;
    }

    // Claude 不提供时间戳，使用当前时间
    const timestamp = Date.now();

    // 创建 Prompt 对象
    return this.createPrompt(
      content,
      textContainer as HTMLElement,
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
      const { userMessageText } = this.config.selectors;

      if (!userMessageText) {
        continue;
      }

      const textContainer = msgElement.querySelector(userMessageText);
      if (!textContainer) {
        continue;
      }

      const content = this.extractText(textContainer);
      if (!this.isValidContent(content) || this.isDuplicate(content)) {
        continue;
      }

      const timestamp = Date.now();
      const prompt = this.createPrompt(
        content,
        textContainer as HTMLElement,
        PromptSource.DOM,
        timestamp
      );

      newPrompts.push(prompt);
      this.cachePrompt(prompt);
    }

    Logger.info('ClaudeExtractor', `Extracted ${newPrompts.length} new prompts`);
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
