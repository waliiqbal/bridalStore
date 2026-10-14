import { env } from "@/config/env";

// The one place that talks to the backend: base URL, cookies, CSRF header, errors.

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiOptions {
  method?: Method;
  // Sent as JSON, or as multipart when it is a FormData
  body?: unknown;
  // Server-side only: forward the visitor's cookies (e.g. "admin_token=...")
  cookie?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

const NETWORK_ERROR = "We can't reach the server right now. Please try again in a moment.";

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, cookie, headers, signal } = options;

  const isForm = typeof FormData !== "undefined" && body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(`${env.apiUrl}${path}`, {
      method,
      credentials: "include",
      cache: "no-store",
      signal,
      headers: {
        Accept: "application/json",
        // FormData sets its own multipart Content-Type (with the boundary)
        ...(body !== undefined && !isForm && { "Content-Type": "application/json" }),
        // The API rejects POST/PUT/PATCH/DELETE without this header (CSRF protection)
        ...(method !== "GET" && { "X-Requested-With": "XMLHttpRequest" }),
        ...(cookie && { Cookie: cookie }),
        ...headers,
      },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, NETWORK_ERROR);
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) throw new ApiError(res.status, errorMessage(data, res.status), data);
  return data as T;
}

function errorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object" && "message" in data) {
    const { message } = data as { message: unknown };
    if (Array.isArray(message) && message.length > 0) return String(message[0]);
    if (typeof message === "string" && message) return message;
  }
  return status >= 500 ? "Something went wrong. Please try again." : `Request failed (${status})`;
}
