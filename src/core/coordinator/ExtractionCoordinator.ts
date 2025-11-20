/**
 * 提取协调器
 * 统一管理 Prompt 提取流程，优雅处理并发和重入问题
 */

import type { Prompt } from '@/types/Prompt';
import type { IPlatformAdapter } from '@/types/Platform';
import type { PromptStore } from '@/core/store/PromptStore';
import {
  ExtractionState,
  ExtractionStrategy,
  ExtractionError,
  ExtractionErrorCode,
  type ExtractionOptions,
  type ExtractionResult,
} from '@/types/Extraction';
import { Logger } from '@/utils/logger';

/**
 * ExtractionCoordinator 协调器
 *
 * 核心职责：
 * 1. 管理提取状态，防止并发冲突
 * 2. 使用 Promise Queue 模式优雅处理重入
 * 3. 支持多种提取策略（全量/增量/视口）
 * 4. 智能合并数据到 Store
 */
export class ExtractionCoordinator {
  /** 当前提取状态 */
  private state: ExtractionState = ExtractionState.IDLE;

  /** 当前正在执行的提取 Promise（用于 Queue 模式） */
  private currentExtraction: Promise<Prompt[]> | null = null;

  /** 上次提取的时间戳 */
  private lastExtractionTime: number = 0;

  /** 上次提取的结果缓存 */
  private lastResult: Prompt[] = [];

  /** 平台适配器 */
  private adapter: IPlatformAdapter;

  /** 数据存储 */
  private store: PromptStore;

  constructor(adapter: IPlatformAdapter, store: PromptStore) {
    this.adapter = adapter;
    this.store = store;
  }

  /**
   * 执行提取（主入口）
   *
   * Promise Queue 模式：
   * - 如果已有提取正在进行，返回同一个 Promise（避免重复工作）
   * - 否则创建新的提取 Promise
   *
   * @param options 提取选项
   * @returns 提取结果
   */
  async extract(options?: ExtractionOptions): Promise<ExtractionResult> {
    const startTime = Date.now();
    const strategy = options?.strategy || ExtractionStrategy.FULL;

    // 重入保护：如果正在提取，返回同一个 Promise
    if (
      this.state === ExtractionState.EXTRACTING &&
      this.currentExtraction
    ) {
      Logger.info(
        'ExtractionCoordinator',
        '⏳ Extraction already in progress, queuing request...'
      );

      try {
        const prompts = await this.currentExtraction;
        return {
          prompts,
          source: 'queued',
          isIncremental: strategy === ExtractionStrategy.INCREMENTAL,
          duration: Date.now() - startTime,
          timestamp: Date.now(),
        };
      } catch (error) {
        throw new ExtractionError(
          'Queued extraction failed',
          ExtractionErrorCode.UNKNOWN,
          error as Error
        );
      }
    }

    // 检查是否可以使用缓存
    if (!options?.force && this.canUseCache(strategy)) {
      Logger.info(
        'ExtractionCoordinator',
        '📦 Using cached extraction result'
      );
      return {
        prompts: this.lastResult,
        source: 'cached',
        isIncremental: false,
        duration: 0,
        timestamp: this.lastExtractionTime,
      };
    }

    // 开始新的提取
    this.state = ExtractionState.EXTRACTING;
    this.currentExtraction = this.executeExtraction(options);

    try {
      const prompts = await this.currentExtraction;
      this.state = ExtractionState.COMPLETED;
      this.lastExtractionTime = Date.now();
      this.lastResult = prompts;

      // 根据策略决定如何更新 Store
      this.updateStore(prompts, strategy, options?.silent);

      Logger.info(
        'ExtractionCoordinator',
        `✅ Extraction completed: ${prompts.length} prompts (${strategy})`
      );

      return {
        prompts,
        source: 'fresh',
        isIncremental: strategy === ExtractionStrategy.INCREMENTAL,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      };
    } catch (error) {
      this.state = ExtractionState.ERROR;
      Logger.error(
        'ExtractionCoordinator',
        'Extraction failed',
        error as Error
      );

      throw new ExtractionError(
        'Extraction failed',
        ExtractionErrorCode.UNKNOWN,
        error as Error
      );
    } finally {
      this.currentExtraction = null;
      // 如果出错或完成，在一段时间后重置为 IDLE
      setTimeout(() => {
        if (this.state !== ExtractionState.EXTRACTING) {
          this.state = ExtractionState.IDLE;
        }
      }, 1000);
    }
  }

