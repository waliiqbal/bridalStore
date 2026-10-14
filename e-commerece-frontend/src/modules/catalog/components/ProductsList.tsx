"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LuPlus, LuSearch } from "react-icons/lu";
import { Button, LinkButton } from "@/shared/admin/Button";
import { Input, Select } from "@/shared/admin/Form";
import { useAdminQuery, useDebouncedValue } from "@/shared/admin/hooks";
import { Badge, EmptyState, Notice, PageHeader, Spinner } from "@/shared/admin/Layout";
import { Pagination } from "@/shared/admin/Pagination";
import { formatMoney } from "@/shared/lib/money";
import { getCategoryTree, listProducts } from "../api/catalog.api";
import type { ProductListItem, ProductStatus } from "../types/catalog";
import { CategorySelect } from "./CategorySelect";

const PAGE_SIZE = 20;
const LOW_STOCK = 3;

const STATUS: Record<ProductStatus, { label: string; tone: "green" | "neutral" | "amber" }> = {
  ACTIVE: { label: "Live", tone: "green" },
  DRAFT: { label: "Draft", tone: "neutral" },
  ARCHIVED: { label: "Hidden", tone: "amber" },
};

export function ProductsList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProductStatus | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim());

  const categories = useAdminQuery(() => getCategoryTree(), []);
  const products = useAdminQuery(
    () => listProducts({ q, status, categoryId, page, pageSize: PAGE_SIZE }),
    [q, status, categoryId, page],
  );

  const filtering = q !== "" || status !== "" || categoryId !== "";
  const data = products.data;

  return (
    <>
      <PageHeader
        title="Products"
        description="Everything you sell. Click a product to change its photos, price, sizes and stock."
        actions={
          <LinkButton href="/admin/products/new">
            <LuPlus className="h-4 w-4" />
            Add product
          </LinkButton>
        }
      />

      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_12rem_16rem]">
        <div className="relative">
          <LuSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by name or item code"
            aria-label="Search products"
            className="pl-11"
          />
        </div>
        <Select
          value={status}
          aria-label="Filter by visibility"
          onChange={(event) => {
            setStatus(event.target.value as ProductStatus | "");
            setPage(1);
          }}
        >
          <option value="">All products</option>
          <option value="ACTIVE">Live</option>
          <option value="DRAFT">Drafts</option>
          <option value="ARCHIVED">Hidden</option>
        </Select>
        <CategorySelect
          tree={categories.data ?? []}
          value={categoryId}
          onChange={(id) => {
            setCategoryId(id);
            setPage(1);
          }}
          emptyLabel="All categories"
        />
      </div>

      {products.error && (
        <div className="space-y-3">
          <Notice tone="error">{products.error}</Notice>
          <Button variant="secondary" onClick={products.reload}>
            Try again
          </Button>
        </div>
      )}

      {!products.error && !data && <Spinner />}

      {!products.error && data && data.items.length === 0 && (
        <EmptyState
          title={filtering ? "No products match" : "No products yet"}
          description={
            filtering
              ? "Try a different search or clear the filters."
              : "Add your first outfit to start building your shop."
          }
          action={
            filtering ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch("");
                  setStatus("");
                  setCategoryId("");
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            ) : (
              <LinkButton href="/admin/products/new">Add product</LinkButton>
            )
          }
        />
      )}

      {!products.error && data && data.items.length > 0 && (
        <div className={products.loading ? "opacity-60 transition" : "transition"}>
          <ul className="divide-y divide-line rounded-sm border border-line bg-white">
            {data.items.map((product) => (
              <ProductRow key={product.id} product={product} />
            ))}
          </ul>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
        </div>
      )}
    </>
  );
}

function ProductRow({ product }: { product: ProductListItem }) {
  const status = STATUS[product.status];
  const onSale = product.compareAtPrice !== null;

  return (
    <li>
      <Link
        href={`/admin/products/${product.id}`}
        className="flex items-center gap-4 p-3 hover:bg-cream/50 sm:p-4"
      >
        <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-sm bg-cream">
          {product.imageUrl && (
            <Image src={product.imageUrl} alt="" fill unoptimized sizes="64px" className="object-cover" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{product.name}</p>
          <p className="truncate text-sm text-muted">{product.category?.name ?? "No category"}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 sm:hidden">
            <Badge tone={status.tone}>{status.label}</Badge>
            <StockBadge product={product} />
          </div>
        </div>

        <div className="hidden w-40 sm:block">
          <p className="font-medium">{formatMoney(product.price)}</p>
          {onSale && product.compareAtPrice && (
            <p className="text-sm text-muted line-through">{formatMoney(product.compareAtPrice)}</p>
          )}
        </div>

        <div className="hidden w-40 sm:block">
          <StockBadge product={product} />
        </div>

        <div className="hidden w-24 sm:block">
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>

        <p className="shrink-0 text-right font-medium sm:hidden">{formatMoney(product.price)}</p>
      </Link>
    </li>
  );
}

function StockBadge({ product }: { product: ProductListItem }) {
  if (product.variantCount === 0) return <Badge tone="amber">No sizes added</Badge>;
  if (product.totalStock === 0) return <Badge tone="red">Out of stock</Badge>;
  if (product.totalStock <= LOW_STOCK) return <Badge tone="amber">Low: {product.totalStock} left</Badge>;
  return <span className="text-sm">{product.totalStock} in stock</span>;
}
