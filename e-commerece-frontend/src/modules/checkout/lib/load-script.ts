// Loads a provider's own script (Stripe, Square, PayPal) the first time it is needed and only
// then, so the shop's pages never carry payment code until someone is actually paying.
// Asking twice for the same script gives the same loading promise, and a failed load can be retried.
const loading = new Map<string, Promise<void>>();

export function loadScript(src: string): Promise<void> {
  const existing = loading.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading.delete(src);
      script.remove();
      reject(new Error("We couldn't load the payment form. Please check your connection and try again."));
    };
    document.head.appendChild(script);
  });
  loading.set(src, promise);
  return promise;
}
