import type { AdminPage, PageInput } from "../types/pages";

export const HOME_SLUG = "home";

export interface PageFormState {
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
  showInFooter: boolean;
  seoTitle: string;
  seoDescription: string;
}

export function toPageFormState(page: AdminPage | null): PageFormState {
  return {
    title: page?.title ?? "",
    slug: page?.slug ?? "",
    content: page?.content ?? "",
    isPublished: page?.isPublished ?? true,
    showInFooter: page?.showInFooter ?? true,
    seoTitle: page?.seoTitle ?? "",
    seoDescription: page?.seoDescription ?? "",
  };
}

export const validatePageTitle = (form: PageFormState): string | null =>
  form.title.trim() ? null : "Please give this page a title.";

const orNull = (text: string) => (text.trim() ? text.trim() : null);

// `savedSlug` is the web address already stored (edit); it's only sent if changed.
// The home page's address, and whether it is published, are fixed by the server.
export function toPageInput(form: PageFormState, savedSlug?: string): PageInput {
  const isHome = savedSlug === HOME_SLUG;
  const slug = form.slug.trim();
  return {
    title: form.title.trim(),
    ...(!isHome && slug && slug !== savedSlug && { slug }),
    content: orNull(form.content),
    ...(!isHome && { isPublished: form.isPublished, showInFooter: form.showInFooter }),
    seoTitle: orNull(form.seoTitle),
    seoDescription: orNull(form.seoDescription),
  };
}
