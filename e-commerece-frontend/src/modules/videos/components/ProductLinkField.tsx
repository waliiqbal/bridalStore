"use client";

import { useState } from "react";
import Image from "next/image";
import { LuSearch } from "react-icons/lu";
import { listProducts } from "@/modules/catalog/api/catalog.api";
import type { ProductListItem } from "@/modules/catalog/types/catalog";
import { Button } from "@/shared/admin/Button";
import { Input } from "@/shared/admin/Form";
import { useAdminQuery, useDebouncedValue } from "@/shared/admin/hooks";
import { Badge, Notice, Spinner } from "@/shared/admin/Layout";
import { Modal } from "@/shared/admin/Modal";

const PRODUCT_PATH = "/products/";

// The address of a product page, and back
export const productHref = (slug: string) => `${PRODUCT_PATH}${slug}`;
export const productSlug = (href: string) => (href.startsWith(PRODUCT_PATH) ? href.slice(PRODUCT_PATH.length) : null);

// Pick one product: a video, banner or block can then open that product's page. Shows the chosen
// product (picture and name) with Change / Remove, or a button that opens a search.
export function ProductLinkField({
  value,
  onChange,
}: {
  // The stored link, like "/products/black-silk-anarkali"; anything else counts as "no product"
  value: string;
  onChange: (href: string) => void;
}) {
  const slug = productSlug(value);
  const [choosing, setChoosing] = useState(false);

  // Find the product by its address, to show its picture and name
  const current = useAdminQuery(
    () => (slug ? listProducts({ q: slug, pageSize: 10 }) : Promise.resolve(null)),
    [slug],
  );
  const product = current.data?.items.find((item) => item.slug === slug) ?? null;

  return (
    <div>
      {slug ? (
        <div className="flex flex-wrap items-center gap-3 rounded-sm border border-line bg-white p-2">
          <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-sm bg-cream">
            {product?.imageUrl && (
              <Image src={product.imageUrl} alt="" fill unoptimized sizes="48px" className="object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1 basis-40">
            <p className="truncate font-medium">{product?.name ?? (current.data ? "A product that no longer exists" : "Loading…")}</p>
            <p className="truncate text-xs text-muted">Opens {value}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setChoosing(true)}>
            Change
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onChange("")}>
            Remove
          </Button>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setChoosing(true)}>
          <LuSearch className="h-4 w-4" />
          Choose a product
        </Button>
      )}

      {choosing && (
        <ProductChooser
          onClose={() => setChoosing(false)}
          onChoose={(picked) => {
            onChange(productHref(picked.slug));
            setChoosing(false);
          }}
        />
      )}
    </div>
  );
}

// Search your products and click the one you want
function ProductChooser({
  onClose,
  onChoose,
}: {
  onClose: () => void;
  onChoose: (product: ProductListItem) => void;
}) {
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim());
  const products = useAdminQuery(() => listProducts({ q, page: 1, pageSize: 12 }), [q]);
  const items = products.data?.items ?? [];

  return (
    <Modal open title="Choose a product" size="lg" onClose={onClose}>
      <div className="space-y-4">
        <div className="relative">
          <LuSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            autoFocus
            placeholder="Search by name…"
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10"
          />
        </div>

        {products.error && <Notice tone="error">{products.error}</Notice>}
        {!products.error && !products.data && <Spinner />}
        {!products.error && products.data && items.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">No products found.</p>
        )}

        <ul className="divide-y divide-line rounded-sm border border-line">
          {items.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => onChoose(product)}
                className="flex w-full items-center gap-3 p-2 text-left hover:bg-cream"
              >
                <span className="relative h-14 w-11 shrink-0 overflow-hidden rounded-sm bg-cream">
                  {product.imageUrl && (
                    <Image src={product.imageUrl} alt="" fill unoptimized sizes="44px" className="object-cover" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{product.name}</span>
                {product.status !== "ACTIVE" && <Badge tone="amber">{product.status === "DRAFT" ? "Draft" : "Hidden"}</Badge>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
