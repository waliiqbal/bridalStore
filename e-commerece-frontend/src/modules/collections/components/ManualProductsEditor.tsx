"use client";

import { useState } from "react";
import Image from "next/image";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import type { ProductListItem } from "@/modules/catalog/types/catalog";
import { Button } from "@/shared/admin/Button";
import { Badge } from "@/shared/admin/Layout";
import { ReorderList } from "@/shared/admin/ReorderList";
import { formatMoney } from "@/shared/lib/money";
import type { CollectionProductItem } from "../types/collections";
import { ProductPicker } from "./ProductPicker";

// The products of a hand-picked collection: add, remove and put in the order you like.
export function ManualProductsEditor({
  items,
  onAdd,
  onRemove,
  onReorder,
}: {
  items: CollectionProductItem[];
  onAdd: (products: ProductListItem[]) => void;
  onRemove: (productId: string) => void;
  onReorder: (items: CollectionProductItem[]) => void;
}) {
  const [picking, setPicking] = useState(false);

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="rounded-sm border border-dashed border-line bg-cream/50 px-4 py-8 text-center text-sm text-muted">
          No products yet. Press “Add products” to choose the ones that belong here.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted">
            {items.length} product{items.length === 1 ? "" : "s"}. Drag them (or use the arrows) to set the
            order customers see.
          </p>
          <ReorderList
            items={items}
            getKey={(item) => item.id}
            onReorder={onReorder}
            className="divide-y divide-line rounded-sm border border-line bg-white"
            renderItem={(item, { controls }) => (
              <div className="grid grid-cols-[6rem_2.75rem_minmax(0,1fr)_auto] items-center gap-3 p-3">
                <div>{controls}</div>
                <div className="relative h-14 w-11 overflow-hidden rounded-sm bg-cream">
                  {item.imageUrl && (
                    <Image
                      src={item.imageUrl}
                      alt=""
                      fill
                      unoptimized
                      sizes="44px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
                    {formatMoney(item.price)}
                    {item.status !== "ACTIVE" && <Badge tone="amber">Not live: hidden from customers</Badge>}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={`Remove ${item.name} from this collection`}
                  title="Remove from this collection"
                  className="flex h-9 w-9 items-center justify-center rounded-sm text-red-600 hover:bg-red-50"
                >
                  <LuTrash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          />
        </>
      )}

      <Button variant="secondary" onClick={() => setPicking(true)}>
        <LuPlus className="h-4 w-4" />
        Add products
      </Button>

      {picking && (
        <ProductPicker
          alreadyIn={new Set(items.map((item) => item.id))}
          onClose={() => setPicking(false)}
          onAdd={(products) => {
            setPicking(false);
            onAdd(products);
          }}
        />
      )}
    </div>
  );
}
