"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductListItem } from "@/modules/catalog/types/catalog";
import type { Attribute, CategoryNode } from "@/modules/catalog/types/catalog";
import { SingleImageField } from "@/modules/uploads/components/SingleImageField";
import { Button, LinkButton } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { Field, Input, Select, Toggle } from "@/shared/admin/Form";
import { Card, Notice } from "@/shared/admin/Layout";
import { RichTextField } from "@/shared/admin/RichTextField";
import {
  addCollectionProducts,
  createCollection,
  deleteCollection,
  removeCollectionProduct,
  reorderCollectionProducts,
  updateCollection,
} from "../api/collections.api";
import {
  SORT_LABELS,
  sortOptionsFor,
  toCollectionInput,
  toFormState,
  validateCollection,
  type CollectionFormErrors,
  type CollectionFormState,
} from "../lib/collection-form";
import { newRule } from "../lib/rule-fields";
import type { AdminCollection, CollectionProductItem, CollectionType } from "../types/collections";
import { ManualProductsEditor } from "./ManualProductsEditor";
import { RuleBuilder } from "./RuleBuilder";
import { RulePreview } from "./RulePreview";

const toItem = (product: ProductListItem): CollectionProductItem => ({
  id: product.id,
  name: product.name,
  slug: product.slug,
  status: product.status,
  price: product.price,
  imageUrl: product.imageUrl,
});

