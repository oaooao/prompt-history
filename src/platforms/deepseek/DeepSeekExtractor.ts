/**
 * DeepSeek Prompt 提取器
 * 从 DeepSeek 页面的 DOM 中提取用户的 Prompts
 */

import { BaseExtractor } from '@/core/extractor/BaseExtractor';
import { Prompt, PromptSource } from '@/types/Prompt';
import { DEEPSEEK_CONFIG } from '@/config/platforms';
import { Logger } from '@/utils/logger';

export class DeepSeekExtractor extends BaseExtractor {
  constructor() {
    super(DEEPSEEK_CONFIG);
  }

  /**
   * 提取 Prompts
   */
  async extract(): Promise<Prompt[]> {
    try {
      Logger.info('DeepSeekExtractor', 'Starting extraction');

      const userMessages = this.findUserMessages();
      Logger.debug('DeepSeekExtractor', `Found ${userMessages.length} user messages`);

      const prompts: Prompt[] = [];
      let domIndex = 0;

      for (const msgElement of userMessages) {
        const prompt = this.extractFromMessage(msgElement, domIndex);
        if (prompt) {
          prompts.push(prompt);
          this.cachePrompt(prompt);
          domIndex++;
        }
      }

      Logger.info('DeepSeekExtractor', `Extracted ${prompts.length} prompts`);
      return this.sortByTimestamp(prompts);
    } catch (error) {
      this.logError('Extraction failed', error as Error);
      return [];
    }
  }

  /**
   * 查找所有用户消息元素
   */
  private findUserMessages(): HTMLElement[] {
    // 使用 data-um-id 属性查找用户消息
    const messages = document.querySelectorAll<HTMLElement>(
      this.config.selectors.articleContainer
    );
    return Array.from(messages);
  }

  /**
   * 从用户消息元素提取内容
   * @param msgElement - 消息容器元素
   * @param domIndex - DOM 遍历位置索引
   */
  private extractFromMessage(msgElement: HTMLElement, domIndex: number): Prompt | null {
    const { userMessageText } = this.config.selectors;

    if (!userMessageText) {
      Logger.error('DeepSeekExtractor', 'Missing userMessageText in config');
      return null;
    }

    // 查找用户消息文本容器
    const textContainer = msgElement.querySelector(userMessageText);

    if (!textContainer) {
      Logger.warn('DeepSeekExtractor', 'Text container not found in message');
      return null;
    }

    // 提取文本内容（自动过滤 ignoredTags 和 ignoredClasses）
    const content = this.extractTextWithClassFilter(textContainer as HTMLElement);

    // 验证内容
    if (!this.isValidContent(content)) {
      return null;
    }

    // 检查是否重复
    if (this.isDuplicate(content)) {
      return null;
    }

    // DeepSeek 不提供时间戳，使用当前时间
    const timestamp = Date.now();

    // 创建 Prompt 对象
    return this.createPrompt(
      content,
      textContainer as HTMLElement,
      PromptSource.DOM,
      domIndex,
      timestamp
    );
  }

  /**
   * 提取文本内容并过滤忽略的类名
   */
  private extractTextWithClassFilter(element: HTMLElement): string {
    // 克隆元素以避免修改原 DOM
    const clone = element.cloneNode(true) as HTMLElement;

    // 移除需要忽略的标签
    const { ignoredTags, ignoredClasses } = this.config.selectors;

    // 移除忽略的标签
    ignoredTags.forEach(tag => {
      clone.querySelectorAll(tag).forEach(el => el.remove());
    });

    // 移除忽略的类名元素
    if (ignoredClasses && ignoredClasses.length > 0) {
      ignoredClasses.forEach(className => {
        clone.querySelectorAll(`.${className}`).forEach(el => el.remove());
      });
    }

    // 移除所有图标类元素
    clone.querySelectorAll('[class*="icon"]').forEach(el => el.remove());

    return clone.textContent?.trim() || '';
  }

  /**
   * 增量提取（只提取新的消息）
   */
  async extractNew(): Promise<Prompt[]> {
    const userMessages = this.findUserMessages();
    const newPrompts: Prompt[] = [];
    let domIndex = 0;

    for (const msgElement of userMessages) {
      const { userMessageText } = this.config.selectors;

      if (!userMessageText) {
        continue;
      }

      const textContainer = msgElement.querySelector(userMessageText);
      if (!textContainer) {
        continue;
      }

      const content = this.extractTextWithClassFilter(textContainer as HTMLElement);
      if (!this.isValidContent(content) || this.isDuplicate(content)) {
        continue;
      }

      const timestamp = Date.now();
      const prompt = this.createPrompt(
        content,
        textContainer as HTMLElement,
        PromptSource.DOM,
        domIndex,
        timestamp
      );

      newPrompts.push(prompt);
      this.cachePrompt(prompt);
      domIndex++;
    }

    Logger.info('DeepSeekExtractor', `Extracted ${newPrompts.length} new prompts`);
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
