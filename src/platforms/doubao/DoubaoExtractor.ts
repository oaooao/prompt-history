/**
 * 豆包（字节跳动）Prompt 提取器
 * 从豆包页面的 DOM 中提取用户的 Prompts
 */

import { BaseExtractor } from '@/core/extractor/BaseExtractor';
import { Prompt, PromptSource } from '@/types/Prompt';
import { DOUBAO_CONFIG } from '@/config/platforms';
import { Logger } from '@/utils/logger';

export class DoubaoExtractor extends BaseExtractor {
  constructor() {
    super(DOUBAO_CONFIG);
  }

  /**
   * 提取 Prompts
   */
  async extract(): Promise<Prompt[]> {
    try {
      Logger.info('DoubaoExtractor', 'Starting extraction');

      const allMessages = this.findAllMessages();
      Logger.debug('DoubaoExtractor', `Found ${allMessages.length} total messages`);

      // 筛选出用户消息（包含 .justify-end 的消息）
      const userMessages = this.filterUserMessages(allMessages);
      Logger.debug('DoubaoExtractor', `Found ${userMessages.length} user messages`);

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

      Logger.info('DoubaoExtractor', `Extracted ${prompts.length} prompts`);
      return this.sortByTimestamp(prompts);
    } catch (error) {
      this.logError('Extraction failed', error as Error);
      return [];
    }
  }

  /**
   * 查找所有消息容器（[data-message-id]）
   */
  private findAllMessages(): HTMLElement[] {
    const messages = document.querySelectorAll<HTMLElement>(
      this.config.selectors.articleContainer
    );
    return Array.from(messages);
  }

  /**
   * 筛选出用户消息
   * 豆包使用 Tailwind 的 .justify-end 类标识用户消息（右对齐）
   */
  private filterUserMessages(messages: HTMLElement[]): HTMLElement[] {
    return messages.filter((msg) => {
      // 检查消息或其父容器是否包含 justify-end 类
      // 用户消息通常右对齐显示
      return (
        msg.classList.contains('justify-end') ||
        msg.querySelector('.justify-end') !== null
      );
    });
  }

  /**
   * 从用户消息容器提取内容
   * @param msgElement - 消息容器元素
   * @param domIndex - DOM 遍历位置索引
   */
  private extractFromMessage(msgElement: HTMLElement, domIndex: number): Prompt | null {
    // 提取消息 ID（用于生成唯一标识）
    const messageId = msgElement.getAttribute('data-message-id');

    if (!messageId) {
      Logger.warn('DoubaoExtractor', 'Message ID not found');
    }

    // 提取文本内容（自动过滤 ignoredTags）
    const content = this.extractText(msgElement);

    // 验证内容
    if (!this.isValidContent(content)) {
      return null;
    }

    // 检查是否重复
    if (this.isDuplicate(content)) {
      return null;
    }

    // 豆包不提供时间戳，使用当前时间
    const timestamp = Date.now();

    // 创建 Prompt 对象
    return this.createPrompt(
      content,
      msgElement,
      PromptSource.DOM,
      domIndex,
      timestamp
    );
  }

  /**
   * 增量提取（只提取新的消息）
   */
  async extractNew(): Promise<Prompt[]> {
    const allMessages = this.findAllMessages();
    const userMessages = this.filterUserMessages(allMessages);
    const newPrompts: Prompt[] = [];
    let domIndex = 0;

    for (const msgElement of userMessages) {
      const content = this.extractText(msgElement);
      if (!this.isValidContent(content) || this.isDuplicate(content)) {
        continue;
      }

      const timestamp = Date.now();
      const prompt = this.createPrompt(
        content,
        msgElement,
        PromptSource.DOM,
        domIndex,
        timestamp
      );

      newPrompts.push(prompt);
      this.cachePrompt(prompt);
      domIndex++;
    }

    Logger.info('DoubaoExtractor', `Extracted ${newPrompts.length} new prompts`);
    return newPrompts;
  }

  /**
   * 快速检查是否有新消息（用于性能优化）
   */
  hasNewMessages(): boolean {
    const allMessages = this.findAllMessages();
    const userMessages = this.filterUserMessages(allMessages);
    const currentCount = userMessages.length;
    const cachedCount = this.getCachedPrompts().length;

    return currentCount > cachedCount;
  }
}
