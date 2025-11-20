/**
 * ChatGPT Prompt 提取器
 * 从 ChatGPT 页面的 DOM 中提取用户的 Prompts
 * 使用 MutationObserver 监听 DOM 变化，支持动态切换监听容器
 */

import { BaseExtractor } from '@/core/extractor/BaseExtractor';
import { Prompt, PromptSource } from '@/types/Prompt';
import { CHATGPT_CONFIG } from '@/config/platforms';
import { Logger } from '@/utils/logger';
import { debounce } from '@/utils/debounce';

export class ChatGPTExtractor extends BaseExtractor {
  /** 当前 MutationObserver 实例 */
  private currentObserver: MutationObserver | null = null;

  /** 是否已切换到精确容器 */
  private isObservingPreciseContainer = false;

  /** 是否正在提取（防止重入） */
  private isExtracting = false;

  /** 提取期间如有新的 DOM 变动，结束后追加一次回调 */
  private hasPendingMutations = false;

  /** 缓存观察回调，便于提取结束后触发一次补偿提取 */
  private mutationCallback: (() => void) | null = null;

  constructor() {
    super(CHATGPT_CONFIG);
  }

  /**
   * 提取 Prompts（全量扫描，无状态）
   */
  async extract(): Promise<Prompt[]> {
    // 防止重入
    if (this.isExtracting) {
      Logger.warn('ChatGPTExtractor', '⚠️ Extraction already in progress, skipping');
      return [];
    }

    this.isExtracting = true;

    try {
      Logger.info('ChatGPTExtractor', 'Starting extraction');

      const articles = this.findArticles();
      Logger.debug('ChatGPTExtractor', `Found ${articles.length} articles`);

      const prompts: Prompt[] = [];
      let domIndex = 0; // DOM 位置索引计数器

      for (const article of articles) {
        // 过滤用户消息
        if (!this.isUserPrompt(article)) {
          continue;
        }

        const prompt = this.extractFromArticle(article, domIndex);
        if (prompt) {
          prompts.push(prompt);
          domIndex++; // 只有成功提取后才增加索引
        }
      }

      Logger.info('ChatGPTExtractor', `Extracted ${prompts.length} prompts`);
      return this.sortByTimestamp(prompts);
    } catch (error) {
      this.logError('Extraction failed', error as Error);
      return [];
    } finally {
      this.isExtracting = false;

      if (this.hasPendingMutations && this.mutationCallback) {
        this.hasPendingMutations = false;
        Logger.info(
          'ChatGPTExtractor',
          'Pending mutations detected during extraction, triggering follow-up extraction'
        );
        this.mutationCallback();
      }
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
   * @param article - 文章元素
   * @param domIndex - DOM 遍历位置索引
   */
  private extractFromArticle(article: HTMLElement, domIndex: number): Prompt | null {
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

    // 获取时间戳（尝试从 DOM 获取，否则使用当前时间）
    const timestamp = this.extractTimestamp(article) || Date.now();

    // 创建 Prompt 对象（传入 domIndex 以确保唯一性）
    return this.createPrompt(
      content,
      messageElement as HTMLElement,
      PromptSource.DOM,
      domIndex,
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
   * 设置 DOM 监听（动态切换容器）
   */
  observeChanges(
    callback: () => void,
    options?: { forceInitial?: boolean }
  ): void {
    // 如果已经有 observer 在运行，先断开（避免重复监听）
    if (this.currentObserver) {
      Logger.warn('ChatGPTExtractor', '⚠️ Observer already exists, disconnecting old one');
      this.currentObserver.disconnect();
      this.currentObserver = null;
    }

    // 重置状态，避免上一段对话的监听模式影响新对话
    if (options?.forceInitial) {
      this.isObservingPreciseContainer = false;
    }

    // 使用 500ms 防抖，因为 ChatGPT 页面 DOM 变化频繁
    // 相比 300ms，能更好地减少触发频率，提升性能
    const debouncedCallback = debounce(callback, 500);
    this.mutationCallback = debouncedCallback;

    const shouldForceInitial = options?.forceInitial === true;

    if (shouldForceInitial) {
      // URL 切换后强制回到初始容器，避免挂载到旧对话的列表父节点
      this.observeInitialContainer(debouncedCallback);
      return;
    }

    // 检查对话是否已就绪（仅在非强制模式下）
    const articles = this.findArticles();
    const userArticles = articles.filter((a) => this.isUserPrompt(a));

    if (userArticles.length > 0) {
      // 对话已就绪，直接监听精确容器
      this.observePreciseContainer(debouncedCallback);
    } else {
      // 对话未就绪，监听初始容器
      this.observeInitialContainer(debouncedCallback);
    }
  }

  /**
   * 监听初始容器（包含输入框，范围较大）
   */
  private observeInitialContainer(callback: () => void): void {
    const container = this.findConversationContainer();

    // 警告：如果容器是 body，性能会很差
    if (container === document.body) {
      Logger.warn(
        'ChatGPTExtractor',
        '⚠️ Monitoring entire body, this may impact performance'
      );
    }

    const observer = new MutationObserver((mutations) => {
      // 快速检查：如果正在提取，直接返回（防重入）
      if (this.isExtracting) {
        this.hasPendingMutations = true;
        return;
      }

      // 缓存 sidebarRoot，避免在 filter 中重复查询 DOM（性能优化）
      const sidebarRoot = document.getElementById('ph-sidebar-root');

      // 快速检查：如果没有 sidebar，跳过过滤（早期返回优化）
      if (!sidebarRoot) {
        // Sidebar 尚未创建，所有变化都是平台的
        const hasRelevantChanges = mutations.some(
          (m) => m.type === 'childList' && m.addedNodes.length > 0
        );
        if (hasRelevantChanges) {
          Logger.debug('ChatGPTExtractor', `Detected ${mutations.length} mutations (no sidebar yet)`);

          // 检查是否有对话元素出现
          const articles = this.findArticles();
          const userArticles = articles.filter((a) => this.isUserPrompt(a));

          if (userArticles.length > 0 && !this.isObservingPreciseContainer) {
            Logger.info('ChatGPTExtractor', '✅ Conversation ready, switching to precise container');
            observer.disconnect();
            this.observePreciseContainer(callback);
          }

          callback();
        }
        return;
      }

      // 过滤掉扩展自己的 DOM 变化（防止无限循环）
      const relevantMutations = mutations.filter((m) => {
        // 检查 target 是否在扩展容器内
        if (m.target instanceof HTMLElement && sidebarRoot.contains(m.target)) {
          return false;
        }

        // 检查 addedNodes 是否包含扩展容器
        if (m.type === 'childList' && m.addedNodes.length > 0) {
          for (const node of Array.from(m.addedNodes)) {
            if (node instanceof HTMLElement) {
              // 检查是否是 sidebar 本身，或包含 sidebar
              if (node.id === 'ph-sidebar-root' || node.contains(sidebarRoot)) {
                return false;
              }
            }
          }
        }

        // 检查 removedNodes 是否包含扩展容器
        if (m.type === 'childList' && m.removedNodes.length > 0) {
          for (const node of Array.from(m.removedNodes)) {
            if (node instanceof HTMLElement) {
              if (node.id === 'ph-sidebar-root' || node.contains(sidebarRoot)) {
                return false;
              }
            }
          }
        }

        return true;
      });

      if (relevantMutations.length === 0) {
        return; // 没有相关变化，直接返回
      }

      const hasRelevantChanges = relevantMutations.some(
        (m) => m.type === 'childList' && m.addedNodes.length > 0
      );

      if (hasRelevantChanges) {
        Logger.debug('ChatGPTExtractor', `Detected ${relevantMutations.length} relevant mutations`);

        // 检查是否有对话元素出现
        const articles = this.findArticles();
        const userArticles = articles.filter((a) => this.isUserPrompt(a));

        if (userArticles.length > 0 && !this.isObservingPreciseContainer) {
          // 对话就绪，切换到精确容器
          Logger.info(
            'ChatGPTExtractor',
            '✅ Conversation ready, switching to precise container'
          );
          observer.disconnect();
          this.observePreciseContainer(callback);
        }

        callback();
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false, // 编辑时触发 childList（DOM 替换），不需要 characterData
    });

    this.currentObserver = observer;
    Logger.info(
      'ChatGPTExtractor',
      `Observing initial container: ${this.getContainerDescription(container)}`
    );
  }

  /**
   * 监听精确容器（对话列表的直接父容器）
   */
  private observePreciseContainer(callback: () => void): void {
    const container = this.findConversationListContainer();

    if (!container) {
      Logger.warn(
        'ChatGPTExtractor',
        '⚠️ Precise container not found, falling back to initial container'
      );
      this.observeInitialContainer(callback);
      return;
    }

    const observer = new MutationObserver((mutations) => {
      // 快速检查：如果正在提取，直接返回（防重入）
      if (this.isExtracting) {
        this.hasPendingMutations = true;
        return;
      }

      // 缓存 sidebarRoot，避免在 filter 中重复查询 DOM（性能优化）
      const sidebarRoot = document.getElementById('ph-sidebar-root');

      // 快速检查：如果没有 sidebar，跳过过滤（早期返回优化）
      if (!sidebarRoot) {
        const hasRelevantChanges = mutations.some(
          (m) => m.type === 'childList' && m.addedNodes.length > 0
        );
        if (hasRelevantChanges) {
          Logger.debug('ChatGPTExtractor', `Precise container: ${mutations.length} mutations (no sidebar yet)`);
          callback();
        }
        return;
      }

      // 过滤掉扩展自己的 DOM 变化（防止无限循环）
      const relevantMutations = mutations.filter((m) => {
        // 检查 target 是否在扩展容器内
        if (m.target instanceof HTMLElement && sidebarRoot.contains(m.target)) {
          return false;
        }

        // 检查 addedNodes 是否包含扩展容器
        if (m.type === 'childList' && m.addedNodes.length > 0) {
          for (const node of Array.from(m.addedNodes)) {
            if (node instanceof HTMLElement) {
              // 检查是否是 sidebar 本身，或包含 sidebar
              if (node.id === 'ph-sidebar-root' || node.contains(sidebarRoot)) {
                return false;
              }
            }
          }
        }

        // 检查 removedNodes 是否包含扩展容器
        if (m.type === 'childList' && m.removedNodes.length > 0) {
          for (const node of Array.from(m.removedNodes)) {
            if (node instanceof HTMLElement) {
              if (node.id === 'ph-sidebar-root' || node.contains(sidebarRoot)) {
                return false;
              }
            }
          }
        }

        return true;
      });

      if (relevantMutations.length === 0) {
        return; // 没有相关变化，直接返回
      }

      const hasRelevantChanges = relevantMutations.some(
        (m) => m.type === 'childList' && m.addedNodes.length > 0
      );

      if (hasRelevantChanges) {
        Logger.debug('ChatGPTExtractor', `Precise container: ${relevantMutations.length} relevant mutations`);
        callback();
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false, // 编辑时触发 childList（DOM 替换），不需要 characterData
    });

    this.currentObserver = observer;
    this.isObservingPreciseContainer = true;

    Logger.info(
      'ChatGPTExtractor',
      `✅ Observing precise container: ${this.getContainerDescription(container)}`
    );
  }

  /**
   * 查找对话容器（多层级 fallback）
   */
  private findConversationContainer(): HTMLElement {
    // 策略 1: composer-parent（最健壮）
    const composerParent = document.querySelector<HTMLElement>(
      'div[role="presentation"].composer-parent'
    );
    if (composerParent) {
      Logger.debug('ChatGPTExtractor', 'Using composer-parent container');
      return composerParent;
    }

    // 策略 2: main#main
    const main = document.querySelector<HTMLElement>('main#main');
    if (main) {
      Logger.warn('ChatGPTExtractor', 'Fallback to main#main container');
      return main;
    }

    // 策略 3: 第一个 main 元素
    const anyMain = document.querySelector<HTMLElement>('main');
    if (anyMain) {
      Logger.warn('ChatGPTExtractor', 'Fallback to first main element');
      return anyMain;
    }

    // 策略 4: body（最后手段）
    Logger.error(
      'ChatGPTExtractor',
      '⚠️ No stable container found, using body'
    );
    return document.body;
  }

  /**
   * 查找对话列表容器（所有 article 的共同父元素）
   */
  private findConversationListContainer(): HTMLElement | null {
    const articles = this.findArticles();
    if (articles.length === 0) {
      return null;
    }

    // 获取第一个 article 的父元素
    let parent = articles[0].parentElement;
    if (!parent) {
      return null;
    }

    // 向上查找，直到找到包含所有 article 的容器
    while (parent && parent !== document.body) {
      const articlesInParent = Array.from(
        parent.querySelectorAll<HTMLElement>(
          this.config.selectors.articleContainer
        )
      );

      // 检查这个父元素是否包含所有 article
      if (articlesInParent.length === articles.length) {
        Logger.debug(
          'ChatGPTExtractor',
          `Found conversation list container: ${this.getContainerDescription(parent)}`
        );
        return parent;
      }

      parent = parent.parentElement;
    }

    return null;
  }

  /**
   * 获取容器描述（用于日志）
   */
  private getContainerDescription(element: HTMLElement): string {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const classes = element.className
      ? `.${element.className.split(' ').slice(0, 2).join('.')}`
      : '';
    return `${tag}${id}${classes}`;
  }

  /**
   * 断开当前 Observer
   */
  destroy(): void {
    if (this.currentObserver) {
      this.currentObserver.disconnect();
      this.currentObserver = null;
      Logger.debug('ChatGPTExtractor', 'Observer disconnected');
    }
  }

  /**
   * 清空缓存（重置状态）
   * 注意：URL 切换时会调用此方法，但不会重新设置 observer
   * observer 会继续监听，自动处理新对话的 DOM 变化
   */
  override clearCache(): void {
    super.clearCache();

    // 重置状态（但不断开 observer）
    this.isObservingPreciseContainer = false;
    this.hasPendingMutations = false;

    Logger.debug('ChatGPTExtractor', 'Cache cleared, observer still active');
  }
}
