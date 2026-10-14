import { cookies } from "next/headers";
import { ApiError, apiFetch } from "@/infrastructure/http/api-client";
import { ADMIN_COOKIE } from "../constants";
import type { AdminProfile } from "../types/admin";

// Server components only. Asks the backend who the signed-in admin is by
// forwarding the admin cookie. Returns null when nobody is signed in or the
// session has expired; any other failure (backend down) is thrown.
export async function getAdminSession(): Promise<AdminProfile | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  try {
    const { admin } = await apiFetch<{ admin: AdminProfile }>("/admin/auth/me", {
      cookie: `${ADMIN_COOKIE}=${token}`,
    });
    return admin;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}
