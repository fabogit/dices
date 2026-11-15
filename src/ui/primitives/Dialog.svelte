<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    open: boolean;
    title: string;
    onClose: () => void;
    children: Snippet;
  }

  let { open, title, onClose, children }: Props = $props();

  const uid = $props.id();
  const titleId = `${uid}-title`;

  let dialogEl: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!dialogEl) return;
    if (open && !dialogEl.open) {
      dialogEl.showModal();
    } else if (!open && dialogEl.open) {
      dialogEl.close();
    }
  });

  function handleDialogClose() {
    if (open) {
      onClose();
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === dialogEl) {
      dialogEl?.close();
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
  bind:this={dialogEl}
  class="dialog-root"
  aria-labelledby={titleId}
  onclose={handleDialogClose}
  onclick={handleBackdropClick}
>
  <div class="dialog-content">
    <h2 id={titleId} class="dialog-title">{title}</h2>
    {@render children()}
  </div>
</dialog>

<style>
  .dialog-root {
    padding: 0;
    border: none;
    background: transparent;
    color: inherit;
    width: 100%;
    max-width: min(360px, calc(100vw - 2rem));
    margin: auto;
    border-radius: 0.75rem;
    overflow: visible;
  }

  .dialog-root::backdrop {
    background: rgba(3, 7, 18, 0.75);
    backdrop-filter: blur(4px);
  }

  .dialog-content {
    box-sizing: border-box;
    background: var(--surface-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 0.75rem;
    padding: 1.5rem;
    width: 100%;
    max-width: 360px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  }

  .dialog-title {
    margin: 0 0 1rem 0;
    font-size: 1.15rem;
    color: var(--text-primary);
  }
</style>
