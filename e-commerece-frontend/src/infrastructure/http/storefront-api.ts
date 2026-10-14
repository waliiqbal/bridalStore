import { env } from "@/config/env";
import { ApiError } from "./api-client";

// Server-side reads for the public shop. Unlike the admin client, answers are CACHED and
// tagged with the same names the backend sends (see CLAUDE.md "Storefront cache tags"), so
// an admin change refreshes exactly the pages that show it. `revalidate` is only a safety
// net in case a refresh message is ever missed.

interface Options {
  tags: string[];
  // Seconds before a cached answer is re-checked even without a refresh message
  revalidate?: number;
}

export async function storefrontFetch<T>(path: string, { tags, revalidate = 60 }: Options): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${env.apiUrl}${path}`, {
      headers: { Accept: "application/json" },
      cache: "force-cache",
      next: { tags, revalidate },
    });
  } catch {
    throw new ApiError(0, "We can't reach the shop right now. Please try again in a moment.");
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message =
      data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}

// Same, but a 404 gives null (a page that doesn't exist) instead of an error
export async function storefrontFetchOrNull<T>(path: string, options: Options): Promise<T | null> {
  try {
    return await storefrontFetch<T>(path, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
