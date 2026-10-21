import { apiFetch } from "@/infrastructure/http/api-client";
import type { AdminCurrency, CurrencyInput } from "../types/currencies";

// Browser-side calls to /api/admin/currencies (the admin cookie is sent automatically).

export const listCurrencies = () => apiFetch<AdminCurrency[]>("/admin/currencies");

export const createCurrency = (input: CurrencyInput) =>
  apiFetch<AdminCurrency>("/admin/currencies", { method: "POST", body: input });

export const updateCurrency = (code: string, input: Partial<CurrencyInput>) =>
  apiFetch<AdminCurrency>(`/admin/currencies/${code}`, { method: "PATCH", body: input });

export const deleteCurrency = (code: string) =>
  apiFetch<{ deleted: true }>(`/admin/currencies/${code}`, { method: "DELETE" });
