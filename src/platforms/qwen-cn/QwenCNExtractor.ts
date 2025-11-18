/**
 * Qwen 中文版（通义千问）Prompt 提取器
 * 从通义千问页面的 DOM 中提取用户的 Prompts
 */

import { BaseExtractor } from '@/core/extractor/BaseExtractor';
import { Prompt, PromptSource } from '@/types/Prompt';
import { QWEN_CN_CONFIG } from '@/config/platforms';
import { Logger } from '@/utils/logger';

export class QwenCNExtractor extends BaseExtractor {
  constructor() {
    super(QWEN_CN_CONFIG);
  }

  /**
   * 提取 Prompts
   */
  async extract(): Promise<Prompt[]> {
    try {
      Logger.info('QwenCNExtractor', 'Starting extraction');

      const questionItems = this.findQuestionItems();
      Logger.debug('QwenCNExtractor', `Found ${questionItems.length} question items`);

      const prompts: Prompt[] = [];

      for (const item of questionItems) {
        const prompt = this.extractFromQuestionItem(item);
        if (prompt) {
          prompts.push(prompt);
          this.cachePrompt(prompt);
        }
      }

      Logger.info('QwenCNExtractor', `Extracted ${prompts.length} prompts`);
      return this.sortByTimestamp(prompts);
    } catch (error) {
      this.logError('Extraction failed', error as Error);
      return [];
    }
  }

  /**
   * 查找所有用户提问项（.questionItem-MPmrIl）
   */
  private findQuestionItems(): HTMLElement[] {
    const items = document.querySelectorAll<HTMLElement>(
      this.config.selectors.articleContainer
    );
    return Array.from(items);
  }

  /**
   * 从提问项中提取内容
   */
  private extractFromQuestionItem(item: HTMLElement): Prompt | null {
    const { userBubble } = this.config.selectors;

    if (!userBubble) {
      Logger.error('QwenCNExtractor', 'Missing userBubble in config');
      return null;
    }

    // 查找用户消息气泡
    const bubble = item.querySelector(userBubble);

    if (!bubble) {
      Logger.warn('QwenCNExtractor', 'Bubble not found in question item');
      return null;
    }

    // 提取文本内容（自动过滤 ignoredTags）
    const content = this.extractText(bubble);

    // 验证内容
    if (!this.isValidContent(content)) {
      return null;
    }

    // 检查是否重复
    if (this.isDuplicate(content)) {
      return null;
    }

    // 通义千问不提供时间戳，使用当前时间
    const timestamp = Date.now();

    // 创建 Prompt 对象
    return this.createPrompt(
      content,
      bubble as HTMLElement,
      PromptSource.DOM,
      timestamp
    );
  }

  /**
   * 增量提取（只提取新的消息）
   */
  async extractNew(): Promise<Prompt[]> {
    const questionItems = this.findQuestionItems();
    const newPrompts: Prompt[] = [];

    for (const item of questionItems) {
      const { userBubble } = this.config.selectors;

      if (!userBubble) {
        continue;
      }

      const bubble = item.querySelector(userBubble);
      if (!bubble) {
        continue;
      }

      const content = this.extractText(bubble);
      if (!this.isValidContent(content) || this.isDuplicate(content)) {
        continue;
      }

      const timestamp = Date.now();
      const prompt = this.createPrompt(
        content,
        bubble as HTMLElement,
        PromptSource.DOM,
        timestamp
      );

      newPrompts.push(prompt);
      this.cachePrompt(prompt);
    }

    Logger.info('QwenCNExtractor', `Extracted ${newPrompts.length} new prompts`);
    return newPrompts;
  }

  /**
   * 快速检查是否有新消息（用于性能优化）
   */
  hasNewMessages(): boolean {
    const questionItems = this.findQuestionItems();
    const currentCount = questionItems.length;
    const cachedCount = this.getCachedPrompts().length;

    return currentCount > cachedCount;
  }
}
