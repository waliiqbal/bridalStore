"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CollectionListItem } from "@/modules/collections/types/collections";
import { Button, LinkButton } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { Field, Input, Toggle } from "@/shared/admin/Form";
import { Card, Notice } from "@/shared/admin/Layout";
import { RichTextField } from "@/shared/admin/RichTextField";
import { createPage, deletePage, updatePage } from "../api/pages.api";
import type { LinkGroup } from "../lib/link-options";
import {
  HOME_SLUG,
  toPageFormState,
  toPageInput,
  validatePageTitle,
  type PageFormState,
} from "../lib/page-form";
import type { AdminPage } from "../types/pages";
import { SectionsEditor } from "./SectionsEditor";

export function PageForm({
  page,
  collections,
  linkGroups,
  onChanged,
}: {
  page: AdminPage | null;
  collections: CollectionListItem[];
  linkGroups: LinkGroup[];
  // Reload the saved page (after blocks change, or after saving)
  onChanged: () => void;
}) {
  const router = useRouter();
  const ui = useAdminUi();
  const [form, setForm] = useState<PageFormState>(() => toPageFormState(page));
  const [titleError, setTitleError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const editing = page !== null;
  const isHome = page?.slug === HOME_SLUG;
  const set = <K extends keyof PageFormState>(key: K, value: PageFormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function save() {
    const problem = validatePageTitle(form);
    setTitleError(problem);
    if (problem) {
      ui.error(new Error(problem));
      return;
    }
    setSaving(true);
    try {
      if (page) {
        await updatePage(page.id, toPageInput(form, page.slug));
        ui.success("Page saved.");
        onChanged();
      } else {
        const created = await createPage(toPageInput(form));
        ui.success("Page created.");
        router.replace(`/admin/pages/${created.id}`);
      }
    } catch (error) {
      ui.error(error);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!page) return;
    const ok = await ui.confirm({
      title: `Delete “${page.title}”?`,
      message: "The page will disappear from your website, and menu links to it will stop working.",
      confirmLabel: "Delete page",
      danger: true,
    });
    if (!ok) return;
    try {
      await deletePage(page.id);
      ui.success("Page deleted.");
      router.push("/admin/pages");
    } catch (error) {
      ui.error(error);
    }
  }

  const blocks = (
    <Card
      title={isHome ? "Homepage blocks" : "Extra blocks (optional)"}
      description={
        isHome
          ? "Build your homepage from blocks: banners, product rows, collection tiles and more."
          : "Add banners, product rows or other blocks below the page text."
      }
    >
      {page ? (
        <SectionsEditor
          pageId={page.id}
          sections={page.sections}
          collections={collections}
          linkGroups={linkGroups}
          onChanged={onChanged}
        />
      ) : (
        <Notice>Save the page first. Then you can add blocks here.</Notice>
      )}
    </Card>
  );

  const googleTitle = form.seoTitle.trim() || form.title.trim() || "Page title";

  return (
    <div className="max-w-4xl space-y-6 pb-4">
      <Card title="Basic information">
        <div className="space-y-5">
          <Field label="Page title" htmlFor="pg-title" required error={titleError}>
            <Input
              id="pg-title"
              value={form.title}
              maxLength={150}
              onChange={(event) => {
                set("title", event.target.value);
                setTitleError(null);
              }}
              placeholder="e.g. About us"
            />
          </Field>
          {isHome && (
            <Notice>
              This is your homepage, the first page customers see. Its address and visibility can&apos;t be
              changed.
            </Notice>
          )}
          {!isHome && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Toggle
                checked={form.isPublished}
                onChange={(value) => set("isPublished", value)}
                label="Show this page on the website"
                hint="Turn off to keep it as a draft."
              />
              <Toggle
                checked={form.showInFooter}
                onChange={(value) => set("showInFooter", value)}
                label="Link to it in the footer"
                hint="Adds it to the links at the bottom of every page."
              />
            </div>
          )}
        </div>
      </Card>

      {isHome && blocks}

      {!isHome && (
        <Card
          title="Page text"
          description="The main writing on this page, like your story, delivery times or returns policy."
        >
          <RichTextField
            id="pg-content"
            value={form.content}
            onChange={(html) => set("content", html)}
            placeholder="Write the page here…"
            minHeight={220}
          />
        </Card>
      )}

      {!isHome && blocks}

      <Card
        title="Search engines (Google)"
        description="How this page appears in Google. Leave empty and we'll use the page title."
      >
        <div className="space-y-5">
          <Field label="Page title for Google" htmlFor="pg-seo-title">
            <Input
              id="pg-seo-title"
              value={form.seoTitle}
              maxLength={200}
              onChange={(event) => set("seoTitle", event.target.value)}
              placeholder={form.title}
            />
          </Field>
          <Field label="Short description" htmlFor="pg-seo-desc">
            <textarea
              id="pg-seo-desc"
              value={form.seoDescription}
              maxLength={500}
              onChange={(event) => set("seoDescription", event.target.value)}
              className="min-h-20 w-full rounded-sm border border-line bg-white px-4 py-3 text-base outline-none focus:border-gold"
            />
          </Field>
          {!isHome && (
            <Field
              label="Web address"
              htmlFor="pg-slug"
              hint={
                editing
                  ? "Only change this if you have to. The old address will keep working and forward to the new one."
                  : "Leave empty and we'll make it from the title."
              }
            >
              <div className="flex items-center overflow-hidden rounded-sm border border-line focus-within:border-gold">
                <span className="shrink-0 bg-cream px-3 py-3.5 text-sm text-muted">/pages/</span>
                <input
                  id="pg-slug"
                  value={form.slug}
                  maxLength={120}
                  onChange={(event) => set("slug", event.target.value)}
                  className="h-12 min-w-0 flex-1 px-3 text-base outline-none"
                />
              </div>
            </Field>
          )}
          <div className="rounded-sm border border-line bg-cream/50 p-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-muted">Google preview</p>
            <p className="truncate text-lg text-blue-800">{googleTitle}</p>
            <p className="truncate text-xs text-emerald-800">
              yourstore.com{isHome ? "" : ` › pages › ${form.slug || "…"}`}
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-muted">
              {form.seoDescription.trim() || "No description yet."}
            </p>
          </div>
        </div>
      </Card>

      {editing && !isHome && (
        <Card title="Delete this page">
          <p className="mb-4 text-sm text-muted">Menu links to this page will stop working.</p>
          <Button variant="danger" onClick={remove}>
            Delete page
          </Button>
        </Card>
      )}

      <div className="sticky bottom-0 z-30 -mx-4 flex items-center justify-end gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <LinkButton href="/admin/pages" variant="secondary">
          Back to pages
        </LinkButton>
        <Button onClick={save} loading={saving}>
          {editing ? "Save changes" : "Create page"}
        </Button>
      </div>
    </div>
  );
}
