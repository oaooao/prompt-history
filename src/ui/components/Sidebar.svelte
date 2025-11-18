<script lang="ts">
  import { onMount } from 'svelte';
  import type { PromptStore } from '@/core/store/PromptStore';
  import type { EventBus } from '@/core/events/EventBus';
  import type { Prompt } from '@/types/Prompt';
  import { EventType } from '@/types/Events';
  import { sidebarState } from '@/ui/stores/sidebar.svelte';
  import { SELECTORS, CONFIG } from '@/config/constants';
  import { debounce } from '@/utils/debounce';
  import { Logger } from '@/utils/logger';
  import SidebarHeader from './SidebarHeader.svelte';
  import PromptList from './PromptList.svelte';
  import CompactCard from './CompactCard.svelte';

  const { store, eventBus } = $props<{
    store: PromptStore;
    eventBus: EventBus;
  }>();

  onMount(() => {
    // 订阅 Prompts 更新事件
    const unsubscribe = eventBus.on(EventType.PROMPTS_UPDATED, (prompts: Prompt[]) => {
      sidebarState.updatePrompts(prompts);
    });

    // 初始化数据
    const initialPrompts = store.getFiltered();
    sidebarState.updatePrompts(initialPrompts);

    // 更新主内容区 margin
    updateMainMargin();

    // 设置滚动监听
    setupScrollListener();

    return () => {
      unsubscribe();
      // 清理 margin
      const main = document.querySelector('main');
      if (main) {
        main.style.marginRight = '';
      }
    };
  });

  function updateMainMargin() {
    const main = document.querySelector('main');
    if (main) {
      if (sidebarState.isCollapsed) {
        main.style.marginRight = '68px';
      } else {
        main.style.marginRight = `${CONFIG.ui.sidebarWidth + 20}px`;
      }
    }
  }

  /**
   * 查找真正的滚动容器
   */
  function findScrollContainer(): Element | Window {
    const selectors = [
      'div.flex.flex-col.overflow-y-auto', // ChatGPT 实际滚动容器
      '.overflow-y-auto', // 更通用的滚动容器
      'main', // 通用 fallback
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        // 确保元素有实际的可滚动内容
        if (element.scrollHeight > element.clientHeight + 10) {
          Logger.debug('Sidebar', `Found scroll container: ${selector}`, {
            scrollHeight: element.scrollHeight,
            clientHeight: element.clientHeight,
            scrollTop: element.scrollTop,
          });
          return element;
        }
      }
    }

    Logger.warn('Sidebar', 'No scroll container found, using window');
    return window;
  }

  /**
   * 根据滚动位置更新激活状态
   */
  function updateActiveByScroll(container: Element | Window): void {
    const prompts = store.getFiltered();
    if (prompts.length === 0) return;

    let targetPrompt: Prompt | null = null;
    let minDistance = Infinity;

    if (container === window) {
      // Window 滚动：找到最接近视口中心的元素
      const viewportMiddle = window.innerHeight / 2;

      for (const prompt of prompts) {
        if (!prompt.element) continue;

        const rect = prompt.element.getBoundingClientRect();
        const elementMiddle = rect.top + rect.height / 2;
        const distance = Math.abs(elementMiddle - viewportMiddle);

        if (distance < minDistance) {
          minDistance = distance;
          targetPrompt = prompt;
        }
      }
    } else {
      // 容器滚动：找到在容器可见区域中最接近中心的元素
      const containerRect = (container as Element).getBoundingClientRect();
      const containerMiddle = containerRect.top + containerRect.height / 2;

      for (const prompt of prompts) {
        if (!prompt.element) continue;

        const rect = prompt.element.getBoundingClientRect();

        // 检查元素是否在容器的可见区域内
        const isInView =
          rect.bottom >= containerRect.top && rect.top <= containerRect.bottom;

        if (!isInView) continue;

        const elementMiddle = rect.top + rect.height / 2;
        const distance = Math.abs(elementMiddle - containerMiddle);

        if (distance < minDistance) {
          minDistance = distance;
          targetPrompt = prompt;
        }
      }
    }

    // 设置激活状态
    if (targetPrompt) {
      sidebarState.setActive(targetPrompt.id);
      Logger.debug('Sidebar', `Active prompt updated: ${targetPrompt.id}`);
    }
  }

  /**
   * 设置滚动监听（自动高亮当前可见的 Prompt）
   */
  function setupScrollListener(): void {
    // 延迟查找滚动容器，确保 DOM 已完全加载
    setTimeout(() => {
      const scrollContainer = findScrollContainer();

      const handleScroll = debounce(() => {
        updateActiveByScroll(scrollContainer);
      }, CONFIG.timing.scrollDebounce);

      if (scrollContainer === window) {
        window.addEventListener('scroll', handleScroll);
        document.addEventListener('scroll', handleScroll, true);
      } else {
        scrollContainer.addEventListener('scroll', handleScroll);
      }

      Logger.info(
        'Sidebar',
        `Scroll listener attached to: ${scrollContainer === window ? 'window' : (scrollContainer as Element).className}`
      );
    }, 500); // 延迟 500ms
  }

  // 监听折叠状态变化，更新 margin
  $effect(() => {
    // 响应式：当 isCollapsed 变化时自动更新 margin
    // eslint-disable-next-line no-unused-expressions -- Svelte 5 $effect dependency tracking
    sidebarState.isCollapsed;
    updateMainMargin();
  });
</script>

<div
  id={SELECTORS.SIDEBAR}
  class={`${SELECTORS.NAV_CONTAINER} ${sidebarState.isCollapsed ? SELECTORS.COLLAPSED : ''}`}
>
  <div class={SELECTORS.NAV_CONTAINER}>
    <SidebarHeader />
    <PromptList />
  </div>
</div>

<CompactCard />

<style>
  /* 侧边栏容器 */
  #prompt-history-sidebar {
    position: fixed;
    right: 0;
    top: 0;
    width: 240px;
    height: 100vh;
    padding: 80px 20px 24px 20px;
    background: transparent;
    z-index: 100;
    overflow-y: auto;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      'Helvetica Neue', Arial, sans-serif;
    transform: translateX(0);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* 折叠状态 */
  #prompt-history-sidebar.collapsed {
    transform: translateX(100%);
  }

  /* 导航容器 */
  .ph-nav-container {
    position: relative;
  }

  /* 滚动条隐藏 */
  #prompt-history-sidebar::-webkit-scrollbar {
    display: none;
  }
</style>
