<script lang="ts">
  import { untrack, type Component } from 'svelte';
  import type { RollState } from '../state/rollState.svelte';
  import { setRollState } from '../state/rollStateContext';

  // Test-only root: provides an injected store to a container, the way App does in the app
  const props: { rollState: RollState; component: Component } = $props();
  setRollState(untrack(() => props.rollState));
</script>

<props.component />
