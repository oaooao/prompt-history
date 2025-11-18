<script lang="ts">
  import { sidebarState } from '@/ui/stores/sidebar.svelte';
  import { SELECTORS } from '@/config/constants';
  import PromptItem from './PromptItem.svelte';
</script>

<div class={SELECTORS.LINKS} id="prompt-list">
  {#if sidebarState.prompts.length === 0}
    <div class="empty-state">暂无 Prompts</div>
  {:else}
    {#each sidebarState.prompts as prompt (prompt.id)}
      <PromptItem
        {prompt}
        isActive={prompt.id === sidebarState.currentActiveId}
        onActivate={() => sidebarState.setActive(prompt.id)}
      />
    {/each}
  {/if}
</div>

<style>
  .ph-links {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0;
    padding-left: 16px;
  }

  /* 左侧竖线 - 只覆盖链接列表区域 */
  .ph-links::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 1px;
    background: #e5e5e5;
  }

  .empty-state {
    padding: 24px;
    text-align: center;
    color: #999;
    font-size: 14px;
  }
</style>
