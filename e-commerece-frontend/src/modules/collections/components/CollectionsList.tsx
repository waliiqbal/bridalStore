"use client";

import { useState } from "react";
import Link from "next/link";
import { LuPlus, LuSearch } from "react-icons/lu";
import { Button, LinkButton } from "@/shared/admin/Button";
import { Input } from "@/shared/admin/Form";
import { useAdminQuery } from "@/shared/admin/hooks";
import { Badge, EmptyState, Notice, PageHeader, Spinner } from "@/shared/admin/Layout";
import { listCollections } from "../api/collections.api";
import type { CollectionListItem } from "../types/collections";

export function CollectionsList() {
  const [search, setSearch] = useState("");
  const list = useAdminQuery(() => listCollections(), []);

  const term = search.trim().toLowerCase();
  const items = (list.data ?? []).filter((collection) => collection.title.toLowerCase().includes(term));

  return (
    <>
      <PageHeader
        title="Collections"
        description="Groups of products customers can browse together, like “Eid Edit” or “Under $200”. A product can be in many collections."
        actions={
          <LinkButton href="/admin/collections/new">
            <LuPlus className="h-4 w-4" />
            Add collection
          </LinkButton>
        }
      />

      {list.error && (
        <div className="space-y-3">
          <Notice tone="error">{list.error}</Notice>
          <Button variant="secondary" onClick={list.reload}>
            Try again
          </Button>
        </div>
      )}
      {!list.error && !list.data && <Spinner />}

      {!list.error && list.data && list.data.length === 0 && (
        <EmptyState
          title="No collections yet"
          description="Create your first one, for example “Eid Edit”, “Mehndi Outfits” or “New Arrivals”."
          action={<LinkButton href="/admin/collections/new">Add collection</LinkButton>}
        />
      )}

      {!list.error && list.data && list.data.length > 0 && (
        <>
          {list.data.length > 6 && (
            <div className="relative mb-5 max-w-md">
              <LuSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search collections"
                aria-label="Search collections"
                className="pl-11"
              />
            </div>
          )}

          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No collections match “{search}”.</p>
          ) : (
            <ul className="divide-y divide-line rounded-sm border border-line bg-white">
              {items.map((collection) => (
                <CollectionRow key={collection.id} collection={collection} />
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}

function CollectionRow({ collection }: { collection: CollectionListItem }) {
  const smart = collection.type === "SMART";
  const count = smart
    ? `${collection._count.rules} rule${collection._count.rules === 1 ? "" : "s"}`
    : `${collection._count.products} product${collection._count.products === 1 ? "" : "s"}`;

  return (
    <li>
      <Link
        href={`/admin/collections/${collection.id}`}
        className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 hover:bg-cream/50"
      >
        <div className="min-w-0 flex-1 basis-56">
          <p className="truncate font-medium">{collection.title}</p>
          <p className="truncate text-sm text-muted">/collections/{collection.slug}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={smart ? "gold" : "neutral"}>{smart ? "Automatic" : "Hand-picked"}</Badge>
          <span className="text-sm text-muted">{count}</span>
          <Badge tone={collection.isPublished ? "green" : "amber"}>
            {collection.isPublished ? "In the shop" : "Draft"}
          </Badge>
        </div>
      </Link>
    </li>
  );
}
