/**
 * 平台适配器抽象基类
 * 所有平台适配器都必须继承此类
 */

import {
  IPlatformAdapter,
  PlatformType,
  PlatformConfig,
} from '@/types/Platform';
import { Prompt } from '@/types/Prompt';
import { Logger } from '@/utils/logger';

export abstract class PlatformAdapter implements IPlatformAdapter {
  /** 平台名称 */
  abstract readonly name: string;
  /** 平台类型 */
  abstract readonly type: PlatformType;
  /** 平台版本 */
  abstract readonly version: string;

  /** DOM 变化观察器 */
  protected observer: MutationObserver | null = null;
  /** 清理任务列表 */
  protected cleanupTasks: Array<() => void> = [];
  /** 是否已初始化 */
  protected initialized = false;

  /**
   * 检测当前页面是否为该平台
   */
  abstract detect(): boolean;

  /**
   * 提取 Prompts（子类必须实现）
   */
  abstract extractPrompts(): Promise<Prompt[]>;

  /**
   * 获取平台配置（子类必须实现）
   */
  abstract getConfig(): PlatformConfig;

  /**
   * 初始化平台适配器
   */
  initialize(): void {
    if (this.initialized) {
      Logger.warn('PlatformAdapter', 'Already initialized');
      return;
    }

    try {
      Logger.info('PlatformAdapter', `Initializing ${this.name} adapter`);
      this.onInitialize();
      this.initialized = true;
      Logger.info('PlatformAdapter', `${this.name} adapter initialized`);
    } catch (error) {
      Logger.error('PlatformAdapter', 'Initialization failed', error as Error);
      throw error;
    }
  }

  /**
   * 子类可重写的初始化钩子
   */
  protected onInitialize(): void {
    // 子类可以重写此方法
  }

  /**
   * 清理资源
   */
  destroy(): void {
    if (!this.initialized) {
      return;
    }

    try {
      Logger.info('PlatformAdapter', `Destroying ${this.name} adapter`);

      // 停止观察
      this.stopObserving();

      // 执行所有清理任务
      this.cleanupTasks.forEach((task) => {
        try {
          task();
        } catch (error) {
          Logger.error(
            'PlatformAdapter',
            'Cleanup task failed',
            error as Error
          );
        }
      });
      this.cleanupTasks = [];

      // 子类清理钩子
      this.onDestroy();

      this.initialized = false;
      Logger.info('PlatformAdapter', `${this.name} adapter destroyed`);
    } catch (error) {
      Logger.error('PlatformAdapter', 'Destruction failed', error as Error);
    }
  }

  /**
   * 子类可重写的清理钩子
   */
  protected onDestroy(): void {
    // 子类可以重写此方法
  }

  /**
   * 监听 DOM 变化
   */
  observeChanges(
    callback: () => void,
    _options?: { forceInitial?: boolean }
  ): void {
    if (this.observer) {
      this.stopObserving();
    }

    this.observer = new MutationObserver(() => {
      try {
        callback();
      } catch (error) {
        Logger.error(
          'PlatformAdapter',
          'Observer callback failed',
          error as Error
        );
      }
    });

    const targetNode = document.body;

    this.observer.observe(targetNode, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false,
    });

    Logger.info(
      'PlatformAdapter',
      `Started observing DOM changes for ${this.name}`
    );

    // 添加到清理任务
    this.addCleanupTask(() => this.stopObserving());
  }

  /**
   * 停止监听
   */
  stopObserving(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      Logger.info(
        'PlatformAdapter',
        `Stopped observing DOM changes for ${this.name}`
      );
    }
  }

  /**
   * 添加清理任务
   */
  protected addCleanupTask(task: () => void): void {
    this.cleanupTasks.push(task);
  }

  /**
   * 检查是否已初始化
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`${this.name} adapter is not initialized`);
    }
  }

  /**
   * 等待元素出现（辅助方法）
   */
  protected waitForElement(
    selector: string,
    timeout = 10000
  ): Promise<Element> {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * 延迟执行（辅助方法）
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
