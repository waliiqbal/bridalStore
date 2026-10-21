import { apiFetch } from "@/infrastructure/http/api-client";
import type { DashboardData } from "../types/dashboard";

// Browser-side call (the admin cookie is sent automatically)
export const getDashboard = () => apiFetch<DashboardData>("/admin/dashboard");