  /**
   * 执行实际的提取操作
   */
  private async executeExtraction(
    options?: ExtractionOptions
  ): Promise<Prompt[]> {
    const timeout = options?.timeout || 10000;
    const strategy = options?.strategy || ExtractionStrategy.FULL;

    // 创建超时 Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new ExtractionError(
            `Extraction timeout after ${timeout}ms`,
            ExtractionErrorCode.TIMEOUT
          )
        );
      }, timeout);
    });

    // 根据策略选择提取方法
    let extractionPromise: Promise<Prompt[]>;

    switch (strategy) {
      case ExtractionStrategy.FULL:
        extractionPromise = this.adapter.extractPrompts();
        break;

      case ExtractionStrategy.INCREMENTAL:
        // TODO: 未来实现增量提取逻辑
        // 目前先回退到全量提取
        Logger.warn(
          'ExtractionCoordinator',
          'Incremental extraction not yet implemented, falling back to FULL'
        );
        extractionPromise = this.adapter.extractPrompts();
        break;

      case ExtractionStrategy.VIEWPORT:
        // TODO: 未来实现视口提取逻辑
        // 目前先回退到全量提取
        Logger.warn(
          'ExtractionCoordinator',
          'Viewport extraction not yet implemented, falling back to FULL'
        );
        extractionPromise = this.adapter.extractPrompts();
        break;

      default:
        extractionPromise = this.adapter.extractPrompts();
    }

    // 竞速：提取 vs 超时
    return Promise.race([extractionPromise, timeoutPromise]);
  }

  /**
   * 根据策略更新 Store
   */
  private updateStore(
    prompts: Prompt[],
    strategy: ExtractionStrategy,
    silent?: boolean
  ): void {
    if (silent) {
      // 静默模式：不更新 Store
      return;
    }

    switch (strategy) {
      case ExtractionStrategy.FULL:
        // 全量提取：全量替换（不去重）
        // 关键：只有在有数据时才更新，避免空数组覆盖
        if (prompts.length > 0) {
          this.store.setPrompts(prompts);
        }
        // 如果是空数组，保持现有数据不变（避免原始 bug）
        break;

      case ExtractionStrategy.INCREMENTAL:
        // 增量提取：追加新数据（不去重）
        if (prompts.length > 0) {
          this.store.addPrompts(prompts);
        }
        break;

      case ExtractionStrategy.VIEWPORT:
        // 视口提取：不更新 Store（仅用于临时查看）
        break;
    }
  }

  /**
   * 检查是否可以使用缓存
   *
   * 缓存策略：
   * - 全量提取：5 秒内可复用
   * - 增量提取：不使用缓存
   * - 视口提取：不使用缓存
   */
  private canUseCache(strategy: ExtractionStrategy): boolean {
    if (strategy !== ExtractionStrategy.FULL) {
      return false;
    }

    const CACHE_TTL = 5000; // 5 秒
    const elapsed = Date.now() - this.lastExtractionTime;
    return elapsed < CACHE_TTL && this.lastResult.length > 0;
  }

  /**
   * 获取当前状态
   */
  getState(): ExtractionState {
    return this.state;
  }

  /**
   * 检查是否正在提取
   */
  isExtracting(): boolean {
    return this.state === ExtractionState.EXTRACTING;
  }

  /**
   * 重置状态（用于测试或错误恢复）
   */
  reset(): void {
    this.state = ExtractionState.IDLE;
    this.currentExtraction = null;
    this.lastExtractionTime = 0;
    this.lastResult = [];
    Logger.debug('ExtractionCoordinator', 'State reset');
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.lastExtractionTime = 0;
    this.lastResult = [];
    Logger.debug('ExtractionCoordinator', 'Cache cleared');
  }
}
