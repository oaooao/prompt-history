<script lang="ts">
  import type { Prompt } from '@/types/Prompt';
  import { CONFIG, SELECTORS } from '@/config/constants';
  import { EventType } from '@/types/Events';
  import { EventBus } from '@/core/events/EventBus';
  import { scrollToElement } from '@/utils/dom';
  import { Logger } from '@/utils/logger';
  import CopyButton from './CopyButton.svelte';

  const { prompt, isActive, onActivate } = $props<{
    prompt: Prompt;
    isActive: boolean;
    onActivate: () => void;
  }>();

  // 计算预览文本
  const preview = $derived(
    prompt.content.length > CONFIG.ui.previewLength
      ? prompt.content.substring(0, CONFIG.ui.previewLength) + '...'
      : prompt.content
  );

  // 处理点击跳转
  function handleClick() {
    // 滚动到元素
    if (prompt.element) {
      scrollToElement(prompt.element);
      Logger.debug('PromptItem', `Navigated to prompt: ${prompt.id}`);
    } else {
      Logger.warn('PromptItem', `Prompt ${prompt.id} has no element`);
    }

    // 设置激活状态
    onActivate();

    // 触发事件
    const eventBus = EventBus.getInstance();
    eventBus.emit(EventType.PROMPT_SELECTED, prompt.id);
  }
</script>

<div
  class={`${SELECTORS.LINK_ITEM} ${isActive ? SELECTORS.ACTIVE : ''}`}
  data-id={prompt.id}
  onclick={handleClick}
  role="button"
  tabindex="0"
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
>
  <span class="prompt-text">{preview}</span>
  <CopyButton promptId={prompt.id} content={prompt.content} />
</div>

<style>
  .ph-link-item {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 0;
    color: #666;
    font-size: 13px;
    line-height: 1.6;
    text-decoration: none;
    transition: all 0.15s ease;
    cursor: pointer;
    gap: 8px;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  /* 链接左侧指示器 - 在分隔线上水平居中，颜色跟随文字 */
  .ph-link-item::before {
    content: '';
    position: absolute;
    left: -17px; /* -16px padding - 1px 偏移，让 3px 条在 1px 线上居中 */
    top: 6px;
    bottom: 6px;
    width: 3px;
    background: currentColor;
    border-radius: 2px;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .ph-link-item:hover {
    color: #404040;
  }

  .ph-link-item:hover::before {
    opacity: 0.3;
  }

  .ph-link-item.active {
    color: #1a1a1a;
  }

  .ph-link-item.active::before {
    opacity: 1;
  }

  .prompt-text {
    flex: 1;
    color: inherit;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
