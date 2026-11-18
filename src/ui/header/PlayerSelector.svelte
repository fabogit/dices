<script lang="ts">
  import type { Player } from '../../core/types';

  interface Props {
    players: ReadonlyArray<Player>;
    activePlayerId: string;
    disabled: boolean;
    onSelect: (playerId: string) => void;
    onAddPlayer: () => void;
  }

  const { players, activePlayerId, disabled, onSelect, onAddPlayer }: Props = $props();

  const uid = $props.id();
  const selectId = `${uid}-player-select`;
</script>

<!-- Player Selector & Actions (Series Mode Only) -->
<div class="player-selector-group">
  <label for={selectId} class="player-label">Player:</label>
  <select
    id={selectId}
    class="player-select"
    value={activePlayerId}
    {disabled}
    onchange={(e) => onSelect(e.currentTarget.value)}
  >
    {#each players as p (p.id)}
      <option value={p.id}>{p.name}</option>
    {/each}
  </select>

  <button
    type="button"
    class="btn-add-player"
    {disabled}
    onclick={onAddPlayer}
    aria-label="Add new local player"
  >
    + Player
  </button>
</div>

<style>
  .player-selector-group {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .player-label {
    font-size: 0.825rem;
    color: var(--text-secondary);
  }

  .player-select {
    padding: 0.35rem 0.65rem;
    min-block-size: 32px;
    background: var(--surface-elevated);
    border: 1px solid var(--border-muted);
    border-radius: 0.375rem;
    color: var(--text-primary);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-add-player {
    padding: 0.35rem 0.65rem;
    min-block-size: 32px;
    background: transparent;
    border: 1px dashed var(--border-dashed);
    border-radius: 0.375rem;
    color: var(--accent-blue);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-add-player:hover:not(:disabled) {
    border-color: var(--accent-blue);
    background: rgba(56, 189, 248, 0.1);
  }

  .player-select:disabled,
  .btn-add-player:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  button:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 2px;
  }
</style>
