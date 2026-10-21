import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError, apiFetch } from "@/infrastructure/http/api-client";
import { CUSTOMER_COOKIE, LOGIN_PATH } from "./constants";
import type { Customer } from "./types/account";

// Server components only. These act on behalf of the signed-in shopper by forwarding their
// cookie to the backend. Nothing here is cached: it is one person's data.

async function customerCookie(): Promise<string | null> {
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  return token ? `${CUSTOMER_COOKIE}=${token}` : null;
}

// Who is signed in, or null. Asked once per page load however many components need it.
// A backend that is down counts as "not signed in" so the shop itself still opens.
export const getCustomer = cache(async (): Promise<Customer | null> => {
  const cookie = await customerCookie();
  if (!cookie) return null;
  try {
    const { customer } = await apiFetch<{ customer: Customer }>("/auth/me", { cookie });
    return customer;
  } catch {
    return null;
  }
});

// For pages that need a signed-in shopper. `next` is where to come back to after signing in.
export async function requireCustomer(next: string): Promise<Customer> {
  const customer = await getCustomer();
  if (!customer) redirect(`${LOGIN_PATH}?next=${encodeURIComponent(next)}`);
  return customer;
}

// GET one of the shopper's own resources. Sends them to sign in if their session has ended.
export async function accountGet<T>(path: string, next: string): Promise<T> {
  const cookie = await customerCookie();
  if (!cookie) redirect(`${LOGIN_PATH}?next=${encodeURIComponent(next)}`);
  try {
    return await apiFetch<T>(path, { cookie });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(`${LOGIN_PATH}?next=${encodeURIComponent(next)}`);
    }
    throw error;
  }
}
