/**
 * Tiny global "network in flight" store.
 *
 * Every Supabase REST/RPC call goes through the tracked fetch below, so the
 * top loading bar reflects real data loading without touching each screen.
 */

let pending = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function subscribeProgress(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPending(): number {
  return pending;
}

export function beginLoad() {
  pending += 1;
  emit();
}

export function endLoad() {
  pending = Math.max(0, pending - 1);
  emit();
}

/** fetch wrapper that reports activity to the loading bar. */
export const trackedFetch: typeof fetch = async (input, init) => {
  beginLoad();
  try {
    return await fetch(input as RequestInfo, init);
  } finally {
    endLoad();
  }
};
