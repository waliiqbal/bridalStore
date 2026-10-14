import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { brand } from "@/config/brand";
import { getSelectedCurrency } from "@/modules/currency/server";
import { getProduct, getSettings, resolveRedirect } from "@/modules/shop/api/shop.api";
import { Breadcrumbs } from "@/modules/shop/components/Breadcrumbs";
import { ProductInfo } from "@/modules/shop/components/ProductInfo";
import { ProductView } from "@/modules/shop/components/ProductView";
import { RelatedProducts } from "@/modules/shop/components/RelatedProducts";
import { productJsonLd } from "@/modules/shop/lib/product-jsonld";
import { getRelatedProducts } from "@/modules/shop/lib/related";
import { absoluteUrl, breadcrumbJsonLd, jsonLdString, plainText } from "@/modules/shop/lib/seo";
import { whatsappLink } from "@/shared/layouts/whatsapp";

type Props = { params: Promise<{ slug: string }> };

// Load the product. If its address used to belong to a renamed product, send the visitor to
// the new one; otherwise it's a real 404.
async function load(slug: string) {
  const { code } = await getSelectedCurrency();
  const product = await getProduct(slug, code);
  if (!product) {
    const moved = await resolveRedirect(`/products/${slug}`);
    if (moved) permanentRedirect(moved.toPath);
    notFound();
  }
  return { product, currency: code };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { code } = await getSelectedCurrency();
  const product = await getProduct(slug, code);
  if (!product) return { title: "Product not found" };
  const image = product.images[0]?.url;
  const description = product.seoDescription || plainText(product.description) || undefined;
  return {
    title: product.seoTitle || product.name,
    description,
    alternates: { canonical: `/products/${slug}` },
    openGraph: {
      type: "website",
      title: product.name,
      description,
      url: absoluteUrl(`/products/${slug}`),
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const { product, currency } = await load(slug);
  const [settings, related] = await Promise.all([
    getSettings().catch(() => null),
    getRelatedProducts(product, currency),
  ]);

  const path = `/products/${product.slug}`;
  const url = absoluteUrl(path);
  const crumbs = product.breadcrumb.map((crumb) => ({ name: crumb.name, href: `/categories/${crumb.slug}` }));

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 lg:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString(productJsonLd({ product, url, brandName: settings?.storeName ?? brand.name })),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              ...crumbs.map((crumb) => ({ name: crumb.name, path: crumb.href })),
              { name: product.name, path },
            ]),
          ),
        }}
      />

      <Breadcrumbs trail={[{ name: "Home", href: "/" }, ...crumbs, { name: product.name }]} />

      <ProductView product={product} whatsappHref={whatsappLink(settings?.whatsappNumber)} productUrl={url}>
        <ProductInfo product={product} />
      </ProductView>

      <RelatedProducts products={related} />
    </div>
  );
}
