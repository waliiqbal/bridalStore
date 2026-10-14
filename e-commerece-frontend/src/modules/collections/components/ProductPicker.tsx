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
import { Pagination } from "@/shared/admin/Pagination";
import { formatMoney } from "@/shared/lib/money";

const PAGE_SIZE = 10;

// Search your products and tick the ones to add. Choices are remembered across pages.
export function ProductPicker({
  alreadyIn,
  onClose,
  onAdd,
}: {
  alreadyIn: ReadonlySet<string>;
  onClose: () => void;
  onAdd: (products: ProductListItem[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [chosen, setChosen] = useState<ReadonlyMap<string, ProductListItem>>(() => new Map());
  const q = useDebouncedValue(search.trim());

  const products = useAdminQuery(() => listProducts({ q, page, pageSize: PAGE_SIZE }), [q, page]);

  function toggle(product: ProductListItem) {
    setChosen((current) => {
      const next = new Map(current);
      if (!next.delete(product.id)) next.set(product.id, product);
      return next;
    });
  }

  const data = products.data;

  return (
    <Modal
      open
      title="Add products"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={chosen.size === 0} onClick={() => onAdd([...chosen.values()])}>
            {chosen.size === 0 ? "Add products" : `Add ${chosen.size} product${chosen.size === 1 ? "" : "s"}`}
          </Button>
        </>
      }
    >
      <div className="relative mb-4">
        <LuSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          type="search"
          autoFocus
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

      {products.error && <Notice tone="error">{products.error}</Notice>}
      {!products.error && !data && <Spinner />}
      {!products.error && data && data.items.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">No products found.</p>
      )}
      {!products.error && data && data.items.length > 0 && (
        <div className={products.loading ? "opacity-60 transition" : "transition"}>
          <ul className="divide-y divide-line rounded-sm border border-line">
            {data.items.map((product) => {
              const inAlready = alreadyIn.has(product.id);
              const checked = inAlready || chosen.has(product.id);
              return (
                <li key={product.id}>
                  <label
                    className={`flex items-center gap-3 p-3 ${inAlready ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-cream/50"}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={inAlready}
                      onChange={() => toggle(product)}
                      className="h-5 w-5 shrink-0 accent-black"
                    />
                    <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-sm bg-cream">
                      {product.imageUrl && (
                        <Image
                          src={product.imageUrl}
                          alt=""
                          fill
                          unoptimized
                          sizes="44px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{product.name}</p>
                      <p className="truncate text-sm text-muted">
                        {product.category?.name ?? "No category"} · {formatMoney(product.price)}
                      </p>
                    </div>
                    {inAlready ? (
                      <Badge tone="gold">Already added</Badge>
                    ) : (
                      product.status !== "ACTIVE" && <Badge tone="amber">Not live yet</Badge>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
        </div>
      )}
    </Modal>
  );
}
