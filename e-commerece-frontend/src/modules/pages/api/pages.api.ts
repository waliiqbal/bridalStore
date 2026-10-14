import { apiFetch } from "@/infrastructure/http/api-client";
import type { AdminPage, PageInput, PageListItem, PageSection, SectionInput } from "../types/pages";

// Browser-side calls to /api/admin/pages (the admin cookie is sent automatically).

export const listPages = () => apiFetch<PageListItem[]>("/admin/pages");

export const getPage = (id: string) => apiFetch<AdminPage>(`/admin/pages/${id}`);

export const createPage = (input: PageInput) =>
  apiFetch<AdminPage>("/admin/pages", { method: "POST", body: input });

export const updatePage = (id: string, input: PageInput) =>
  apiFetch<AdminPage>(`/admin/pages/${id}`, { method: "PATCH", body: input });

export const deletePage = (id: string) =>
  apiFetch<{ deleted: true }>(`/admin/pages/${id}`, { method: "DELETE" });

export const addSection = (pageId: string, input: SectionInput) =>
  apiFetch<PageSection>(`/admin/pages/${pageId}/sections`, { method: "POST", body: input });

export const updateSection = (pageId: string, sectionId: string, input: SectionInput) =>
  apiFetch<PageSection>(`/admin/pages/${pageId}/sections/${sectionId}`, { method: "PATCH", body: input });

export const removeSection = (pageId: string, sectionId: string) =>
  apiFetch<{ deleted: true }>(`/admin/pages/${pageId}/sections/${sectionId}`, { method: "DELETE" });

export const reorderSections = (pageId: string, ids: string[]) =>
  apiFetch<{ reordered: number }>(`/admin/pages/${pageId}/sections/reorder`, {
    method: "PUT",
    body: { ids },
  });
