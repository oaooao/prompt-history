/**
 * Chrome 扩展主入口文件
 * 负责初始化和协调所有组件
 */

import { PlatformFactory } from '@/platforms/factory';
import { PlatformDetector } from '@/platforms/base/PlatformDetector';
import { PromptStore } from '@/core/store/PromptStore';
import { EventBus } from '@/core/events/EventBus';
import Sidebar from '@/ui/components/Sidebar.svelte';
import { mount, unmount } from 'svelte';
import { Logger, LogLevel } from '@/utils/logger';
import { CONFIG, DEBUG, EXTENSION_NAME, VERSION } from '@/config/constants';
import { IPlatformAdapter } from '@/types/Platform';

/**
 * 主应用类
 */
class PromptHistoryApp {
  private adapter: IPlatformAdapter | null = null;
  private store: PromptStore;
  private sidebar: any = null; // Svelte 组件实例
  private sidebarContainer: HTMLElement | null = null;
  private eventBus: EventBus;
  private extractionInterval: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

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

      // 3. 等待页面加载完成（延迟提取）
      await this.delay(CONFIG.timing.extractDelay);

      // 4. 首次提取
      await this.extractPrompts();

      // 5. 渲染 UI
      this.renderUI();

      // 6. 设置 DOM 监听
      this.setupObservers();

      // 7. 设置定期提取
      this.setupPeriodicExtraction();

      this.initialized = true;
      Logger.info('App', `${EXTENSION_NAME} initialized successfully`);
    } catch (error) {
      Logger.error('App', 'Initialization failed', error as Error);
    }
  }

  /**
   * 提取 Prompts
   */
  private async extractPrompts(): Promise<void> {
    if (!this.adapter) {
      return;
    }

    try {
      Logger.debug('App', 'Extracting prompts...');
      const prompts = await this.adapter.extractPrompts();

      if (prompts.length > 0) {
        this.store.setPrompts(prompts);
        Logger.info('App', `Extracted ${prompts.length} prompts`);
      }
    } catch (error) {
      Logger.error('App', 'Extraction failed', error as Error);
    }
  }

  /**
   * 渲染 UI
   */
  private renderUI(): void {
    try {
      // 检查屏幕宽度
      if (window.innerWidth < CONFIG.ui.minScreenWidth) {
        Logger.info('App', 'Screen too small, hiding sidebar');
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
   * 设置 DOM 监听
   */
  private setupObservers(): void {
    if (!this.adapter) {
      return;
    }

    this.adapter.observeChanges(async () => {
      Logger.debug('App', 'DOM changed, extracting...');
      await this.delay(CONFIG.timing.extractDelay);
      await this.extractPrompts();
    });

    Logger.info('App', 'DOM observers set up');
  }

  /**
   * 设置定期提取
   */
  private setupPeriodicExtraction(): void {
    // 每隔一段时间提取一次（作为后备机制）
    this.extractionInterval = setInterval(async () => {
      Logger.debug('App', 'Periodic extraction...');
      await this.extractPrompts();
    }, CONFIG.timing.secondExtractDelay * 2); // 2 秒

    Logger.info('App', 'Periodic extraction set up');
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 清理资源
   */
  destroy(): void {
    Logger.info('App', 'Destroying app...');

    // 清理定时器
    if (this.extractionInterval) {
      clearInterval(this.extractionInterval);
      this.extractionInterval = null;
    }

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

    // 销毁适配器
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
