<script lang="ts">
  import { ICONS, CONFIG } from '@/config/constants';
  import { copyToClipboard } from '@/utils/clipboard';

  const { promptId, content } = $props<{
    promptId: string;
    content: string;
  }>();

  let isCopied = $state(false);

  async function handleCopy(event: MouseEvent) {
    event.stopPropagation();

    const success = await copyToClipboard(content);
    if (success) {
      isCopied = true;
      setTimeout(() => {
        isCopied = false;
      }, CONFIG.timing.copyFeedbackDuration);
    }
  }
</script>

<button
  class="ph-copy-button {isCopied ? 'copied' : ''}"
  data-id={promptId}
  onclick={handleCopy}
>
  {#if isCopied}
    {@html ICONS.CHECK}
  {:else}
    {@html ICONS.COPY}
  {/if}
</button>

<style>
  .ph-copy-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    padding: 2px;
    border: none;
    background: transparent;
    color: #999;
    cursor: pointer;
    transition: all 0.15s ease;
    border-radius: 3px;
    visibility: hidden;
    flex-shrink: 0;
  }

  /* 父元素悬停时显示按钮 */
  :global(.ph-link-item:hover) .ph-copy-button {
    visibility: visible;
  }

  .ph-copy-button:hover {
    color: #1a1a1a;
    background: rgba(0, 0, 0, 0.08);
  }

  .ph-copy-button.copied {
    color: #10b981;
  }

  .ph-copy-button :global(svg) {
    width: 12px;
    height: 12px;
  }
</style>
