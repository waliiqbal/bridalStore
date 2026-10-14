"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LuCheck } from "react-icons/lu";
import { Button, LinkButton } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { ChipInput } from "@/shared/admin/ChipInput";
import { Field, Input, Select, Toggle } from "@/shared/admin/Form";
import { Card, Notice } from "@/shared/admin/Layout";
import { MoneyInput } from "@/shared/admin/MoneyInput";
import { RichTextField } from "@/shared/admin/RichTextField";
import { createProduct, deleteProduct, updateProduct } from "../api/catalog.api";
import {
  stripHtml,
  toFormState,
  toProductInput,
  validateProduct,
  type ProductFormErrors,
  type ProductFormState,
} from "../lib/product-form";
import type { AdminProduct, Attribute, CategoryNode, ProductStatus, SizeGuide } from "../types/catalog";
import { CategorySelect } from "./CategorySelect";
import { ProductImagesEditor } from "./ProductImagesEditor";
import { VariantsEditor } from "./VariantsEditor";

const STATUS_OPTIONS: { value: ProductStatus; label: string; hint: string }[] = [
  { value: "DRAFT", label: "Draft", hint: "Saved, but customers can't see it yet." },
  { value: "ACTIVE", label: "Live", hint: "Customers can see and buy it in the shop." },
  { value: "ARCHIVED", label: "Hidden", hint: "Taken off the shop, but kept for your records." },
];

