import { apiFetch } from "@/infrastructure/http/api-client";
import type { AdminSettings, SettingsInput } from "../types/settings";

// Browser-side calls to /api/admin/settings (the admin cookie is sent automatically).

export const getSettings = () => apiFetch<AdminSettings>("/admin/settings");

export const updateSettings = (input: SettingsInput) =>
  apiFetch<AdminSettings>("/admin/settings", { method: "PATCH", body: input });
