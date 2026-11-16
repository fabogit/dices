import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { RollState } from '../rollState.svelte';

type Handler = (event: MediaQueryListEvent) => void;

function stubMatchMedia(matches = false) {
  const handlers = new Set<Handler>();
  const addEventListener = vi.fn<
    (type: string, cb: Handler, options?: { signal?: AbortSignal }) => void
  >((_type, cb, options) => {
    handlers.add(cb);
    options?.signal?.addEventListener('abort', () => handlers.delete(cb));
  });
  const removeEventListener = vi.fn<(type: string, cb: Handler) => void>((_type, cb) => {
    handlers.delete(cb);
  });
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches, addEventListener, removeEventListener }),
  );
  const emit = (next: boolean) => {
    for (const cb of handlers) cb({ matches: next } as MediaQueryListEvent);
  };
  return { handlers, addEventListener, removeEventListener, emit };
}

describe('RollState reduced-motion listener', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('follows OS changes while the user has not chosen', () => {
    const mq = stubMatchMedia(false);
    const s = new RollState();
    mq.emit(true);
    expect(s.instantMode).toBe(true);
    mq.emit(false);
    expect(s.instantMode).toBe(false);
    s.dispose();
  });

  it('ignores OS changes after a manual toggle', () => {
    const mq = stubMatchMedia(false);
    const s = new RollState();
    s.toggleInstantMode();
    expect(s.instantMode).toBe(true);
    mq.emit(false);
    expect(s.instantMode).toBe(true);
    s.toggleInstantMode();
    mq.emit(true);
    expect(s.instantMode).toBe(false);
    s.dispose();
  });

  it('dispose removes the listener and is idempotent', () => {
    const mq = stubMatchMedia(false);
    const s = new RollState();
    expect(mq.handlers.size).toBe(1);
    s.dispose();
    expect(mq.handlers.size).toBe(0);
    expect(mq.removeEventListener).toHaveBeenCalledTimes(1);
    expect(() => s.dispose()).not.toThrow();
    mq.emit(true);
    expect(s.instantMode).toBe(false);
  });

  it('works without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    const s = new RollState();
    expect(s.instantMode).toBe(false);
    expect(() => s.dispose()).not.toThrow();
  });
});
