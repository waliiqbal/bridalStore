// One random key per checkout attempt. Sent with the order so that pressing the button twice,
// or retrying after the connection dropped, returns the SAME order instead of making two.
// (crypto.randomUUID only exists on secure pages, so there is a plain fallback.)
export function newIdempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `key-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
