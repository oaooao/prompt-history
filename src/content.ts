/**
 * Chrome 扩展主入口文件
 * 负责初始化和协调所有组件
 */

import { PlatformFactory } from '@/platforms/factory';
import { PlatformDetector } from '@/platforms/base/PlatformDetector';
import { PromptStore } from '@/core/store/PromptStore';
import { EventBus } from '@/core/events/EventBus';
import { ExtractionCoordinator } from '@/core/coordinator/ExtractionCoordinator';
import Sidebar from '@/ui/components/Sidebar.svelte';
import { mount, unmount } from 'svelte';
import { Logger, LogLevel } from '@/utils/logger';
import { CONFIG, DEBUG, EXTENSION_NAME, VERSION } from '@/config/constants';
import { IPlatformAdapter } from '@/types/Platform';
import { ExtractionStrategy, type ExtractionOptions } from '@/types/Extraction';

/**
 * 主应用类
 */
class PromptHistoryApp {
  private adapter: IPlatformAdapter | null = null;
  private store: PromptStore;
  private coordinator: ExtractionCoordinator | null = null;
  private sidebar: any = null; // Svelte 组件实例
  private sidebarContainer: HTMLElement | null = null;
  private eventBus: EventBus;
  private initialized = false;
  /** 统一缓存的 DOM 变化处理函数，便于 URL 切换后重新绑定观察器 */
  private domChangeHandler: (() => Promise<void> | void) | null = null;

  constructor() {
    this.store = new PromptStore();
    this.eventBus = EventBus.getInstance();

    // 配置日志级别
    if (DEBUG) {
      Logger.setLevel(LogLevel.DEBUG);
    }
  }

  /**
   * 初始化应用
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      Logger.warn('App', 'Already initialized');
      return;
    }

    try {
      Logger.info('App', `${EXTENSION_NAME} v${VERSION} initializing...`);

      // 1. 检测平台
      const detection = PlatformDetector.detect();
      if (!detection.detected) {
        Logger.warn('App', 'No supported platform detected');
        return;
      }

      Logger.info(
        'App',
        `Detected platform: ${detection.platform} (confidence: ${detection.confidence})`
      );

      // 2. 创建平台适配器
      this.adapter = await PlatformFactory.detectAndCreate();
      this.adapter.initialize();

      // 3. 创建提取协调器
      this.coordinator = new ExtractionCoordinator(this.adapter, this.store);
      Logger.info('App', 'ExtractionCoordinator created');

      // 4. 等待页面加载完成（延迟提取）
      await this.delay(CONFIG.timing.extractDelay);

      // 5. 首次提取（使用协调器）
      await this.extractPrompts();

      // 如果首次提取为空，稍后再强制重试一次，确保对话 DOM 完全加载
      if (this.store.getCount() === 0) {
        Logger.info(
          'App',
          `No prompts after initial extraction, retrying in ${CONFIG.timing.secondExtractDelay}ms`
        );
        await this.delay(CONFIG.timing.secondExtractDelay);
        await this.extractPrompts({ force: true });
      }

      // 6. 只在有数据时渲染 UI
      if (this.shouldShowUI()) {
        // 小延迟避免闪烁
        await this.delay(50);
        this.renderUI();
      }

      // 7. 设置 MutationObserver 监听（自动处理所有 DOM 变化）
      this.setupObservers();

      // 8. 设置 URL 监听（检测对话切换）
      this.setupURLWatcher();

      this.initialized = true;
      Logger.info('App', `${EXTENSION_NAME} initialized successfully`);
    } catch (error) {
      Logger.error('App', 'Initialization failed', error as Error);
    }
  }

  /**
   * 提取 Prompts（使用协调器，优雅处理并发）
   */
  private async extractPrompts(options?: ExtractionOptions): Promise<void> {
    if (!this.coordinator) {
      Logger.warn('App', 'Coordinator not initialized');
      return;
    }

    try {
      const extractionOptions: ExtractionOptions = {
        strategy: options?.strategy ?? ExtractionStrategy.FULL,
        force: options?.force ?? false,
        timeout: options?.timeout,
        silent: options?.silent,
      };

      Logger.debug(
        'App',
        'Extracting prompts via coordinator...',
        extractionOptions
      );

      // 使用协调器提取（自动处理重入、合并等）
      const result = await this.coordinator.extract(extractionOptions);

      Logger.info(
        'App',
        `✅ Extracted ${result.prompts.length} prompts (source: ${result.source}, duration: ${result.duration}ms)`
      );
    } catch (error) {
      Logger.error('App', 'Extraction failed', error as Error);
    }
  }

  /**
   * 渲染 UI
   */
  private renderUI(): void {
    try {
      // 检查是否应该显示 UI
      if (!this.shouldShowUI()) {
        Logger.info('App', 'Not showing UI: no prompts or screen too small');
        return;
      }

      // 如果已经渲染，则不重复渲染
      if (this.sidebar) {
        Logger.warn('App', 'Sidebar already rendered');
        return;
      }

      // 创建 Svelte 组件容器
      this.sidebarContainer = document.createElement('div');
      this.sidebarContainer.id = 'ph-sidebar-root';
      document.body.appendChild(this.sidebarContainer);

      // 挂载 Svelte 5 组件（使用 mount API）
      this.sidebar = mount(Sidebar, {
        target: this.sidebarContainer,
        props: {
          store: this.store,
          eventBus: this.eventBus,
        },
      });

      Logger.info('App', 'UI rendered with Svelte');
    } catch (error) {
      Logger.error('App', 'UI rendering failed', error as Error);
    }
  }

