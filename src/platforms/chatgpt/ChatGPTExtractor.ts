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
        // 使用新方法过滤用户消息
        if (!this.isUserPrompt(article)) {
          continue;
        }

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
   * 注意：调用方已通过 isUserPrompt() 过滤，此处不再重复检查
   */
  private extractFromArticle(article: HTMLElement): Prompt | null {
    // 查找真正的用户消息元素（而不是整个 article 容器）
    // 优先从消息气泡提取，避免包含 UI 标签（如 <h5>You said:</h5>）
    const messageElement =
      article.querySelector('.user-message-bubble-color') ||
      article.querySelector('[data-message-author-role="user"]') ||
      article; // fallback 到 article

    // 从消息元素提取文本内容
    const content = this.extractText(messageElement as HTMLElement);

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
    return this.createPrompt(
      content,
      messageElement as HTMLElement,
      PromptSource.DOM,
      timestamp
    );
  }

  /**
   * 尝试从文章元素提取时间戳
   */
  private extractTimestamp(article: HTMLElement): number | null {
    try {
      // 尝试从 data 属性获取
      const dataTime =
        article.dataset['timestamp'] || article.dataset['messageTime'];
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
   * 判断 article 元素是否为用户 Prompt（ChatGPT 专用）
   * 优先级：article data-turn > 内部 data-message-author-role > CSS 类 > 文本兜底
   */
  private isUserPrompt(article: Element): boolean {
    // 优先级 1: 检查 article 的 data-turn 属性（最可靠）
    const dataTurn = article.getAttribute('data-turn');
    if (dataTurn === 'user') {
      return true;
    }

    // 优先级 2: 检查内部的 data-message-author-role 属性
    const messageDiv = article.querySelector(
      '[data-message-author-role="user"]'
    );
    if (messageDiv) {
      return true;
    }

    // 优先级 3: 检查 CSS 类名
    if (article.querySelector('.user-message-bubble-color')) {
      return true;
    }

    // 优先级 4: 文本兜底（支持多语言）
    const heading = article.querySelector('h5, h6');
    if (heading) {
      const headingText = heading.textContent || '';
      for (const keyword of this.config.selectors.userMessages) {
        if (headingText.includes(keyword)) {
          Logger.debug(
            'ChatGPTExtractor',
            `⚠️ Using text fallback detection: "${keyword}"`
          );
          return true;
        }
      }
    }

    return false;
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
    const currentCount = articles.filter((a) => this.isUserPrompt(a)).length;
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
      // 使用新方法过滤用户消息
      if (!this.isUserPrompt(article)) {
        continue;
      }

      // 查找真正的用户消息元素（而不是整个 article 容器）
      // 优先从消息气泡提取，避免包含 UI 标签（如 <h5>You said:</h5>）
      const messageElement =
        article.querySelector('.user-message-bubble-color') ||
        article.querySelector('[data-message-author-role="user"]') ||
        article; // fallback 到 article

      const content = this.extractText(messageElement as HTMLElement);
      if (!this.isValidContent(content) || this.isDuplicate(content)) {
        continue;
      }

      const timestamp = this.extractTimestamp(article) || Date.now();

      const prompt = this.createPrompt(
        content,
        messageElement as HTMLElement,
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
