import { apiFetch } from "@/infrastructure/http/api-client";
import type { AdminProfile } from "../types/admin";

// Browser-side calls. The backend sets / clears the httpOnly admin cookie.

export function loginAdmin(email: string, password: string) {
  return apiFetch<{ admin: AdminProfile }>("/admin/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function logoutAdmin() {
  return apiFetch<{ success: true }>("/admin/auth/logout", { method: "POST" });
}
