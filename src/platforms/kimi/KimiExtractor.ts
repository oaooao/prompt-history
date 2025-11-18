/**
 * Kimi（月之暗面）Prompt 提取器
 * 从 Kimi 页面的 DOM 中提取用户的 Prompts
 */

import { BaseExtractor } from '@/core/extractor/BaseExtractor';
import { Prompt, PromptSource } from '@/types/Prompt';
import { KIMI_CONFIG } from '@/config/platforms';
import { Logger } from '@/utils/logger';

export class KimiExtractor extends BaseExtractor {
  constructor() {
    super(KIMI_CONFIG);
  }

  /**
   * 提取 Prompts
   */
  async extract(): Promise<Prompt[]> {
    try {
      Logger.info('KimiExtractor', 'Starting extraction');

      const userSegments = this.findUserSegments();
      Logger.debug('KimiExtractor', `Found ${userSegments.length} user segments`);

      const prompts: Prompt[] = [];

      for (const segment of userSegments) {
        const prompt = this.extractFromSegment(segment);
        if (prompt) {
          prompts.push(prompt);
          this.cachePrompt(prompt);
        }
      }

      Logger.info('KimiExtractor', `Extracted ${prompts.length} prompts`);
      return this.sortByTimestamp(prompts);
    } catch (error) {
      this.logError('Extraction failed', error as Error);
      return [];
    }
  }

  /**
   * 查找所有用户消息片段（.segment-user）
   */
  private findUserSegments(): HTMLElement[] {
    const segments = document.querySelectorAll<HTMLElement>(
      this.config.selectors.articleContainer
    );
    return Array.from(segments);
  }

  /**
   * 从用户消息片段提取内容
   */
  private extractFromSegment(segment: HTMLElement): Prompt | null {
    const { userBubble } = this.config.selectors;

    if (!userBubble) {
      Logger.error('KimiExtractor', 'Missing userBubble in config');
      return null;
    }

    // 查找消息内容容器（.segment-content-box）
    const contentBox = segment.querySelector(userBubble);

    if (!contentBox) {
      Logger.warn('KimiExtractor', 'Content box not found in segment');
      return null;
    }

    // 提取文本内容（自动过滤 ignoredTags）
    const content = this.extractText(contentBox);

    // 验证内容
    if (!this.isValidContent(content)) {
      return null;
    }

    // 检查是否重复
    if (this.isDuplicate(content)) {
      return null;
    }

    // Kimi 不提供时间戳，使用当前时间
    const timestamp = Date.now();

    // 创建 Prompt 对象
    return this.createPrompt(
      content,
      contentBox as HTMLElement,
      PromptSource.DOM,
      timestamp
    );
  }

  /**
   * 增量提取（只提取新的消息）
   */
  async extractNew(): Promise<Prompt[]> {
    const userSegments = this.findUserSegments();
    const newPrompts: Prompt[] = [];

    for (const segment of userSegments) {
      const { userBubble } = this.config.selectors;

      if (!userBubble) {
        continue;
      }

      const contentBox = segment.querySelector(userBubble);
      if (!contentBox) {
        continue;
      }

      const content = this.extractText(contentBox);
      if (!this.isValidContent(content) || this.isDuplicate(content)) {
        continue;
      }

      const timestamp = Date.now();
      const prompt = this.createPrompt(
        content,
        contentBox as HTMLElement,
        PromptSource.DOM,
        timestamp
      );

      newPrompts.push(prompt);
      this.cachePrompt(prompt);
    }

    Logger.info('KimiExtractor', `Extracted ${newPrompts.length} new prompts`);
    return newPrompts;
  }

  /**
   * 快速检查是否有新消息（用于性能优化）
   */
  hasNewMessages(): boolean {
    const userSegments = this.findUserSegments();
    const currentCount = userSegments.length;
    const cachedCount = this.getCachedPrompts().length;

    return currentCount > cachedCount;
  }
}
