/**
 * 侧边栏组件
 * 显示 Prompt 列表并提供交互功能
 */

import { Prompt } from '@/types/Prompt';
import { EventType } from '@/types/Events';
import { EventBus } from '@/core/events/EventBus';
import { PromptStore } from '@/core/store/PromptStore';
import { copyToClipboard, copyMultiple } from '@/utils/clipboard';
import { createElement, scrollToElement } from '@/utils/dom';
import { debounce } from '@/utils/debounce';
import { Logger } from '@/utils/logger';
import { SELECTORS, CONFIG, ICONS, STORAGE_KEYS } from '@/config/constants';

export class Sidebar {
  private container: HTMLElement | null = null;
  private promptListElement: HTMLElement | null = null;
  private compactCard: HTMLElement | null = null;
  private eventBus: EventBus;
  private store: PromptStore;
  private currentActiveId: string | null = null;
  private isCollapsed: boolean = false;

  constructor(store: PromptStore) {
    this.store = store;
    this.eventBus = EventBus.getInstance();
    this.isCollapsed = this.loadCollapsedState();
    this.setupEventListeners();
  }

  /**
   * 渲染侧边栏
   */
  render(): void {
    // 移除已存在的侧边栏
    this.destroy();

    // 创建容器
    this.container = this.createContainer();

    // 应用初始折叠状态
    if (this.isCollapsed) {
      this.container.classList.add(SELECTORS.COLLAPSED);
    }

    document.body.appendChild(this.container);

    // 创建右上角小卡片
    this.compactCard = this.createCompactCard();

    // 如果初始状态是折叠的，显示小卡片
    if (this.isCollapsed) {
      this.compactCard.classList.add('visible');
    }

    document.body.appendChild(this.compactCard);

    // 渲染内容
    this.renderContent();

    // 设置滚动监听
    this.setupScrollListener();

    // 更新主内容区 margin
    this.updateMainMargin();

    Logger.info('Sidebar', 'Sidebar rendered');
  }

  /**
   * 创建容器
   */
  private createContainer(): HTMLElement {
    return createElement('div', {
      id: SELECTORS.SIDEBAR,
      className: SELECTORS.NAV_CONTAINER,
    });
  }

  /**
   * 创建右上角小卡片
   */
  private createCompactCard(): HTMLElement {
    const card = createElement('div', {
      id: SELECTORS.COMPACT_CARD,
      className: SELECTORS.COMPACT_CARD,
    });

    const prompts = this.store.getFiltered();

    card.innerHTML = `
      <span class="ph-compact-badge">${prompts.length}</span>
      <span class="ph-compact-label">Prompts</span>
    `;

    // 点击小卡片时展开侧边栏
    card.addEventListener('click', () => {
      if (this.isCollapsed) {
        this.toggleSidebar();
      }
    });

    return card;
  }

  /**
   * 更新右上角小卡片计数
   */
  private updateCompactCard(): void {
    if (!this.compactCard) {
      return;
    }

    const prompts = this.store.getFiltered();
    const badge = this.compactCard.querySelector('.ph-compact-badge');
    if (badge) {
      badge.textContent = prompts.length.toString();
    }
  }

  /**
   * 渲染内容
   */
  private renderContent(): void {
    if (!this.container) {
      return;
    }

    const prompts = this.store.getFiltered();

    this.container.innerHTML = `
      <div class="${SELECTORS.HEADER}">
        <h3>Prompts</h3>
        ${
          prompts.length > 0
            ? `<div class="${SELECTORS.HEADER_ACTIONS}">
                 <button class="${SELECTORS.TOGGLE_BUTTON}" title="展开/收起">
                   <span class="ph-toggle-icon">${ICONS.CHEVRON}</span>
                 </button>
                 <button class="${SELECTORS.COPY_ALL_BUTTON}" title="复制所有">
                   ${ICONS.COPY}
                 </button>
               </div>`
            : ''
        }
      </div>
      <div class="${SELECTORS.LINKS}" id="prompt-list"></div>
    `;

    this.promptListElement = this.container.querySelector(`#prompt-list`);

    // 渲染 Prompt 列表
    if (this.promptListElement) {
      this.renderPromptList(prompts);
    }

    // 绑定事件
    this.bindEvents();

    // 更新右上角小卡片
    this.updateCompactCard();
  }