export function CollectionForm({
  collection,
  categories,
  attributes,
  onChanged,
}: {
  collection: AdminCollection | null;
  categories: CategoryNode[];
  attributes: Attribute[];
  // Reload the saved collection (after products change, or after saving)
  onChanged: () => void;
}) {
  const router = useRouter();
  const ui = useAdminUi();
  const [form, setForm] = useState<CollectionFormState>(() => toFormState(collection));
  // New collections: products chosen before the first save
  const [queued, setQueued] = useState<CollectionProductItem[]>([]);
  const [errors, setErrors] = useState<CollectionFormErrors>({});
  const [saving, setSaving] = useState(false);

  const editing = collection !== null;
  const set = <K extends keyof CollectionFormState>(key: K, value: CollectionFormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  function chooseType(type: CollectionType) {
    if (type === form.type) return;
    setForm((current) => ({
      ...current,
      type,
      // "Your own order" only exists for hand-picked collections
      defaultSort:
        type === "MANUAL"
          ? "MANUAL"
          : current.defaultSort === "MANUAL"
            ? "BEST_SELLING"
            : current.defaultSort,
      rules: type === "SMART" && current.rules.length === 0 ? [newRule()] : current.rules,
    }));
  }

  async function save() {
    const found = validateCollection(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      ui.error(new Error(found.title ?? found.rules ?? "Please fix the highlighted fields."));
      return;
    }
    setSaving(true);
    try {
      if (collection) {
        await updateCollection(collection.id, toCollectionInput(form, collection.slug));
        ui.success("Collection saved.");
        onChanged();
      } else {
        const created = await createCollection(toCollectionInput(form));
        if (form.type === "MANUAL" && queued.length > 0) {
          try {
            await addCollectionProducts(
              created.id,
              queued.map((item) => item.id),
            );
          } catch (error) {
            ui.error(error);
          }
        }
        ui.success("Collection created.");
        router.replace(`/admin/collections/${created.id}`);
      }
    } catch (error) {
      ui.error(error);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!collection) return;
    const ok = await ui.confirm({
      title: `Delete “${collection.title}”?`,
      message:
        "The collection page will disappear from your shop, and menu links to it will stop working. Your products are not deleted.",
      confirmLabel: "Delete collection",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteCollection(collection.id);
      ui.success("Collection deleted.");
      router.push("/admin/collections");
    } catch (error) {
      ui.error(error);
    }
  }

  // ── hand-picked products ──
  // New collection: kept on screen until the first save. Saved collection: saved straight away.
  async function addProducts(products: ProductListItem[]) {
    if (!collection) {
      setQueued((current) => [
        ...current,
        ...products.filter((p) => !current.some((c) => c.id === p.id)).map(toItem),
      ]);
      return;
    }
    try {
      const result = await addCollectionProducts(
        collection.id,
        products.map((p) => p.id),
      );
      ui.success(`Added ${result.added} product${result.added === 1 ? "" : "s"}.`);
      onChanged();
    } catch (error) {
      ui.error(error);
    }
  }

  async function removeProduct(productId: string) {
    if (!collection) {
      setQueued((current) => current.filter((item) => item.id !== productId));
      return;
    }
    try {
      await removeCollectionProduct(collection.id, productId);
      onChanged();
    } catch (error) {
      ui.error(error);
    }
  }

  async function reorderProducts(items: CollectionProductItem[]) {
    if (!collection) {
      setQueued(items);
      return;
    }
    try {
      await reorderCollectionProducts(
        collection.id,
        items.map((item) => item.id),
      );
      onChanged();
    } catch (error) {
      ui.error(error);
    }
  }

  const savedType = collection?.type;
  const typeChanged = editing && savedType !== form.type;
  // Products can only be edited by hand on a collection that is saved as hand-picked
  const canEditProducts = form.type === "MANUAL" && (!editing || savedType === "MANUAL");
  const shownProducts = editing ? collection.products : queued;

  return (
    <div className="max-w-4xl space-y-6 pb-4">
      <Card title="Basic information">
        <div className="space-y-5">
          <Field label="Collection name" htmlFor="c-title" required error={errors.title}>
            <Input
              id="c-title"
              value={form.title}
              maxLength={150}
              onChange={(event) => set("title", event.target.value)}
              placeholder="e.g. Eid Edit"
            />
          </Field>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">How are products chosen?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  [
                    "MANUAL",
                    "Hand-picked",
                    "You choose each product and the order they appear in. Best for editor's picks and campaigns.",
                  ],
                  [
                    "SMART",
                    "Automatic",
                    "Products join by themselves using rules, like “every product under $200”. Always up to date.",
                  ],
                ] as const
              ).map(([value, title, text]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={form.type === value}
                  onClick={() => chooseType(value)}
                  className={`rounded-sm border p-4 text-left transition ${
                    form.type === value
                      ? "border-black bg-cream ring-1 ring-black"
                      : "border-line hover:border-gold"
                  }`}
                >
                  <span className="block font-medium">{title}</span>
                  <span className="mt-1 block text-sm text-muted">{text}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {typeChanged && (
            <Notice tone="warning">
              You are changing this collection to {form.type === "SMART" ? "automatic" : "hand-picked"}. When
              you save, the {form.type === "SMART" ? "hand-picked products" : "rules"} it has now will be
              removed.
            </Notice>
          )}

          <Toggle
            checked={form.isPublished}
            onChange={(value) => set("isPublished", value)}
            label="Show this collection in the shop"
            hint="Turn off to keep it as a draft that customers can't see."
          />
        </div>
      </Card>

      {form.type === "MANUAL" ? (
        <Card title="Products" description="The products in this collection.">
          {canEditProducts ? (
            <ManualProductsEditor
              items={shownProducts}
              onAdd={addProducts}
              onRemove={removeProduct}
              onReorder={reorderProducts}
            />
          ) : (
            <Notice>Save the collection first. Then you can choose its products here.</Notice>
          )}
        </Card>
      ) : (
        <>
          <Card
            title="Rules"
            description="Decide which products join this collection automatically. New products that match are added on their own."
          >
            <RuleBuilder
              rules={form.rules}
              onChange={(rules) => set("rules", rules)}
              matchAll={form.matchAllRules}
              onMatchAllChange={(value) => set("matchAllRules", value)}
              categories={categories}
              attributes={attributes}
            />
            {errors.rules && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {errors.rules}
              </p>
            )}
          </Card>
          <Card
            title="Products that match right now"
            description="A live check of your rules. Only Live products are counted."
          >
            <RulePreview rules={form.rules} matchAll={form.matchAllRules} />
          </Card>
        </>
      )}

      <Card
        title="Collection page"
        description="What customers see at the top and bottom of this collection's page."
      >
        <div className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Banner picture" hint="A wide picture shown at the top of the page.">
              <SingleImageField
                value={form.bannerImageUrl}
                onChange={(url) => set("bannerImageUrl", url)}
                alt={form.title}
              />
            </Field>
            <Field
              label="Phone banner (optional)"
              hint="A taller picture used on phones. If empty, the main banner is used."
            >
              <SingleImageField
                value={form.mobileBannerImageUrl}
                onChange={(url) => set("mobileBannerImageUrl", url)}
                alt={form.title}
              />
            </Field>
            <Field
              label="Homepage tile picture (optional)"
              hint="A tall picture, 1200 × 1500 px, shown when this collection appears as a tile on the homepage. If empty, the phone banner or banner is used."
            >
              <SingleImageField
                value={form.tileImageUrl}
                onChange={(url) => set("tileImageUrl", url)}
                alt={form.title}
              />
            </Field>
          </div>

          <Field label="Introduction" htmlFor="c-intro" hint="A short welcome shown above the products.">
            <RichTextField
              id="c-intro"
              value={form.description}
              onChange={(html) => set("description", html)}
              placeholder="Write a short introduction…"
              minHeight={110}
            />
          </Field>

          <Field
            label="Notice (optional)"
            htmlFor="c-notice"
            hint="A small line above the products, like offer terms: “Free shipping on orders over $200”."
          >
            <Input
              id="c-notice"
              value={form.noticeText}
              maxLength={1000}
              onChange={(event) => set("noticeText", event.target.value)}
            />
          </Field>

          <Field
            label="Text below the products (optional)"
            htmlFor="c-seo-content"
            hint="Longer text about this collection. It helps customers and Google, and customers can expand it with “Read more”."
          >
            <RichTextField
              id="c-seo-content"
              value={form.seoContent}
              onChange={(html) => set("seoContent", html)}
            />
          </Field>
        </div>
      </Card>

      <Card title="Sorting and filters">
        <div className="space-y-5">
          <Field
            label="Order of products"
            htmlFor="c-sort"
            hint="How products are sorted until the customer picks another order."
          >
            <Select
              id="c-sort"
              value={form.defaultSort}
              onChange={(event) =>
                set("defaultSort", event.target.value as CollectionFormState["defaultSort"])
              }
            >
              {sortOptionsFor(form.type).map((sort) => (
                <option key={sort} value={sort}>
                  {SORT_LABELS[sort]}
                </option>
              ))}
            </Select>
          </Field>

          {attributes.some((attribute) => attribute.isFilterable) && (
            <fieldset>
              <legend className="mb-1 text-sm font-medium">Filters shown on this page</legend>
              <p className="mb-3 text-xs text-muted">
                Tick the filters customers can use here. Leave all unticked to show every filter.
              </p>
              <div className="flex flex-wrap gap-2">
                {attributes
                  .filter((attribute) => attribute.isFilterable)
                  .map((attribute) => {
                    const checked = form.filterAttributeIds.includes(attribute.id);
                    return (
                      <label
                        key={attribute.id}
                        className={`inline-flex cursor-pointer items-center rounded-full border px-3.5 py-1.5 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold/50 ${
                          checked ? "border-black bg-black text-white" : "border-line hover:border-gold"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            set(
                              "filterAttributeIds",
                              checked
                                ? form.filterAttributeIds.filter((id) => id !== attribute.id)
                                : [...form.filterAttributeIds, attribute.id],
                            )
                          }
                          className="sr-only"
                        />
                        {attribute.name}
                      </label>
                    );
                  })}
              </div>
            </fieldset>
          )}
        </div>
      </Card>

      <Card
        title="Search engines (Google)"
        description="How this collection appears in Google. Leave empty and we'll use the name."
      >
        <div className="space-y-5">
          <Field label="Page title" htmlFor="c-seo-title">
            <Input
              id="c-seo-title"
              value={form.seoTitle}
              maxLength={200}
              onChange={(event) => set("seoTitle", event.target.value)}
              placeholder={form.title}
            />
          </Field>
          <Field label="Short description" htmlFor="c-seo-desc">
            <textarea
              id="c-seo-desc"
              value={form.seoDescription}
              maxLength={500}
              onChange={(event) => set("seoDescription", event.target.value)}
              className="min-h-20 w-full rounded-sm border border-line bg-white px-4 py-3 text-base outline-none focus:border-gold"
            />
          </Field>
          <Field
            label="Web address"
            htmlFor="c-slug"
            hint={
              editing
                ? "Only change this if you have to. The old address will keep working and forward to the new one."
                : "Leave empty and we'll make it from the name."
            }
          >
            <div className="flex items-center overflow-hidden rounded-sm border border-line focus-within:border-gold">
              <span className="shrink-0 bg-cream px-3 py-3.5 text-sm text-muted">/collections/</span>
              <input
                id="c-slug"
                value={form.slug}
                maxLength={120}
                onChange={(event) => set("slug", event.target.value)}
                className="h-12 min-w-0 flex-1 px-3 text-base outline-none"
              />
            </div>
          </Field>
        </div>
      </Card>

      {editing && (
        <Card title="Delete this collection">
          <p className="mb-4 text-sm text-muted">
            Your products are not deleted, only this grouping. Menu links to it will stop working.
          </p>
          <Button variant="danger" onClick={remove}>
            Delete collection
          </Button>
        </Card>
      )}

      <div className="sticky bottom-0 z-30 -mx-4 flex items-center justify-end gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <LinkButton href="/admin/collections" variant="secondary">
          Back to collections
        </LinkButton>
        <Button onClick={save} loading={saving}>
          {editing ? "Save changes" : "Create collection"}
        </Button>
      </div>
    </div>
  );
}
