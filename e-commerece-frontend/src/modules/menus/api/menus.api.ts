import { apiFetch } from "@/infrastructure/http/api-client";
import type { AdminMenu, AdminMenuItem, MenuItemInput, MenuSummary } from "../types/menus";

// Browser-side calls to /api/admin/menus (the admin cookie is sent automatically).

export const listMenus = () => apiFetch<MenuSummary[]>("/admin/menus");

export const getMenu = (handle: string) => apiFetch<AdminMenu>(`/admin/menus/${handle}`);

export const createMenuItem = (handle: string, input: MenuItemInput) =>
  apiFetch<AdminMenuItem>(`/admin/menus/${handle}/items`, { method: "POST", body: input });

export const updateMenuItem = (handle: string, itemId: string, input: MenuItemInput) =>
  apiFetch<AdminMenuItem>(`/admin/menus/${handle}/items/${itemId}`, { method: "PATCH", body: input });

export const deleteMenuItem = (handle: string, itemId: string) =>
  apiFetch<{ deleted: true }>(`/admin/menus/${handle}/items/${itemId}`, { method: "DELETE" });

// `parentId` is the parent whose children are being put in order (null = top level)
export const reorderMenuItems = (handle: string, parentId: string | null, ids: string[]) =>
  apiFetch<{ reordered: number }>(`/admin/menus/${handle}/items/reorder`, {
    method: "PUT",
    body: { parentId, ids },
  });
