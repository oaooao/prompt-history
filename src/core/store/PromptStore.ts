/**
 * Prompt 数据存储
 * 管理所有提取到的 Prompts，提供查询、过滤、搜索功能
 */

import { Prompt, PromptFilterOptions } from '@/types/Prompt';
import { EventType } from '@/types/Events';
import { EventBus } from '@/core/events/EventBus';
import { Logger } from '@/utils/logger';

export class PromptStore {
  /** 所有 Prompts */
  private prompts: Prompt[] = [];
  /** 过滤后的 Prompts */
  private filteredPrompts: Prompt[] = [];
  /** 当前过滤选项 */
  private filterOptions: PromptFilterOptions = {};
  /** 事件总线 */
  private eventBus: EventBus;
  /** 是否自动去重 */
  private autoDeduplicate = true;

  constructor() {
    this.eventBus = EventBus.getInstance();
  }

  /**
   * 设置 Prompts
   */
  setPrompts(prompts: Prompt[]): void {
    Logger.info('PromptStore', `Setting ${prompts.length} prompts`);

    // 去重
    const deduplicated = this.autoDeduplicate
      ? this.deduplicate(prompts)
      : prompts;

    this.prompts = deduplicated;
    this.applyFilters();
    this.notifyUpdate();
  }

  /**
   * 添加 Prompts
   */
  addPrompts(newPrompts: Prompt[]): void {
    Logger.info('PromptStore', `Adding ${newPrompts.length} new prompts`);

    if (this.autoDeduplicate) {
      // 去重后添加
      const deduplicated = this.deduplicate([...this.prompts, ...newPrompts]);
      this.prompts = deduplicated;
    } else {
      this.prompts.push(...newPrompts);
    }

    this.applyFilters();
    this.notifyUpdate();
  }

  /**
   * 清空所有 Prompts
   */
  clear(): void {
    Logger.info('PromptStore', 'Clearing all prompts');
    this.prompts = [];
    this.filteredPrompts = [];
    this.filterOptions = {};
    this.notifyUpdate();
  }

  /**
   * 获取所有 Prompts
   */
  getAll(): Prompt[] {
    return [...this.prompts];
  }

  /**
   * 获取过滤后的 Prompts
   */
  getFiltered(): Prompt[] {
    return [...this.filteredPrompts];
  }

  /**
   * 根据 ID 获取 Prompt
   */
  getById(id: string): Prompt | undefined {
    return this.prompts.find((p) => p.id === id);
  }

  /**
   * 获取 Prompts 数量
   */
  getCount(): number {
    return this.prompts.length;
  }

  /**
   * 获取过滤后的数量
   */
  getFilteredCount(): number {
    return this.filteredPrompts.length;
  }

  /**
   * 设置过滤选项
   */
  setFilter(options: PromptFilterOptions): void {
    Logger.info('PromptStore', 'Setting filter options', options);
    this.filterOptions = { ...options };
    this.applyFilters();
    this.notifyUpdate();
  }

  /**
   * 清除过滤
   */
  clearFilter(): void {
    Logger.info('PromptStore', 'Clearing filters');
    this.filterOptions = {};
    this.applyFilters();
    this.notifyUpdate();
  }

  /**
   * 搜索 Prompts
   */
  search(query: string): Prompt[] {
    if (!query || query.trim().length === 0) {
      return this.getFiltered();
    }

    const lowerQuery = query.toLowerCase();
    return this.filteredPrompts.filter((prompt) =>
      prompt.content.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 应用过滤条件
   */
  private applyFilters(): void {
    let result = [...this.prompts];

    // 搜索关键词过滤
    if (this.filterOptions.searchQuery) {
      const query = this.filterOptions.searchQuery.toLowerCase();
      result = result.filter((p) => p.content.toLowerCase().includes(query));
    }

    // 时间范围过滤
    if (this.filterOptions.startTime) {
      result = result.filter((p) => p.timestamp >= this.filterOptions.startTime!);
    }
    if (this.filterOptions.endTime) {
      result = result.filter((p) => p.timestamp <= this.filterOptions.endTime!);
    }

    // 长度过滤
    if (this.filterOptions.minLength) {
      result = result.filter(
        (p) => p.content.length >= this.filterOptions.minLength!
      );
    }
    if (this.filterOptions.maxLength) {
      result = result.filter(
        (p) => p.content.length <= this.filterOptions.maxLength!
      );
    }

    this.filteredPrompts = result;
  }

  /**
   * 去重
   */
  private deduplicate(prompts: Prompt[]): Prompt[] {
    const seen = new Set<string>();
    const result: Prompt[] = [];

    for (const prompt of prompts) {
      const key = prompt.content.trim();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(prompt);
      }
    }

    Logger.debug(
      'PromptStore',
      `Deduplicated: ${prompts.length} -> ${result.length}`
    );

    return result;
  }

  /**
   * 通知更新
   */
  private notifyUpdate(): void {
    this.eventBus.emit(EventType.PROMPTS_UPDATED, this.filteredPrompts);
  }

  /**
   * 启用/禁用自动去重
   */
  setAutoDeduplicate(enabled: boolean): void {
    this.autoDeduplicate = enabled;
  }

  /**
   * 按时间戳排序
   */
  sortByTime(ascending = true): void {
    this.prompts.sort((a, b) =>
      ascending ? a.timestamp - b.timestamp : b.timestamp - a.timestamp
    );
    this.applyFilters();
    this.notifyUpdate();
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number;
    filtered: number;
    avgLength: number;
    minLength: number;
    maxLength: number;
  } {
    const lengths = this.prompts.map((p) => p.content.length);
    return {
      total: this.prompts.length,
      filtered: this.filteredPrompts.length,
      avgLength: lengths.length
        ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
        : 0,
      minLength: lengths.length ? Math.min(...lengths) : 0,
      maxLength: lengths.length ? Math.max(...lengths) : 0,
    };
  }
}
