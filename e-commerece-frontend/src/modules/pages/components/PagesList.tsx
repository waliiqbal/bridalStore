"use client";

import Link from "next/link";
import { LuPlus } from "react-icons/lu";
import { Button, LinkButton } from "@/shared/admin/Button";
import { useAdminQuery } from "@/shared/admin/hooks";
import { Badge, EmptyState, Notice, PageHeader, Spinner } from "@/shared/admin/Layout";
import { listPages } from "../api/pages.api";
import { HOME_SLUG } from "../lib/page-form";
import type { PageListItem } from "../types/pages";

export function PagesList() {
  const list = useAdminQuery(() => listPages(), []);
  // The homepage always comes first
  const pages = [...(list.data ?? [])].sort(
    (a, b) => Number(b.slug === HOME_SLUG) - Number(a.slug === HOME_SLUG) || a.title.localeCompare(b.title),
  );

  return (
    <>
      <PageHeader
        title="Pages"
        description="Your homepage, plus pages like About us, Shipping and Returns."
        actions={
          <LinkButton href="/admin/pages/new">
            <LuPlus className="h-4 w-4" />
            Add page
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

      {!list.error && list.data && pages.length === 0 && (
        <EmptyState
          title="No pages yet"
          description="Add pages like About us, Shipping and Returns."
          action={<LinkButton href="/admin/pages/new">Add page</LinkButton>}
        />
      )}

      {!list.error && pages.length > 0 && (
        <ul className="divide-y divide-line rounded-sm border border-line bg-white">
          {pages.map((page) => (
            <PageRow key={page.id} page={page} />
          ))}
        </ul>
      )}
    </>
  );
}

function PageRow({ page }: { page: PageListItem }) {
  const isHome = page.slug === HOME_SLUG;
  const blocks = page._count.sections;

  return (
    <li>
      <Link
        href={`/admin/pages/${page.id}`}
        className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 hover:bg-cream/50"
      >
        <div className="min-w-0 flex-1 basis-56">
          <p className="truncate font-medium">{isHome ? "Homepage" : page.title}</p>
          <p className="truncate text-sm text-muted">
            {isHome ? "The first page customers see" : `/pages/${page.slug}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isHome && <Badge tone="gold">Homepage</Badge>}
          <span className="text-sm text-muted">
            {blocks} block{blocks === 1 ? "" : "s"}
          </span>
          {!isHome && page.showInFooter && <Badge>In footer</Badge>}
          <Badge tone={page.isPublished ? "green" : "amber"}>
            {page.isPublished ? "Published" : "Draft"}
          </Badge>
        </div>
      </Link>
    </li>
  );
}
