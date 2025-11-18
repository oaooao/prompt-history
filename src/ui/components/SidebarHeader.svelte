<script lang="ts">
  import { sidebarState } from '@/ui/stores/sidebar.svelte';
  import { SELECTORS, ICONS, CONFIG } from '@/config/constants';
  import { copyMultiple } from '@/utils/clipboard';

  let isCopied = $state(false);

  async function handleCopyAll() {
    const contents = sidebarState.prompts.map((p) => p.content);
    const success = await copyMultiple(contents);
    if (success) {
      isCopied = true;
      setTimeout(() => {
        isCopied = false;
      }, CONFIG.timing.copyFeedbackDuration);
    }
  }

  function handleToggle() {
    sidebarState.toggleCollapse();
  }
</script>

<div class={SELECTORS.HEADER}>
  <h3>Prompts</h3>
  {#if sidebarState.promptCount > 0}
    <div class={SELECTORS.HEADER_ACTIONS}>
      <button
        class="{SELECTORS.COPY_ALL_BUTTON} {isCopied ? 'copied' : ''}"
        onclick={handleCopyAll}
      >
        {#if isCopied}
          {@html ICONS.CHECK}
        {:else}
          {@html ICONS.COPY}
        {/if}
      </button>
      <button
        class={SELECTORS.TOGGLE_BUTTON}
        onclick={handleToggle}
      >
        <span class="ph-toggle-icon ph-toggle-icon-collapse"
          >{@html ICONS.CHEVRON_RIGHT}</span
        >
        <span class="ph-toggle-icon ph-toggle-icon-expand"
          >{@html ICONS.CHEVRON_LEFT}</span
        >
      </button>
    </div>
  {/if}
</div>

<style>
  .ph-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    gap: 8px;
  }

  .ph-header h3 {
    margin: 0;
    padding: 0;
    font-size: 13px;
    font-weight: 600;
    color: #666;
    letter-spacing: 0.025em;
    flex: 1;
  }

  .ph-header-actions {
    display: flex;
    gap: 8px;
  }

  .ph-copy-all-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: none;
    background: transparent;
    color: #999;
    cursor: pointer;
    transition: all 0.15s ease;
    border-radius: 3px;
  }

  .ph-copy-all-button:hover {
    color: #1a1a1a;
    background: rgba(0, 0, 0, 0.08);
  }

  .ph-copy-all-button.copied {
    color: #10b981;
  }

  .ph-toggle-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: none;
    background: transparent;
    color: #999;
    cursor: pointer;
    transition: all 0.15s ease;
    border-radius: 3px;
  }

  .ph-toggle-button:hover {
    color: #1a1a1a;
    background: rgba(0, 0, 0, 0.08);
  }

  .ph-toggle-icon {
    display: inline-block;
    transition: opacity 0.2s ease;
  }

  /* 展开状态 - 显示右箭头（>>），表示可以收起 */
  .ph-toggle-icon-expand {
    display: none;
  }

  .ph-toggle-icon-collapse {
    display: inline-block;
  }

  /* 收起状态 - 显示左箭头（<<），表示可以展开 */
  :global(#prompt-history-sidebar.collapsed) .ph-toggle-icon-expand {
    display: inline-block;
  }

  :global(#prompt-history-sidebar.collapsed) .ph-toggle-icon-collapse {
    display: none;
  }

  .ph-copy-all-button :global(svg),
  .ph-toggle-button :global(svg) {
    width: 14px;
    height: 14px;
  }
</style>
