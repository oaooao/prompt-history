/**
 * 提取器抽象基类
 * 提供通用的 Prompt 提取逻辑
 */

import { Prompt, PromptSource } from '@/types/Prompt';
import { PlatformConfig } from '@/types/Platform';
import { extractTextContent } from '@/utils/dom';
import { Logger } from '@/utils/logger';

export abstract class BaseExtractor {
  /** 平台配置 */
  protected config: PlatformConfig;
  /** 已提取的 Prompts 缓存 */
  protected extractedPrompts: Map<string, Prompt> = new Map();

  constructor(config: PlatformConfig) {
    this.config = config;
  }

  /**
   * 提取 Prompts（子类必须实现）
   */
  abstract extract(): Promise<Prompt[]>;

  /**
   * 从 DOM 元素提取文本
   */
  protected extractText(element: Element): string {
    return extractTextContent(element, this.config.selectors.ignoredTags);
  }

  /**
   * 生成 Prompt ID
   */
  protected generatePromptId(content: string, timestamp?: number): string {
    const time = timestamp || Date.now();
    const hash = this.simpleHash(content);
    return `prompt_${time}_${hash}`;
  }

  /**
   * 简单哈希函数
   */
  protected simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 检查内容是否已存在
   */
  protected isDuplicate(content: string): boolean {
    for (const prompt of this.extractedPrompts.values()) {
      if (prompt.content === content) {
        return true;
      }
    }
    return false;
  }

  /**
   * 添加到缓存
   */
  protected cachePrompt(prompt: Prompt): void {
    this.extractedPrompts.set(prompt.id, prompt);
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.extractedPrompts.clear();
  }

  /**
   * 获取缓存的 Prompts
   */
  getCachedPrompts(): Prompt[] {
    return Array.from(this.extractedPrompts.values());
  }

  /**
   * 创建 Prompt 对象
   */
  protected createPrompt(
    content: string,
    element: HTMLElement | null,
    source: PromptSource,
    timestamp?: number
  ): Prompt {
    const id = this.generatePromptId(content, timestamp);
    return {
      id,
      content: content.trim(),
      timestamp: timestamp || Date.now(),
      element,
      source,
      visible: true,
    };
  }

  /**
   * 检查元素是否为用户消息
   */
  protected isUserMessage(element: Element): boolean {
    const { userMessages } = this.config.selectors;

    // 方法 1：检查标题文本
    const heading = element.querySelector('h5, h6, [class*="heading"]');
    if (heading) {
      const headingText = heading.textContent || '';
      for (const keyword of userMessages) {
        if (headingText.includes(keyword)) {
          return true;
        }
      }
    }

    // 方法 2：检查特定 class（如果配置了）
    if (this.config.selectors.userBubble) {
      const hasBubble = element.querySelector(this.config.selectors.userBubble);
      if (hasBubble) {
        return true;
      }
    }

    return false;
  }

  /**
   * 过滤无效内容
   */
  protected isValidContent(content: string): boolean {
    if (!content || content.length < 2) {
      return false;
    }

    // 过滤纯空白字符
    if (/^\s*$/.test(content)) {
      return false;
    }

    return true;
  }

  /**
   * 去重并合并新旧 Prompts
   */
  protected deduplicateAndMerge(
    newPrompts: Prompt[],
    existingPrompts: Prompt[] = []
  ): Prompt[] {
    const contentSet = new Set<string>();
    const result: Prompt[] = [];

    // 先添加现有的
    for (const prompt of existingPrompts) {
      if (!contentSet.has(prompt.content)) {
        contentSet.add(prompt.content);
        result.push(prompt);
      }
    }

    // 再添加新的（去重）
    for (const prompt of newPrompts) {
      if (!contentSet.has(prompt.content) && this.isValidContent(prompt.content)) {
        contentSet.add(prompt.content);
        result.push(prompt);
      }
    }

    return result;
  }

  /**
   * 按时间戳排序
   */
  protected sortByTimestamp(prompts: Prompt[]): Prompt[] {
    return [...prompts].sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 日志辅助方法
   */
  protected log(message: string, ...args: any[]): void {
    Logger.info('BaseExtractor', message, ...args);
  }

  protected logError(message: string, error: Error): void {
    Logger.error('BaseExtractor', message, error);
  }
}