export function ProductForm({
  product,
  categories,
  attributes,
  sizeGuides,
  onVariantsChanged,
  onSaved,
}: {
  product: AdminProduct | null;
  categories: CategoryNode[];
  attributes: Attribute[];
  sizeGuides: SizeGuide[];
  onVariantsChanged: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const ui = useAdminUi();
  const [form, setForm] = useState<ProductFormState>(() => toFormState(product));
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const editing = product !== null;
  const colours = [...new Set((product?.variants ?? []).map((v) => v.colour).filter((c): c is string => !!c))];
  const onSale = form.compareAtPrice != null && form.price != null && form.compareAtPrice > form.price;
  const percentOff = onSale ? Math.round((1 - form.price! / form.compareAtPrice!) * 100) : 0;

  async function save() {
    const found = validateProduct(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      ui.error(new Error("Please fix the highlighted fields."));
      return;
    }
    setSaving(true);
    try {
      if (product) {
        await updateProduct(product.id, toProductInput(form, product.slug));
        ui.success("Product saved.");
        onSaved();
      } else {
        const created = await createProduct(toProductInput(form));
        ui.success("Product created. Now add its sizes and colours.");
        router.replace(`/admin/products/${created.id}`);
      }
    } catch (error) {
      ui.error(error);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!product) return;
    const ok = await ui.confirm({
      title: `Delete “${product.name}”?`,
      message:
        "If this product has been ordered before, it will be hidden instead of deleted so your order records stay correct.",
      confirmLabel: "Delete product",
      danger: true,
    });
    if (!ok) return;
    try {
      const result = await deleteProduct(product.id);
      ui.success(result.archived ? (result.message ?? "Product hidden.") : "Product deleted.");
      router.push("/admin/products");
    } catch (error) {
      ui.error(error);
    }
  }

  function toggleValue(valueId: string) {
    set(
      "attributeValueIds",
      form.attributeValueIds.includes(valueId)
        ? form.attributeValueIds.filter((id) => id !== valueId)
        : [...form.attributeValueIds, valueId],
    );
  }

  const googleTitle = form.seoTitle.trim() || form.name.trim() || "Product name";
  const googleText = form.seoDescription.trim() || stripHtml(form.description).slice(0, 160);

  return (
    <div className="max-w-4xl space-y-6 pb-4">
      <Card title="Basic information">
        <div className="space-y-5">
          <Field label="Product name" htmlFor="p-name" required error={errors.name}>
            <Input
              id="p-name"
              value={form.name}
              maxLength={200}
              onChange={(event) => set("name", event.target.value)}
              placeholder="e.g. Ivory Gold Bridal Lehenga"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Category" htmlFor="p-category" hint="Where customers will find it when browsing.">
              <CategorySelect
                id="p-category"
                tree={categories}
                value={form.categoryId}
                onChange={(id) => set("categoryId", id)}
                emptyLabel="No category"
              />
            </Field>
            <Field
              label="Visibility"
              htmlFor="p-status"
              hint={STATUS_OPTIONS.find((o) => o.value === form.status)?.hint}
            >
              <Select
                id="p-status"
                value={form.status}
                onChange={(event) => set("status", event.target.value as ProductStatus)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Description" htmlFor="p-description" hint="Tell customers about the outfit and the occasion it suits.">
            <RichTextField
              id="p-description"
              value={form.description}
              onChange={(html) => set("description", html)}
              placeholder="Describe the outfit…"
            />
          </Field>

          <Field
            label="What's included and fabric details"
            htmlFor="p-details"
            hint="For example: lehenga, short shirt and net dupatta. Chiffon with hand embroidery."
          >
            <RichTextField
              id="p-details"
              value={form.details}
              onChange={(html) => set("details", html)}
              minHeight={110}
            />
          </Field>
        </div>
      </Card>

      <Card title="Price" description="All prices are in Australian dollars and include GST.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Price shown to customers" htmlFor="p-price" required error={errors.price}>
            <MoneyInput id="p-price" value={form.price} onChange={(cents) => set("price", cents)} />
          </Field>
          <Field
            label="Original price (optional)"
            htmlFor="p-compare"
            error={errors.compareAtPrice}
            hint="Fill this in to show a sale. It appears crossed out next to the price."
          >
            <MoneyInput
              id="p-compare"
              value={form.compareAtPrice}
              onChange={(cents) => set("compareAtPrice", cents)}
            />
          </Field>
        </div>
        {onSale && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-sm bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <LuCheck className="h-4 w-4" />
            This product will show as on sale, {percentOff}% off.
          </p>
        )}
      </Card>

      <Card title="Photos">
        <ProductImagesEditor images={form.images} colours={colours} onChange={(images) => set("images", images)} />
      </Card>

      <Card title="Sizes and colours" description="Each size and colour has its own stock count.">
        {product ? (
          <VariantsEditor
            productId={product.id}
            productPrice={product.price}
            variants={product.variants}
            onChanged={onVariantsChanged}
          />
        ) : (
          <Notice>Save the product first, then you can add its sizes and colours here.</Notice>
        )}
      </Card>

      {attributes.length > 0 && (
        <Card
          title="Filters"
          description="Tick the options that describe this product. Customers use these to filter the shop."
        >
          <div className="space-y-5">
            {attributes
              .filter((attribute) => attribute.values.length > 0)
              .map((attribute) => (
                <fieldset key={attribute.id}>
                  <legend className="mb-2 text-sm font-medium">{attribute.name}</legend>
                  <div className="flex flex-wrap gap-2">
                    {attribute.values.map((value) => {
                      const checked = form.attributeValueIds.includes(value.id);
                      return (
                        <label
                          key={value.id}
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold/50 ${
                            checked ? "border-black bg-black text-white" : "border-line hover:border-gold"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleValue(value.id)}
                            className="sr-only"
                          />
                          {checked && <LuCheck className="h-3.5 w-3.5" />}
                          {value.value}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
          </div>
        </Card>
      )}

      <Card title="More options">
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Label on the product (optional)"
              htmlFor="p-badge"
              hint="A small tag on the photo, like “New This Week” or “Selling Fast”."
            >
              <Input
                id="p-badge"
                value={form.badge}
                maxLength={40}
                onChange={(event) => set("badge", event.target.value)}
              />
            </Field>
            <Field
              label="Made to order: days to deliver"
              htmlFor="p-days"
              error={errors.deliveryDays}
              hint="Leave empty if you keep this in stock."
            >
              <Input
                id="p-days"
                type="number"
                min={1}
                max={365}
                value={form.deliveryDays}
                onChange={(event) => set("deliveryDays", event.target.value)}
              />
            </Field>
            <Field label="Size guide" htmlFor="p-guide" hint="The size chart customers see on this product.">
              <Select id="p-guide" value={form.sizeGuideId} onChange={(event) => set("sizeGuideId", event.target.value)}>
                <option value="">No size guide</option>
                {sizeGuides.map((guide) => (
                  <option key={guide.id} value={guide.id}>
                    {guide.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label="Search words (tags)"
            htmlFor="p-tags"
            hint="Words customers might search for, like nikah, mehndi, ivory. Used by search and automatic collections."
          >
            <ChipInput
              id="p-tags"
              values={form.tags}
              onChange={(tags) => set("tags", tags)}
              placeholder="Type a word and press Enter"
              maxLength={50}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Toggle
              checked={form.isNewArrival}
              onChange={(value) => set("isNewArrival", value)}
              label="New arrival"
              hint="Shows in New Arrivals"
            />
            <Toggle
              checked={form.isReadyToShip}
              onChange={(value) => set("isReadyToShip", value)}
              label="Ready to ship"
              hint="In stock, no waiting"
            />
            <Toggle
              checked={form.isFeatured}
              onChange={(value) => set("isFeatured", value)}
              label="Featured"
              hint="Highlight on the shop"
            />
          </div>
        </div>
      </Card>

      <Card
        title="Search engines (Google)"
        description="How this product appears in Google results. Leave empty and we'll use the product name and description."
      >
        <div className="space-y-5">
          <Field label="Page title" htmlFor="p-seo-title">
            <Input
              id="p-seo-title"
              value={form.seoTitle}
              maxLength={200}
              onChange={(event) => set("seoTitle", event.target.value)}
              placeholder={form.name}
            />
          </Field>
          <Field label="Short description" htmlFor="p-seo-desc">
            <textarea
              id="p-seo-desc"
              value={form.seoDescription}
              maxLength={500}
              onChange={(event) => set("seoDescription", event.target.value)}
              className="min-h-20 w-full rounded-sm border border-line bg-white px-4 py-3 text-base outline-none focus:border-gold"
            />
          </Field>
          <Field
            label="Web address"
            htmlFor="p-slug"
            hint={
              editing
                ? "Only change this if you have to. The old address will keep working and forward to the new one."
                : "Leave empty and we'll make it from the product name."
            }
          >
            <div className="flex items-center overflow-hidden rounded-sm border border-line focus-within:border-gold">
              <span className="shrink-0 bg-cream px-3 py-3.5 text-sm text-muted">/products/</span>
              <input
                id="p-slug"
                value={form.slug}
                maxLength={120}
                onChange={(event) => set("slug", event.target.value)}
                className="h-12 min-w-0 flex-1 px-3 text-base outline-none"
              />
            </div>
          </Field>

          <div className="rounded-sm border border-line bg-cream/50 p-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-muted">Google preview</p>
            <p className="truncate text-lg text-blue-800">{googleTitle}</p>
            <p className="truncate text-xs text-emerald-800">yourstore.com › products › {form.slug || "…"}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{googleText || "No description yet."}</p>
          </div>
        </div>
      </Card>

      {editing && (
        <Card title="Delete this product">
          <p className="mb-4 text-sm text-muted">
            Products that have been ordered before are hidden instead of deleted, so your order records stay correct.
          </p>
          <Button variant="danger" onClick={remove}>
            Delete product
          </Button>
        </Card>
      )}

      <div className="sticky bottom-0 z-30 -mx-4 flex items-center justify-end gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <LinkButton href="/admin/products" variant="secondary">
          Back to products
        </LinkButton>
        <Button onClick={save} loading={saving}>
          {editing ? "Save changes" : "Create product"}
        </Button>
      </div>
    </div>
  );
}
