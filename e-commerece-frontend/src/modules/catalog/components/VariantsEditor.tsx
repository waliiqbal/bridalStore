"use client";

import { useState } from "react";
import { LuTrash2 } from "react-icons/lu";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { ChipInput } from "@/shared/admin/ChipInput";
import { Field, Toggle } from "@/shared/admin/Form";
import { Badge, Notice } from "@/shared/admin/Layout";
import { MoneyInput } from "@/shared/admin/MoneyInput";
import { centsToInputText, formatMoney, type Money } from "@/shared/lib/money";
import { deleteVariant, generateVariants, updateVariant } from "../api/catalog.api";
import type { AdminVariant } from "../types/catalog";

const SIZE_SUGGESTIONS = ["XS", "S", "M", "L", "XL", "XXL"];
const MAX_STOCK = 100_000;

// Sizes and colours are saved straight away (no need to press the main Save button).
export function VariantsEditor({
  productId,
  productPrice,
  variants,
  onChanged,
}: {
  productId: string;
  productPrice: Money;
  variants: AdminVariant[];
  onChanged: () => void;
}) {
  const ui = useAdminUi();
  const [sizes, setSizes] = useState<string[]>([]);
  const [colours, setColours] = useState<string[]>([]);
  const [stock, setStock] = useState("5");
  const [price, setPrice] = useState<number | null>(null);
  const [showInShop, setShowInShop] = useState(true);
  const [creating, setCreating] = useState(false);

  const combinations = Math.max(sizes.length, 1) * Math.max(colours.length, 1);
  const canCreate = sizes.length > 0 || colours.length > 0;

  async function create() {
    setCreating(true);
    try {
      const result = await generateVariants(productId, {
        sizes,
        colours,
        stock: Math.min(MAX_STOCK, Math.max(0, parseInt(stock, 10) || 0)),
        ...(price != null && { price }),
        ...(!showInShop && { isActive: false }),
      });
      ui.success(
        result.created === 0
          ? "Those sizes and colours already exist."
          : `Added ${result.created} item${result.created === 1 ? "" : "s"}${showInShop ? "" : " (hidden from the shop)"}${
              result.alreadyExisted ? `, ${result.alreadyExisted} already existed` : ""
            }.`,
      );
      setSizes([]);
      setColours([]);
      onChanged();
    } catch (error) {
      ui.error(error);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-sm border border-line bg-cream/50 p-4">
        <h3 className="font-medium">Add sizes and colours</h3>
        <p className="mb-4 mt-1 text-sm text-muted">
          Pick the sizes and colours this outfit comes in. We create every combination for you, with its own
          stock count.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Sizes" htmlFor="gen-sizes">
            <ChipInput
              id="gen-sizes"
              values={sizes}
              onChange={setSizes}
              suggestions={SIZE_SUGGESTIONS}
              placeholder="Type a size and press Enter"
              maxLength={30}
            />
          </Field>
          <Field label="Colours" htmlFor="gen-colours">
            <ChipInput
              id="gen-colours"
              values={colours}
              onChange={setColours}
              placeholder="Type a colour and press Enter"
            />
          </Field>
          <Field
            label="Starting stock for each"
            htmlFor="gen-stock"
            hint="How many of each you have right now. You can change it later."
          >
            <input
              id="gen-stock"
              type="number"
              min={0}
              max={MAX_STOCK}
              value={stock}
              onChange={(event) => setStock(event.target.value)}
              className="h-12 w-full rounded-sm border border-line bg-white px-4 text-base outline-none focus:border-gold"
            />
          </Field>
          <Field
            label="Different price (optional)"
            htmlFor="gen-price"
            hint={`Leave empty to use the product price (${formatMoney(productPrice)}).`}
          >
            <MoneyInput id="gen-price" value={price} onChange={setPrice} />
          </Field>
        </div>
        <div className="mt-4">
          <Toggle
            checked={showInShop}
            onChange={setShowInShop}
            label="Show these in the shop right away"
            hint="Turn off to create them hidden. Customers can't see or buy hidden items until you switch them to Shown below."
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={create} loading={creating} disabled={!canCreate}>
            Create {canCreate ? `${combinations} item${combinations === 1 ? "" : "s"}` : "items"}
          </Button>
          {!canCreate && <span className="text-sm text-muted">Add at least one size or colour.</span>}
        </div>
      </div>

      {variants.length === 0 ? (
        <Notice tone="warning">
          No sizes or colours yet. Customers can&apos;t buy this product until you add some.
        </Notice>
      ) : (
        <div>
          <div className="hidden grid-cols-[1.2fr_7rem_10rem_9rem_auto] gap-3 px-3 pb-2 text-xs font-medium uppercase tracking-wide text-muted md:grid">
            <span>Item</span>
            <span>In stock</span>
            <span>Price</span>
            <span>Shown in shop</span>
            <span className="w-24" />
          </div>
          <ul className="divide-y divide-line rounded-sm border border-line">
            {variants.map((variant) => (
              <VariantRow
                key={variant.id}
                productId={productId}
                productPrice={productPrice}
                variant={variant}
                onChanged={onChanged}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function VariantRow({
  productId,
  productPrice,
  variant,
  onChanged,
}: {
  productId: string;
  productPrice: Money;
  variant: AdminVariant;
  onChanged: () => void;
}) {
  const ui = useAdminUi();
  const [stock, setStock] = useState(String(variant.stock));
  const [price, setPrice] = useState<number | null>(variant.price?.amount ?? null);
  const [active, setActive] = useState(variant.isActive);
  const [saving, setSaving] = useState(false);

  const stockNumber = Math.min(MAX_STOCK, Math.max(0, parseInt(stock, 10) || 0));
  const dirty =
    stockNumber !== variant.stock || price !== (variant.price?.amount ?? null) || active !== variant.isActive;

  const label = [variant.colour, variant.size].filter(Boolean).join(" · ") || "Standard";

  async function save() {
    setSaving(true);
    try {
      await updateVariant(productId, variant.id, { stock: stockNumber, price, isActive: active });
      ui.success(`Saved ${label}.`);
      onChanged();
    } catch (error) {
      ui.error(error);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const ok = await ui.confirm({
      title: `Remove ${label}?`,
      message: variant.canDelete
        ? "This size/colour will be deleted."
        : "This item appears in past orders, so it will be hidden from the shop instead of deleted.",
      confirmLabel: variant.canDelete ? "Delete" : "Hide it",
      danger: true,
    });
    if (!ok) return;
    try {
      const result = await deleteVariant(productId, variant.id);
      ui.success(result.message ?? "Removed.");
      onChanged();
    } catch (error) {
      ui.error(error);
    }
  }

  return (
    <li className="grid gap-3 p-3 md:grid-cols-[1.2fr_7rem_10rem_9rem_auto] md:items-center">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        <p className="truncate text-xs text-muted">Code: {variant.sku}</p>
        {variant.stock === 0 && <Badge tone="red">Out of stock</Badge>}
      </div>
      <input
        type="number"
        min={0}
        max={MAX_STOCK}
        value={stock}
        onChange={(event) => setStock(event.target.value)}
        aria-label={`Stock for ${label}`}
        className="h-11 w-full rounded-sm border border-line px-3 text-base outline-none focus:border-gold"
      />
      <MoneyInput value={price} onChange={setPrice} placeholder={centsToInputText(productPrice.amount)} />
      <Toggle checked={active} onChange={setActive} label={active ? "Shown" : "Hidden"} />
      <div className="flex w-24 items-center justify-end gap-1">
        {dirty && (
          <Button size="sm" onClick={save} loading={saving}>
            Save
          </Button>
        )}
        <button
          type="button"
          onClick={remove}
          aria-label={`Remove ${label}`}
          className="flex h-9 w-9 items-center justify-center rounded-sm text-red-600 hover:bg-red-50"
        >
          <LuTrash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
