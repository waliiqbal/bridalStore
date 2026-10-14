import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@/shared/lib/money";
import type { ProductCardData } from "../types/shop";

const SIZES = "(min-width: 1280px) 20vw, (min-width: 1024px) 24vw, (min-width: 640px) 32vw, 48vw";

export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const [main, hover] = product.images;
  const compare = product.compareAtPrice;
  const onSale = !!compare && compare.amount > product.price.amount;
  const percentOff = onSale ? Math.round((1 - product.price.amount / compare.amount) * 100) : 0;
  const tag = product.badge ?? (product.isNewArrival ? "New" : null);

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-cream">
        {main && (
          <Image
            src={main.url}
            alt={main.altText ?? product.name}
            fill
            sizes={SIZES}
            priority={priority}
            className="object-cover"
          />
        )}
        {hover && (
          <Image
            src={hover.url}
            alt=""
            fill
            sizes={SIZES}
            className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        )}

        {tag && (
          <span className="absolute left-0 top-3 bg-black px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-white">
            {tag}
          </span>
        )}
        {onSale && (
          <span className="absolute bottom-3 left-3 bg-white/95 px-2 py-0.5 text-xs font-medium text-red-600">
            {percentOff}% off
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-x-0 bottom-0 bg-white/90 py-1.5 text-center text-xs font-medium uppercase tracking-wider">
            Sold out
          </span>
        )}
      </div>

      <h3 className="mt-3 line-clamp-2 text-sm leading-snug group-hover:text-gold">{product.name}</h3>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className={onSale ? "font-medium text-red-600" : "font-medium"}>
          {formatMoney(product.price)}
        </span>
        {onSale && <span className="text-muted line-through">{formatMoney(compare)}</span>}
      </p>
      {product.sizes.length > 0 && (
        <p className="mt-0.5 truncate text-xs text-muted">{product.sizes.join(" · ")}</p>
      )}
      {product.isReadyToShip && product.inStock && (
        <p className="mt-0.5 text-xs text-emerald-700">Ready to ship</p>
      )}
    </Link>
  );
}
