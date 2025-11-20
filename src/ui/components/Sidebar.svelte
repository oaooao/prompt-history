<script lang="ts">
  import { onMount } from 'svelte';
  import type { PromptStore } from '@/core/store/PromptStore';
  import type { EventBus } from '@/core/events/EventBus';
  import type { Prompt } from '@/types/Prompt';
  import { EventType } from '@/types/Events';
  import { sidebarState } from '@/ui/stores/sidebar.svelte';
  import { SELECTORS, CONFIG } from '@/config/constants';
  import { cancelableDebounce } from '@/utils/debounce';
  import { Logger } from '@/utils/logger';
  import SidebarHeader from './SidebarHeader.svelte';
  import PromptList from './PromptList.svelte';
  import CompactCard from './CompactCard.svelte';

  const { store, eventBus } = $props<{
    store: PromptStore;
    eventBus: EventBus;
  }>();

  // 组件销毁标志，用于防止竞态条件
  let isDestroying = false;

  onMount(() => {
    // 订阅 Prompts 更新事件，记录监听器 ID 以便销毁时解绑
    const listenerId = eventBus.on(EventType.PROMPTS_UPDATED, (prompts: Prompt[]) => {
      sidebarState.updatePrompts(prompts);
    });

    // 获取初始数据
    const initialPrompts = store.getFiltered();
    sidebarState.updatePrompts(initialPrompts);

    // 更新主内容区 margin
    updateMainMargin();

    // 设置滚动监听，保存清理函数
    const cleanupScroll = setupScrollListener();

    // 返回清理函数
    return () => {
      // 设置销毁标志，防止回调继续执行
      isDestroying = true;

      if (listenerId) {
        eventBus.off(listenerId);
      }
      cleanupScroll(); // 清理滚动监听器

      // 清理 margin
      const main = document.querySelector('main');
      if (main) {
        main.style.marginRight = '';
      }

      Logger.debug('Sidebar', 'Component cleanup completed');
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
    // 防御性检查：组件是否正在销毁
    if (isDestroying) {
      return;
    }

    // 防御性检查：确保有数据
    if (sidebarState.promptCount === 0) {
      return;
    }

    // 防御性检查：确保 store 仍然可用
    if (!store || typeof store.getFiltered !== 'function') {
      return;
    }

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
   * @returns 清理函数
   */
  function setupScrollListener(): () => void {
    let cleanupFn: (() => void) | null = null;

    // 延迟查找滚动容器，确保 DOM 已完全加载
    const timeoutId = setTimeout(() => {
      const scrollContainer = findScrollContainer();

      // 使用可取消的 debounce
      const { debounced: handleScroll, cancel: cancelDebounce } = cancelableDebounce(
        () => {
          updateActiveByScroll(scrollContainer);
        },
        CONFIG.timing.scrollDebounce
      );

      if (scrollContainer === window) {
        window.addEventListener('scroll', handleScroll);
        document.addEventListener('scroll', handleScroll, true);

        // 保存清理函数
        cleanupFn = () => {
          cancelDebounce(); // 取消待执行的 debounce 回调
          window.removeEventListener('scroll', handleScroll);
          document.removeEventListener('scroll', handleScroll, true);
          Logger.debug('Sidebar', 'Window scroll listeners removed and debounce cancelled');
        };
      } else {
        scrollContainer.addEventListener('scroll', handleScroll);

        // 保存清理函数
        cleanupFn = () => {
          cancelDebounce(); // 取消待执行的 debounce 回调
          scrollContainer.removeEventListener('scroll', handleScroll);
          Logger.debug('Sidebar', 'Container scroll listener removed and debounce cancelled');
        };
      }

      Logger.info(
        'Sidebar',
        `Scroll listener attached to: ${scrollContainer === window ? 'window' : (scrollContainer as Element).className}`
      );
    }, 500); // 延迟 500ms

    // 返回清理函数（处理超时情况）
    return () => {
      clearTimeout(timeoutId);
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }

  // 监听折叠状态变化，更新 margin
  $effect(() => {
    // 响应式：当 isCollapsed 变化时自动更新 margin
    // eslint-disable-next-line no-unused-expressions -- Svelte 5 $effect dependency tracking
    sidebarState.isCollapsed;
    updateMainMargin();

    // 返回空的清理函数，确保 Svelte 不会误解返回值
    return () => {};
  });
</script>

{#if sidebarState.promptCount > 0}
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
{/if}

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
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    /* 淡入动画 */
    opacity: 0;
    animation: fadeIn 0.3s ease-out forwards;
  }

  /* 淡入关键帧 */
  @keyframes fadeIn {
    to {
      opacity: 1;
    }
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