  /**
   * 渲染 Prompt 列表
   */
  private renderPromptList(prompts: Prompt[]): void {
    if (!this.promptListElement) {
      return;
    }

    if (prompts.length === 0) {
      this.promptListElement.innerHTML = `
        <div class="empty-state">暂无 Prompts</div>
      `;
      return;
    }

    const listHTML = prompts
      .map((prompt) => this.renderPromptItem(prompt))
      .join('');

    this.promptListElement.innerHTML = listHTML;
  }

  /**
   * 渲染单个 Prompt 项
   */
  private renderPromptItem(prompt: Prompt): string {
    const preview =
      prompt.content.length > CONFIG.ui.previewLength
        ? prompt.content.substring(0, CONFIG.ui.previewLength) + '...'
        : prompt.content;

    return `
      <div class="${SELECTORS.LINK_ITEM}" data-id="${prompt.id}">
        <span class="prompt-text">${this.escapeHtml(preview)}</span>
        <button class="${SELECTORS.COPY_BUTTON}" data-id="${prompt.id}" title="复制">
          ${ICONS.COPY}
        </button>
      </div>
    `;
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.container) {
      return;
    }

    // 展开/收起按钮
    const toggleBtn = this.container.querySelector(
      `.${SELECTORS.TOGGLE_BUTTON}`
    );
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleSidebar());
    }

    // 复制所有按钮
    const copyAllBtn = this.container.querySelector(
      `.${SELECTORS.COPY_ALL_BUTTON}`
    );
    if (copyAllBtn) {
      copyAllBtn.addEventListener('click', () => void this.handleCopyAll());
    }

    // Prompt 项点击（跳转）
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const linkItem = target.closest(`.${SELECTORS.LINK_ITEM}`);

      if (linkItem && !target.closest(`.${SELECTORS.COPY_BUTTON}`)) {
        const id = linkItem.getAttribute('data-id');
        if (id) {
          this.handlePromptClick(id);
        }
      }
    });

    // 复制按钮
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const copyBtn = target.closest(`.${SELECTORS.COPY_BUTTON}`);

      if (copyBtn) {
        e.stopPropagation();
        const id = copyBtn.getAttribute('data-id');
        if (id) {
          void this.handleCopy(id, copyBtn as HTMLElement);
        }
      }
    });
  }

  /**
   * 处理 Prompt 点击（跳转）
   */
  private handlePromptClick(id: string): void {
    const prompt = this.store.getById(id);
    if (!prompt || !prompt.element) {
      Logger.warn('Sidebar', `Prompt ${id} not found or has no element`);
      return;
    }

    // 滚动到元素
    scrollToElement(prompt.element);

    // 设置激活状态
    this.setActive(id);

    // 触发事件
    this.eventBus.emit(EventType.PROMPT_SELECTED, id);

    Logger.debug('Sidebar', `Navigated to prompt: ${id}`);
  }

  /**
   * 处理复制
   */
  private async handleCopy(id: string, button: HTMLElement): Promise<void> {
    const prompt = this.store.getById(id);
    if (!prompt) {
      return;
    }

    const success = await copyToClipboard(prompt.content);

    if (success) {
      this.showCopyFeedback(button);
      this.eventBus.emit(EventType.COPIED, { count: 1, success: true });
    }
  }

  /**
   * 处理复制所有
   */
  private async handleCopyAll(): Promise<void> {
    const prompts = this.store.getFiltered();
    const contents = prompts.map((p) => p.content);

    const success = await copyMultiple(contents);

    if (success) {
      Logger.info('Sidebar', `Copied ${prompts.length} prompts`);
      this.eventBus.emit(EventType.COPIED, {
        count: prompts.length,
        success: true,
      });

      // 显示反馈
      const button = this.container?.querySelector(
        `.${SELECTORS.COPY_ALL_BUTTON}`
      );
      if (button) {
        this.showCopyFeedback(button as HTMLElement);
      }
    }
  }

  /**
   * 显示复制反馈
   */
  private showCopyFeedback(button: HTMLElement): void {
    const originalHTML = button.innerHTML;
    button.innerHTML = ICONS.CHECK;
    button.classList.add('copied');

    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.classList.remove('copied');
    }, CONFIG.timing.copyFeedbackDuration);
  }

  /**
   * 设置激活状态
   */
  private setActive(id: string): void {
    if (!this.promptListElement) {
      return;
    }

    // 避免重复设置
    if (this.currentActiveId === id) {
      return;
    }

    // 移除所有激活状态
    this.promptListElement
      .querySelectorAll(`.${SELECTORS.LINK_ITEM}`)
      .forEach((item) => item.classList.remove(SELECTORS.ACTIVE));

    // 添加新的激活状态
    const item = this.promptListElement.querySelector(
      `.${SELECTORS.LINK_ITEM}[data-id="${id}"]`
    );
    if (item) {
      item.classList.add(SELECTORS.ACTIVE);
      this.currentActiveId = id; // 追踪当前激活项
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听 Prompts 更新
    this.eventBus.on(EventType.PROMPTS_UPDATED, (_prompts) => {
      this.renderContent();
    });
  }

  /**
   * 设置滚动监听（自动高亮当前可见的 Prompt）
   */
  private setupScrollListener(): void {
    const handleScroll = debounce(() => {
      this.updateActiveByScroll();
    }, CONFIG.timing.scrollDebounce);

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('scroll', handleScroll, true);
  }

  /**
   * 根据滚动位置更新激活状态
   */
  private updateActiveByScroll(): void {
    const prompts = this.store.getFiltered();
    const viewportMiddle = window.innerHeight / 2;

    for (const prompt of prompts) {
      if (!prompt.element) {
        continue;
      }

      const rect = prompt.element.getBoundingClientRect();
      if (rect.top <= viewportMiddle && rect.bottom >= viewportMiddle) {
        this.setActive(prompt.id);
        break;
      }
    }
  }

  /**
   * 转义 HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 从 localStorage 加载折叠状态
   */
  private loadCollapsedState(): boolean {
    const saved = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
    // 默认在小屏幕上折叠
    return saved !== null ? saved === 'true' : window.innerWidth < 1440;
  }

  /**
   * 保存折叠状态到 localStorage
   */
  private saveCollapsedState(collapsed: boolean): void {
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed.toString());
  }

  /**
   * 切换侧边栏展开/收起
   */
  private toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    this.saveCollapsedState(this.isCollapsed);

    if (!this.container || !this.compactCard) {
      return;
    }

    if (this.isCollapsed) {
      this.container.classList.add(SELECTORS.COLLAPSED);
      // 延迟显示小卡片（等待动画完成）
      setTimeout(() => {
        this.compactCard?.classList.add('visible');
      }, 250);
    } else {
      this.container.classList.remove(SELECTORS.COLLAPSED);
      this.compactCard.classList.remove('visible');
    }

    this.updateMainMargin();
    Logger.debug('Sidebar', `Sidebar ${this.isCollapsed ? 'collapsed' : 'expanded'}`);
  }

  /**
   * 更新主内容区 margin
   */
  private updateMainMargin(): void {
    const main = document.querySelector('main');
    if (!main) {
      return;
    }

    if (this.isCollapsed) {
      main.style.marginRight = '68px'; // 48px + 20px
    } else {
      main.style.marginRight = '260px'; // 240px + 20px
    }
  }

  /**
   * 销毁侧边栏
   */
  destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
      this.promptListElement = null;
      Logger.info('Sidebar', 'Sidebar destroyed');
    }
    if (this.compactCard) {
      this.compactCard.remove();
      this.compactCard = null;
    }
  }
}
