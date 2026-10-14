"use client";

import { getCategoryTree, listAttributes } from "@/modules/catalog/api/catalog.api";
import { Button } from "@/shared/admin/Button";
import { useAdminQuery } from "@/shared/admin/hooks";
import { Notice, PageHeader, Spinner } from "@/shared/admin/Layout";
import { getCollection } from "../api/collections.api";
import { CollectionForm } from "./CollectionForm";

// Loads everything the collection form needs, then shows it. No collectionId = new collection.
export function CollectionEditor({ collectionId }: { collectionId?: string }) {
  const meta = useAdminQuery(() => Promise.all([getCategoryTree(), listAttributes()]), []);
  const collection = useAdminQuery(
    () => (collectionId ? getCollection(collectionId) : Promise.resolve(null)),
    [collectionId],
  );

  const failure = meta.error ?? collection.error;
  const [categories, attributes] = meta.data ?? [];
  const current = collection.data;
  const ready = categories !== undefined && attributes !== undefined && current !== undefined;

  return (
    <>
      <PageHeader
        title={collectionId ? (current?.title ?? "Edit collection") : "Add a collection"}
        description={
          collectionId
            ? "Change anything below, then press Save changes."
            : "A collection is a group of products customers can browse together, like “Eid Edit” or “Under $200”."
        }
        back={{ href: "/admin/collections", label: "All collections" }}
      />

      {failure && (
        <div className="space-y-3">
          <Notice tone="error">{failure}</Notice>
          <Button
            variant="secondary"
            onClick={() => {
              meta.reload();
              collection.reload();
            }}
          >
            Try again
          </Button>
        </div>
      )}

      {!failure && !ready && <Spinner />}

      {!failure && ready && (
        <CollectionForm
          // A new key after each save loads the saved version into the form
          key={current?.updatedAt ?? "new"}
          collection={current}
          categories={categories}
          attributes={attributes}
          onChanged={collection.reload}
        />
      )}
    </>
  );
}
