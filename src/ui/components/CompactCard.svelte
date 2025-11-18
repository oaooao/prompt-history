<script lang="ts">
  import { sidebarState } from '@/ui/stores/sidebar.svelte';
  import { SELECTORS } from '@/config/constants';

  let showDelayed = $state(false);

  function handleClick() {
    if (sidebarState.isCollapsed) {
      sidebarState.toggleCollapse();
    }
  }

  // 监听折叠状态变化，延迟显示小卡片
  $effect(() => {
    if (sidebarState.isCollapsed) {
      // 延迟 250ms 显示小卡片（等待动画完成）
      const timer = setTimeout(() => {
        showDelayed = true;
      }, 250);

      return () => clearTimeout(timer);
    }

    showDelayed = false;
    return undefined;
  });
</script>

<div
  id={SELECTORS.COMPACT_CARD}
  class={`${SELECTORS.COMPACT_CARD} ${showDelayed ? 'visible' : ''}`}
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
  <span class="ph-compact-badge">{sidebarState.promptCount}</span>
  <span class="ph-compact-label">Prompts</span>
</div>

<style>
  .ph-compact-card {
    position: fixed;
    top: 90px;
    right: 24px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    font-size: 13px;
    color: #666;
    cursor: pointer;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 99;
  }

  .ph-compact-card.visible {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  .ph-compact-card:hover {
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(0, 0, 0, 0.1);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }

  .ph-compact-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    background: rgba(0, 0, 0, 0.05);
    color: #666;
    font-size: 12px;
    font-weight: 600;
    border-radius: 11px;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  .ph-compact-label {
    font-size: 13px;
    font-weight: 500;
    color: inherit;
    white-space: nowrap;
  }
</style>
