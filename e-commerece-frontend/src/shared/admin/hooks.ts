"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/infrastructure/http/api-client";
import { ADMIN_LOGIN_PATH } from "@/modules/auth/constants";

interface QueryResult<T> {
  key: string;
  data?: T;
  error?: string;
}

// Loads data for an admin screen. Re-runs when `deps` change or reload() is
// called, and keeps showing the previous data while the new data loads.
export function useAdminQuery<T>(fetcher: () => Promise<T>, deps: readonly unknown[]) {
  const router = useRouter();
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<QueryResult<T>>({ key: "" });
  const key = `${JSON.stringify(deps)}#${tick}`;

  const run = useEffectEvent(fetcher);

  useEffect(() => {
    let cancelled = false;
    run()
      .then((data) => {
        if (!cancelled) setResult({ key, data });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          router.replace(`${ADMIN_LOGIN_PATH}?expired=1`);
          return;
        }
        setResult({
          key,
          error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [key, router]);

  return {
    data: result.data,
    error: result.key === key ? (result.error ?? null) : null,
    loading: result.key !== key,
    reload: () => setTick((n) => n + 1),
  };
}

// A value that only updates after `delay` ms of quiet (for search boxes)
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
