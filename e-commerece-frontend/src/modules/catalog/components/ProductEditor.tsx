"use client";

import { Button } from "@/shared/admin/Button";
import { useAdminQuery } from "@/shared/admin/hooks";
import { Notice, PageHeader, Spinner } from "@/shared/admin/Layout";
import { getCategoryTree, getProduct, listAttributes, listSizeGuides } from "../api/catalog.api";
import { ProductForm } from "./ProductForm";

// Loads everything the product form needs, then shows it. No productId = new product.
export function ProductEditor({ productId }: { productId?: string }) {
  const meta = useAdminQuery(
    () => Promise.all([getCategoryTree(), listAttributes(), listSizeGuides()]),
    [],
  );
  const product = useAdminQuery(
    () => (productId ? getProduct(productId) : Promise.resolve(null)),
    [productId],
  );

  const failure = meta.error ?? product.error;
  const [categories, attributes, sizeGuides] = meta.data ?? [];
  const current = product.data;
  const ready = categories !== undefined && attributes !== undefined && sizeGuides !== undefined && current !== undefined;

  return (
    <>
      <PageHeader
        title={productId ? (product.data?.name ?? "Edit product") : "Add a product"}
        description={
          productId
            ? "Change anything below, then press Save changes."
            : "Fill in the details. You'll add sizes and colours right after saving."
        }
        back={{ href: "/admin/products", label: "All products" }}
      />

      {failure && (
        <div className="space-y-3">
          <Notice tone="error">{failure}</Notice>
          <Button
            variant="secondary"
            onClick={() => {
              meta.reload();
              product.reload();
            }}
          >
            Try again
          </Button>
        </div>
      )}

      {!failure && !ready && <Spinner />}

      {!failure && ready && (
        <ProductForm
          // A new key after each save loads the saved version into the form
          key={current?.updatedAt ?? "new"}
          product={current}
          categories={categories}
          attributes={attributes}
          sizeGuides={sizeGuides}
          onVariantsChanged={product.reload}
          onSaved={product.reload}
        />
      )}
    </>
  );
}
