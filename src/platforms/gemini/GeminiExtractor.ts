/**
 * Gemini Prompt 提取器
 * 从 Gemini 页面的 DOM 中提取用户的 Prompts
 */

import { BaseExtractor } from '@/core/extractor/BaseExtractor';
import { Prompt, PromptSource } from '@/types/Prompt';
import { GEMINI_CONFIG } from '@/config/platforms';
import { Logger } from '@/utils/logger';

export class GeminiExtractor extends BaseExtractor {
  constructor() {
    super(GEMINI_CONFIG);
  }

  /**
   * 提取 Prompts
   */
  async extract(): Promise<Prompt[]> {
    try {
      Logger.info('GeminiExtractor', 'Starting extraction');

      const containers = this.findConversationContainers();
      Logger.debug('GeminiExtractor', `Found ${containers.length} conversation containers`);

      const prompts: Prompt[] = [];

      for (const container of containers) {
        const prompt = this.extractFromContainer(container);
        if (prompt) {
          prompts.push(prompt);
          this.cachePrompt(prompt);
        }
      }

      Logger.info('GeminiExtractor', `Extracted ${prompts.length} prompts`);
      return this.sortByTimestamp(prompts);
    } catch (error) {
      this.logError('Extraction failed', error as Error);
      return [];
    }
  }

  /**
   * 查找所有对话容器
   */
  private findConversationContainers(): HTMLElement[] {
    const containers = document.querySelectorAll<HTMLElement>(
      this.config.selectors.articleContainer
    );
    return Array.from(containers);
  }

  /**
   * 从对话容器提取用户消息
   */
  private extractFromContainer(container: HTMLElement): Prompt | null {
    const { userQueryElement, userQueryText } = this.config.selectors;

    if (!userQueryElement || !userQueryText) {
      Logger.error(
        'GeminiExtractor',
        'Missing userQueryElement or userQueryText in config'
      );
      return null;
    }

    // 使用最干净的选择器提取用户消息
    const userQuery = container.querySelector(
      `${userQueryElement} ${userQueryText}`
    );

    if (!userQuery) {
      // 可能是 AI 回复的容器，跳过
      return null;
    }

    // 提取文本内容（自动过滤 ignoredTags）
    const content = this.extractText(userQuery);

    // 验证内容
    if (!this.isValidContent(content)) {
      return null;
    }

    // 检查是否重复
    if (this.isDuplicate(content)) {
      return null;
    }

    // 获取时间戳
    const timestamp = this.extractTimestamp(container) || Date.now();

    // 创建 Prompt 对象
    return this.createPrompt(
      content,
      userQuery as HTMLElement,
      PromptSource.DOM,
      timestamp
    );
  }

  /**
   * 尝试从容器提取时间戳
   */
  private extractTimestamp(container: HTMLElement): number | null {
    try {
      // 尝试从 container ID 提取（Gemini 的 ID 可能包含时间信息）
      // 如果无法提取，返回 null，让调用方使用当前时间

      // 尝试从 data 属性获取
      const dataTime = container.dataset['timestamp'] || container.dataset['messageTime'];
      if (dataTime) {
        return parseInt(dataTime, 10);
      }

      // 尝试从 time 元素获取
      const timeElement = container.querySelector('time');
      if (timeElement) {
        const datetime = timeElement.getAttribute('datetime');
        if (datetime) {
          return new Date(datetime).getTime();
        }
      }

      // 无法获取时间戳
      return null;
    } catch (error) {
      Logger.warn('GeminiExtractor', 'Failed to extract timestamp', error);
      return null;
    }
  }

  /**
   * 快速检查是否有新消息（用于性能优化）
   */
  hasNewMessages(): boolean {
    const containers = this.findConversationContainers();

    // 统计包含用户消息的容器数量
    let userMessageCount = 0;
    const { userQueryElement, userQueryText } = this.config.selectors;

    if (!userQueryElement || !userQueryText) {
      return false;
    }

    for (const container of containers) {
      const userQuery = container.querySelector(
        `${userQueryElement} ${userQueryText}`
      );
      if (userQuery) {
        userMessageCount++;
      }
    }

    const cachedCount = this.getCachedPrompts().length;

    return userMessageCount > cachedCount;
  }

  /**
   * 增量提取（只提取新的消息）
   */
  async extractNew(): Promise<Prompt[]> {
    const containers = this.findConversationContainers();
    const newPrompts: Prompt[] = [];
    const { userQueryElement, userQueryText } = this.config.selectors;

    if (!userQueryElement || !userQueryText) {
      Logger.error(
        'GeminiExtractor',
        'Missing userQueryElement or userQueryText in config'
      );
      return [];
    }

    for (const container of containers) {
      const userQuery = container.querySelector(
        `${userQueryElement} ${userQueryText}`
      );

      if (!userQuery) {
        continue;
      }

      const content = this.extractText(userQuery);
      if (!this.isValidContent(content) || this.isDuplicate(content)) {
        continue;
      }

      const timestamp = this.extractTimestamp(container) || Date.now();

      const prompt = this.createPrompt(
        content,
        userQuery as HTMLElement,
        PromptSource.DOM,
        timestamp
      );

      newPrompts.push(prompt);
      this.cachePrompt(prompt);
    }

    Logger.info('GeminiExtractor', `Extracted ${newPrompts.length} new prompts`);
    return newPrompts;
  }
}