  /**
   * 设置 MutationObserver 监听
   */
  private setupObservers(): void {
    if (!this.adapter) {
      return;
    }

    // 缓存 handler，方便 URL 变化后重新绑定到新 DOM
    this.domChangeHandler = async () => {
      Logger.debug('App', 'DOM changed, forcing extraction...');
      await this.extractPrompts({ force: true });

      // 根据数据决定显示/隐藏 UI
      if (this.shouldShowUI() && !this.sidebar) {
        this.renderUI();
      } else if (!this.shouldShowUI() && this.sidebar) {
        this.hideUI();
      }
    };

    this.adapter.observeChanges(this.domChangeHandler);

    Logger.info('App', 'MutationObserver set up');
  }


  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 检查是否应该显示 UI
   */
  private shouldShowUI(): boolean {
    return (
      this.store.getCount() > 0 &&
      window.innerWidth >= CONFIG.ui.minScreenWidth
    );
  }

  /**
   * 隐藏 UI
   */
  private hideUI(): void {
    if (this.sidebar) {
      Logger.info('App', 'Hiding UI');
      unmount(this.sidebar);
      this.sidebar = null;
    }

    if (this.sidebarContainer) {
      this.sidebarContainer.remove();
      this.sidebarContainer = null;
    }
  }

  /**
   * 设置 URL 监听（检测对话切换）
   * 只监听 pathname 变化
   */
  private setupURLWatcher(): void {
    let lastPathname = window.location.pathname;

    setInterval(() => {
      const currentPathname = window.location.pathname;
      if (currentPathname !== lastPathname) {
        Logger.info('App', `🔄 Pathname changed: ${lastPathname} -> ${currentPathname}`);
        lastPathname = currentPathname;
        this.handleURLChange();
      }
    }, 500);

    Logger.info('App', 'URL watcher set up (pathname only)');
  }

  /**
   * 处理 URL 变化（对话切换）
   */
  private async handleURLChange(): Promise<void> {
    Logger.info('App', '🔄 Handling conversation switch');

    // 清空当前数据
    this.store.clear();

    // 清空适配器缓存（ChatGPTAdapter 提供了 clearCache 方法）
    if (this.adapter && 'clearCache' in this.adapter) {
      (this.adapter as any).clearCache();
    }

    // 清空协调器缓存
    if (this.coordinator) {
      this.coordinator.clearCache();
    }

    // 等待响应式更新完成，避免双重清理冲突
    await this.delay(100);

    // 重新绑定 DOM 观察（新对话的容器通常会变化，旧 Observer 可能失效）
    if (this.adapter && this.domChangeHandler) {
      Logger.info('App', 'Rebinding DOM observer for new conversation');
      this.adapter.observeChanges(this.domChangeHandler, { forceInitial: true });
    }

    // 隐藏 UI
    this.hideUI();

    // 等待新页面稳定
    await this.delay(CONFIG.timing.extractDelay);

    // 重新提取
    await this.extractPrompts({ force: true });

    // 如果仍然没有数据，延迟一段时间再尝试一次，兼容慢加载 DOM
    if (this.store.getCount() === 0) {
      Logger.info(
        'App',
        `Retrying extraction after URL change in ${CONFIG.timing.secondExtractDelay}ms`
      );
      await this.delay(CONFIG.timing.secondExtractDelay);
      await this.extractPrompts({ force: true });
    }

    // 根据数据决定显示 UI
    if (this.shouldShowUI()) {
      if (!this.sidebar) {
        await this.delay(50);
        this.renderUI();
      }
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    Logger.info('App', 'Destroying app...');

    // 销毁 Svelte 5 组件
    if (this.sidebar) {
      unmount(this.sidebar);
      this.sidebar = null;
    }

    // 移除容器
    if (this.sidebarContainer) {
      this.sidebarContainer.remove();
      this.sidebarContainer = null;
    }

    // 重置协调器
    if (this.coordinator) {
      this.coordinator.reset();
      this.coordinator = null;
    }

    // 销毁适配器（会断开 MutationObserver）
    if (this.adapter) {
      this.adapter.destroy();
      this.adapter = null;
    }

    // 清空 Store
    this.store.clear();

    // 清空 EventBus
    EventBus.destroy();

    this.initialized = false;
    Logger.info('App', 'App destroyed');
  }
}

/**
 * 启动应用
 */
async function main(): Promise<void> {
  try {
    // 等待 DOM 加载完成
    if (document.readyState === 'loading') {
      await new Promise((resolve) => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }

    // 创建并初始化应用
    const app = new PromptHistoryApp();
    await app.initialize();

    // 全局错误处理
    window.addEventListener('error', (event) => {
      Logger.error('App', 'Global error', event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      Logger.error('App', 'Unhandled promise rejection', event.reason);
    });

    // 暴露到全局（用于调试）
    if (DEBUG) {
      (window as any).__promptHistoryApp = app;
    }
  } catch (error) {
    Logger.error('App', 'Failed to start app', error as Error);
  }
}

// 启动应用
main();
