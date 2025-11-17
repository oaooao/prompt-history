/**
 * ChatGPT Prompt 提取器
 * 从 ChatGPT 页面的 DOM 中提取用户的 Prompts
 */

import { BaseExtractor } from '@/core/extractor/BaseExtractor';
import { Prompt, PromptSource } from '@/types/Prompt';
import { CHATGPT_CONFIG } from '@/config/platforms';
import { Logger } from '@/utils/logger';

export class ChatGPTExtractor extends BaseExtractor {
  constructor() {
    super(CHATGPT_CONFIG);
  }

  /**
   * 提取 Prompts
   */
  async extract(): Promise<Prompt[]> {
    try {
      Logger.info('ChatGPTExtractor', 'Starting extraction');

      const articles = this.findArticles();
      Logger.debug('ChatGPTExtractor', `Found ${articles.length} articles`);

      const prompts: Prompt[] = [];

      for (const article of articles) {
        const prompt = this.extractFromArticle(article);
        if (prompt) {
          prompts.push(prompt);
          this.cachePrompt(prompt);
        }
      }

      Logger.info('ChatGPTExtractor', `Extracted ${prompts.length} prompts`);
      return this.sortByTimestamp(prompts);
    } catch (error) {
      this.logError('Extraction failed', error as Error);
      return [];
    }
  }

  /**
   * 查找所有文章元素
   */
  private findArticles(): HTMLElement[] {
    const articles = document.querySelectorAll<HTMLElement>(
      this.config.selectors.articleContainer
    );
    return Array.from(articles);
  }

  /**
   * 从单个文章元素提取 Prompt
   */
  private extractFromArticle(article: HTMLElement): Prompt | null {
    // 检查是否为用户消息
    if (!this.isUserMessage(article)) {
      return null;
    }

    // 提取文本内容
    const content = this.extractText(article);

    // 验证内容
    if (!this.isValidContent(content)) {
      return null;
    }

    // 检查是否重复
    if (this.isDuplicate(content)) {
      return null;
    }

    // 获取时间戳（尝试从 DOM 获取，否则使用当前时间）
    const timestamp = this.extractTimestamp(article) || Date.now();

    // 创建 Prompt 对象
    return this.createPrompt(content, article, PromptSource.DOM, timestamp);
  }

  /**
   * 尝试从文章元素提取时间戳
   */
  private extractTimestamp(article: HTMLElement): number | null {
    try {
      // 尝试从 data 属性获取
      const dataTime = article.dataset['timestamp'] || article.dataset['messageTime'];
      if (dataTime) {
        return parseInt(dataTime, 10);
      }

      // 尝试从 time 元素获取
      const timeElement = article.querySelector('time');
      if (timeElement) {
        const datetime = timeElement.getAttribute('datetime');
        if (datetime) {
          return new Date(datetime).getTime();
        }
      }

      // 无法获取时间戳
      return null;
    } catch (error) {
      Logger.warn('ChatGPTExtractor', 'Failed to extract timestamp', error);
      return null;
    }
  }

  /**
   * 检查是否为用户消息（重写父类方法以适配 ChatGPT）
   */
  protected override isUserMessage(element: Element): boolean {
    // 方法 1：检查标题文本
    const heading = element.querySelector('h5, h6');
    if (heading) {
      const headingText = heading.textContent || '';
      for (const keyword of this.config.selectors.userMessages) {
        if (headingText.includes(keyword)) {
          return true;
        }
      }
    }

    // 方法 2：检查用户气泡颜色 class
    if (this.config.selectors.userBubble) {
      const hasBubble = element.querySelector(this.config.selectors.userBubble);
      if (hasBubble) {
        return true;
      }
    }

    // 方法 3：检查 data 属性
    const messageType = element.getAttribute('data-message-author-role');
    if (messageType === 'user') {
      return true;
    }

    return false;
  }

  /**
   * 快速检查是否有新消息（用于性能优化）
   */
  hasNewMessages(): boolean {
    const articles = this.findArticles();
    const currentCount = articles.filter((a) => this.isUserMessage(a)).length;
    const cachedCount = this.getCachedPrompts().length;

    return currentCount > cachedCount;
  }

  /**
   * 增量提取（只提取新的消息）
   */
  async extractNew(): Promise<Prompt[]> {
    const articles = this.findArticles();
    const newPrompts: Prompt[] = [];

    for (const article of articles) {
      if (!this.isUserMessage(article)) {
        continue;
      }

      const content = this.extractText(article);
      if (!this.isValidContent(content) || this.isDuplicate(content)) {
        continue;
      }

      const timestamp = this.extractTimestamp(article) || Date.now();
      const prompt = this.createPrompt(
        content,
        article,
        PromptSource.DOM,
        timestamp
      );

      newPrompts.push(prompt);
      this.cachePrompt(prompt);
    }

    Logger.info(
      'ChatGPTExtractor',
      `Extracted ${newPrompts.length} new prompts`
    );
    return newPrompts;
  }
}
