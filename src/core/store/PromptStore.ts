/**
 * Prompt 数据存储
 * 管理所有提取到的 Prompts，提供查询、过滤、搜索功能
 */

import { Prompt, PromptFilterOptions } from '@/types/Prompt';
import { EventType } from '@/types/Events';
import { EventBus } from '@/core/events/EventBus';
import { Logger } from '@/utils/logger';
import type { MergeOptions } from '@/types/Extraction';

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
  private autoDeduplicate = false;

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
   * 添加 Prompts（完全不去重，直接追加）
   */
  addPrompts(newPrompts: Prompt[]): void {
    Logger.info('PromptStore', `Adding ${newPrompts.length} new prompts`);

    // 直接追加，不进行任何去重处理
    this.prompts = [...this.prompts, ...newPrompts];

    this.applyFilters();
    this.notifyUpdate();
  }

  /**
   * 智能合并 Prompts
   *
   * 关键特性：
   * - 基于内容去重，避免重复
   * - 可选时间窗口内去重（防止短时间内重复提取）
   * - 保留原有数据，只添加新内容
   * - 避免空数组覆盖问题
   *
   * @param newPrompts 新提取的 Prompts
   * @param options 合并选项
   */
  mergePrompts(newPrompts: Prompt[], options: MergeOptions = {}): void {
    const {
      deduplicate = true,
      timeWindow = 60 * 1000, // 默认 60 秒窗口
      preserveOrder = true,
    } = options;

    Logger.info(
      'PromptStore',
      `Merging ${newPrompts.length} prompts (dedupe: ${deduplicate}, window: ${timeWindow}ms)`
    );

    // 如果新数据为空，保持原有数据不变（关键：避免空数组覆盖）
    if (newPrompts.length === 0) {
      Logger.debug('PromptStore', 'New prompts empty, keeping existing data');
      return;
    }

    // 如果当前数据为空，直接使用新数据
    if (this.prompts.length === 0) {
      Logger.debug('PromptStore', 'Current prompts empty, using new data');
      this.prompts = deduplicate ? this.deduplicate(newPrompts) : newPrompts;
      this.applyFilters();
      this.notifyUpdate();
      return;
    }

    // 智能合并：去重 + 保留原有数据
    let merged: Prompt[];

    if (deduplicate) {
      // 创建内容指纹映射（content + 时间窗口）
      const existingFingerprints = new Map<string, Prompt>();

      for (const prompt of this.prompts) {
        const key = this.createFingerprint(prompt, timeWindow);
        existingFingerprints.set(key, prompt);
      }

      // 过滤新数据：只保留不重复的
      const uniqueNew: Prompt[] = [];
      for (const newPrompt of newPrompts) {
        const key = this.createFingerprint(newPrompt, timeWindow);

        // 检查是否在时间窗口内重复
        const existing = existingFingerprints.get(key);
        if (!existing) {
          uniqueNew.push(newPrompt);
          existingFingerprints.set(key, newPrompt);
        } else if (timeWindow > 0) {
          // 如果设置了时间窗口，检查时间差
          const timeDiff = Math.abs(newPrompt.timestamp - existing.timestamp);
          if (timeDiff >= timeWindow) {
            uniqueNew.push(newPrompt);
            // 更新指纹（使用新的时间戳）
            existingFingerprints.set(key, newPrompt);
          }
        }
      }

      // 合并：保留原有 + 添加唯一新数据
      if (preserveOrder) {
        // 保持原有顺序，新数据追加到后面
        merged = [...this.prompts, ...uniqueNew];
      } else {
        // 按时间戳排序（最新的在前）
        merged = [...this.prompts, ...uniqueNew].sort(
          (a, b) => b.timestamp - a.timestamp
        );
      }

      Logger.debug(
        'PromptStore',
        `Merge result: ${this.prompts.length} existing + ${uniqueNew.length} unique new = ${merged.length} total`
      );
    } else {
      // 不去重，直接合并
      merged = [...this.prompts, ...newPrompts];
      Logger.debug(
        'PromptStore',
        `Merge result (no dedup): ${merged.length} total`
      );
    }

    this.prompts = merged;
    this.applyFilters();
    this.notifyUpdate();
  }

  /**
   * 创建 Prompt 指纹（用于去重）
   *
   * 策略：
   * - 基础指纹：trim 后的内容
   * - 时间窗口：如果设置，将时间戳舍入到窗口内
   *
   * @param prompt Prompt 对象
   * @param timeWindow 时间窗口（毫秒），0 表示不考虑时间
   * @returns 指纹字符串
   */
  private createFingerprint(prompt: Prompt, timeWindow: number): string {
    const contentKey = prompt.content.trim();

    if (timeWindow === 0) {
      // 不考虑时间，只用内容
      return contentKey;
    }

    // 将时间戳舍入到时间窗口
    const roundedTime = Math.floor(prompt.timestamp / timeWindow) * timeWindow;
    return `${contentKey}::${roundedTime}`;
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
   * 智能合并：只在时间窗口内的相同内容才去重
   * @param existing 已有的 Prompts
   * @param newPrompts 新的 Prompts
   * @param timeWindow 时间窗口（毫秒），默认 60 秒
   * @deprecated 已停用，保留供未来可选使用
   */
  // @ts-expect-error - Deprecated method, kept for potential future use
  private smartMerge(
    existing: Prompt[],
    newPrompts: Prompt[],
    timeWindow = 60 * 1000
  ): Prompt[] {
    const result = [...existing];

    for (const newPrompt of newPrompts) {
      // 检查是否是时间窗口内的重复
      const isDuplicate = result.some(
        (p) =>
          p.content.trim() === newPrompt.content.trim() &&
          Math.abs(p.timestamp - newPrompt.timestamp) < timeWindow
      );

      if (!isDuplicate) {
        result.push(newPrompt);
      }
    }

    Logger.debug(
      'PromptStore',
      `Smart merge: ${existing.length} + ${newPrompts.length} -> ${result.length}`
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
