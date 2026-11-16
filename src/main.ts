import './styles/tokens.css';
import './styles/global.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { RollState } from './ui/state/rollState.svelte';

// The single app store, created here rather than at import time: constructing it reads persisted
// state and subscribes to the OS reduced-motion setting. App provides it to the containers.
const rollState = new RollState();

const app = mount(App, {
  target: document.getElementById('app')!,
  props: { rollState },
});

export default app;
