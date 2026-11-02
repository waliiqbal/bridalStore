"use client";

import { useState } from "react";
import { CategorySelect } from "@/modules/catalog/components/CategorySelect";
import type { CategoryNode } from "@/modules/catalog/types/catalog";
import type { CollectionListItem } from "@/modules/collections/types/collections";
import type { PageListItem } from "@/modules/pages/types/pages";
import { SingleImageField } from "@/modules/uploads/components/SingleImageField";
import { IMAGE_PRESETS } from "@/modules/uploads/lib/image-presets";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { Field, Input, Select, Textarea } from "@/shared/admin/Form";
import { Notice } from "@/shared/admin/Layout";
import { Modal } from "@/shared/admin/Modal";
import { createMenuItem, updateMenuItem } from "../api/menus.api";
import {
  collectMenuIds,
  flattenMenu,
  HIGHLIGHTS,
  MENU_TYPES,
  newMenuItemForm,
  toMenuItemForm,
  toMenuItemInput,
  validateMenuItem,
  type MenuItemErrors,
  type MenuItemFormState,
} from "../lib/menu-form";
import type { AdminMenuItem, MenuItemType } from "../types/menus";

export type MenuItemTarget = { mode: "new"; parentId: string } | { mode: "edit"; item: AdminMenuItem };

export function MenuItemEditor({
  handle,
  target,
  items,
  categories,
  collections,
  pages,
  onClose,
  onSaved,
}: {
  handle: string;
  target: MenuItemTarget;
  // The whole menu, for the "sits inside" list
  items: AdminMenuItem[];
  categories: CategoryNode[];
  collections: CollectionListItem[];
  pages: PageListItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const ui = useAdminUi();
  const editing = target.mode === "edit";
  const [form, setForm] = useState<MenuItemFormState>(() =>
    target.mode === "edit" ? toMenuItemForm(target.item) : newMenuItemForm(target.parentId),
  );
  const [errors, setErrors] = useState<MenuItemErrors>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof MenuItemFormState>(key: K, value: MenuItemFormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const excluded = new Set(target.mode === "edit" ? collectMenuIds(target.item) : []);
  const parents = flattenMenu(items, excluded);
  const typeHint = MENU_TYPES.find((t) => t.type === form.type)?.hint;

  async function save() {
    const found = validateMenuItem(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      ui.error(new Error(found.label ?? found.target ?? "Please fix the highlighted fields."));
      return;
    }
    setSaving(true);
    try {
      const input = toMenuItemInput(form);
      if (target.mode === "edit") {
        const moved = form.parentId !== (target.item.parentId ?? "");
        await updateMenuItem(handle, target.item.id, {
          ...input,
          ...(moved && { parentId: form.parentId || null }),
        });
      } else {
        await createMenuItem(handle, { ...input, parentId: form.parentId || null });
      }
      ui.success(editing ? "Menu item saved." : "Menu item added.");
      onSaved();
    } catch (error) {
      ui.error(error);
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={editing ? "Edit menu item" : "Add menu item"}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            {editing ? "Save changes" : "Add to menu"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field
          label={form.type === "TEXT" ? "The words" : "Words customers read"}
          htmlFor="m-label"
          required
          error={errors.label}
        >
          {form.type === "TEXT" ? (
            <Textarea
              id="m-label"
              value={form.label}
              maxLength={300}
              rows={3}
              autoFocus
              placeholder="e.g. Planning a celebration? Tell us about your event."
              onChange={(event) => {
                set("label", event.target.value);
                setErrors((current) => ({ ...current, label: undefined }));
              }}
            />
          ) : (
            <Input
              id="m-label"
              value={form.label}
              maxLength={300}
              autoFocus
              placeholder="e.g. Lehenga"
              onChange={(event) => {
                set("label", event.target.value);
                setErrors((current) => ({ ...current, label: undefined }));
              }}
            />
          )}
        </Field>

        <Field label="What does it open?" htmlFor="m-type" hint={typeHint}>
          <Select
            id="m-type"
            value={form.type}
            onChange={(event) => {
              set("type", event.target.value as MenuItemType);
              setErrors((current) => ({ ...current, target: undefined }));
            }}
          >
            {MENU_TYPES.map((option) => (
              <option key={option.type} value={option.type}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        {form.type === "CATEGORY" && (
          <Field label="Category" htmlFor="m-category" required error={errors.target}>
            <CategorySelect
              id="m-category"
              tree={categories}
              value={form.categoryId}
              onChange={(id) => set("categoryId", id)}
              emptyLabel="Choose a category…"
            />
          </Field>
        )}
        {form.type === "COLLECTION" && (
          <Field label="Collection" htmlFor="m-collection" required error={errors.target}>
            <Select
              id="m-collection"
              value={form.collectionId}
              onChange={(event) => set("collectionId", event.target.value)}
            >
              <option value="">Choose a collection…</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.title}
                  {collection.isPublished ? "" : " (draft)"}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {form.type === "PAGE" && (
          <Field label="Page" htmlFor="m-page" required error={errors.target}>
            <Select id="m-page" value={form.pageId} onChange={(event) => set("pageId", event.target.value)}>
              <option value="">Choose a page…</option>
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.slug === "home" ? "Home page" : page.title}
                  {page.isPublished ? "" : " (draft)"}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {form.type === "URL" && (
          <Field label="Web address" htmlFor="m-url" required error={errors.target}>
            <Input
              id="m-url"
              value={form.url}
              maxLength={2000}
              placeholder="/pages/about  or  https://…"
              onChange={(event) => set("url", event.target.value)}
            />
          </Field>
        )}
        {form.type === "HEADING" && (
          <Notice>
            A group title doesn&apos;t open anything. Put links <strong>inside</strong> it using “Add inside”
            on its row, and they appear under this title in the big menu. A title with nothing inside is
            hidden. In the <strong>Footer menu</strong>, each group title is one column of the footer, and a
            picture on it (like your logo) is shown instead of the title words.
          </Notice>
        )}
        {form.type === "TEXT" && (
          <Notice>
            Plain words with no link. Put it <strong>inside</strong> a footer column using “Add inside”. For an
            email, a phone number or WhatsApp, use “A web address” instead: <strong>mailto:you@shop.com</strong>,{" "}
            <strong>tel:+61400000000</strong> or <strong>https://wa.me/61400000000</strong>. They get their own
            little icon in the footer.
          </Notice>
        )}

        <Field
          label="Sits inside"
          htmlFor="m-parent"
          hint="Leave at the top to show it in the main row. Pick another item to put this one under it."
        >
          <Select
            id="m-parent"
            value={form.parentId}
            onChange={(event) => set("parentId", event.target.value)}
          >
            <option value="">Top of the menu</option>
            {parents.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Make it stand out" htmlFor="m-highlight" hint="For example, show Sale in red.">
          <Select
            id="m-highlight"
            value={form.highlight}
            onChange={(event) => set("highlight", event.target.value)}
          >
            {HIGHLIGHTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Picture (optional)"
          hint="In the big menu this is a small picture tile. On a footer column (a group title) it is shown instead of the title words, which is how the logo is shown."
        >
          <SingleImageField
            value={form.imageUrl}
            onChange={(url) => set("imageUrl", url)}
            alt={form.label}
            preset={handle === "footer" ? IMAGE_PRESETS.footerLogo : IMAGE_PRESETS.menuTile}
          />
        </Field>
      </div>
    </Modal>
  );
}
