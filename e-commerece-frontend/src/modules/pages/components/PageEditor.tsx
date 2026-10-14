"use client";

import { useMemo } from "react";
import { getCategoryTree } from "@/modules/catalog/api/catalog.api";
import { listCollections } from "@/modules/collections/api/collections.api";
import { Button } from "@/shared/admin/Button";
import { useAdminQuery } from "@/shared/admin/hooks";
import { Notice, PageHeader, Spinner } from "@/shared/admin/Layout";
import { getPage, listPages } from "../api/pages.api";
import { buildLinkOptions } from "../lib/link-options";
import { HOME_SLUG } from "../lib/page-form";
import { PageForm } from "./PageForm";

// Loads everything the page form needs, then shows it. No pageId = new page.
export function PageEditor({ pageId }: { pageId?: string }) {
  const meta = useAdminQuery(() => Promise.all([listCollections(), getCategoryTree(), listPages()]), []);
  const page = useAdminQuery(() => (pageId ? getPage(pageId) : Promise.resolve(null)), [pageId]);

  const [collections, categories, pages] = meta.data ?? [];
  const linkGroups = useMemo(
    () => (collections && categories && pages ? buildLinkOptions({ collections, categories, pages }) : []),
    [collections, categories, pages],
  );

  const failure = meta.error ?? page.error;
  const current = page.data;
  const ready = collections !== undefined && current !== undefined;
  const isHome = current?.slug === HOME_SLUG;

  return (
    <>
      <PageHeader
        title={pageId ? (isHome ? "Homepage" : (current?.title ?? "Edit page")) : "Add a page"}
        description={
          pageId
            ? isHome
              ? "The first page customers see. Add and arrange blocks to build it."
              : "Change anything below, then press Save changes."
            : "Pages like About us, Shipping and Returns. You can add extra blocks after saving."
        }
        back={{ href: "/admin/pages", label: "All pages" }}
      />

      {failure && (
        <div className="space-y-3">
          <Notice tone="error">{failure}</Notice>
          <Button
            variant="secondary"
            onClick={() => {
              meta.reload();
              page.reload();
            }}
          >
            Try again
          </Button>
        </div>
      )}

      {!failure && !ready && <Spinner />}

      {!failure && ready && (
        <PageForm
          // A new key after each save loads the saved version into the form
          key={current?.updatedAt ?? "new"}
          page={current}
          collections={collections}
          linkGroups={linkGroups}
          onChanged={page.reload}
        />
      )}
    </>
  );
}
