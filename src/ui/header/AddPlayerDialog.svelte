<script lang="ts">
  import { MAX_PLAYER_NAME_LENGTH } from '../../core/persistence';
  import Dialog from '../primitives/Dialog.svelte';

  interface Props {
    open: boolean;
    /** Controlled value of the name field. */
    name: string;
    /** Validation message for the last submit; omit when the name is valid. */
    error?: string;
    onNameInput: (name: string) => void;
    onSubmit: (name: string) => void;
    onClose: () => void;
  }

  const { open, name, error, onNameInput, onSubmit, onClose }: Props = $props();

  const uid = $props.id();
  const inputId = `${uid}-input`;
  const errorId = `${uid}-error`;

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    onSubmit(name);
  }
</script>

<!-- Add Player Dialog / Modal -->
<Dialog {open} title="Add Local Player" {onClose}>
  <form onsubmit={handleSubmit} class="modal-form">
    <label for={inputId} class="modal-label">Player Name:</label>
    <!-- svelte-ignore a11y_autofocus -->
    <input
      id={inputId}
      type="text"
      maxlength={MAX_PLAYER_NAME_LENGTH}
      value={name}
      oninput={(e) => onNameInput(e.currentTarget.value)}
      placeholder="e.g. Robin"
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? errorId : undefined}
      autofocus
      class="modal-input"
    />
    {#if error}
      <p id={errorId} class="modal-error" role="alert">{error}</p>
    {/if}
    <div class="modal-actions">
      <button type="button" class="modal-btn cancel" onclick={onClose}> Cancel </button>
      <button type="submit" class="modal-btn confirm"> Add Player </button>
    </div>
  </form>
</Dialog>

<style>
  .modal-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .modal-label {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .modal-input {
    padding: 0.5rem 0.75rem;
    min-block-size: 38px;
    background: var(--surface-dark);
    border: 1px solid var(--border-muted);
    border-radius: 0.375rem;
    color: var(--text-primary);
    font-size: 0.95rem;
  }

  .modal-input[aria-invalid='true'] {
    border-color: var(--color-danger);
  }

  .modal-error {
    margin: 0;
    font-size: 0.8rem;
    color: var(--color-danger-light);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .modal-btn {
    padding: 0.5rem 1rem;
    min-block-size: 36px;
    border-radius: 0.375rem;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }

  .modal-btn.cancel {
    background: transparent;
    border: 1px solid var(--border-muted);
    color: var(--text-secondary);
  }

  .modal-btn.confirm {
    background: var(--primary-blue);
    border: 1px solid var(--accent-blue);
    color: var(--text-white);
  }

  button:focus-visible,
  input:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 2px;
  }
</style>
