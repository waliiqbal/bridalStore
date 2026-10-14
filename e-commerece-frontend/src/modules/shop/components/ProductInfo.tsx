import Link from "next/link";
import type { ReactNode } from "react";
import { LuChevronDown } from "react-icons/lu";
import type { ProductDetail } from "../types/shop";

function Fold({ title, open = false, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="group border-b border-line py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium uppercase tracking-wide">
        {title}
        <LuChevronDown className="h-4 w-4 transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className="mt-3 text-sm">{children}</div>
    </details>
  );
}

// The folding sections under the buy buttons. The words come from the owner's product page
// (cleaned by the backend); the shipping section only points to the owner's own pages, so it
// can never disagree with them.
export function ProductInfo({ product }: { product: ProductDetail }) {
  return (
    <div className="mt-8 border-t border-line">
      {product.description && (
        <Fold title="Description" open>
          <div className="richtext" dangerouslySetInnerHTML={{ __html: product.description }} />
        </Fold>
      )}
      {product.details && (
        <Fold title="What's included and fabric" open>
          <div className="richtext" dangerouslySetInnerHTML={{ __html: product.details }} />
        </Fold>
      )}
      {product.attributes.length > 0 && (
        <Fold title="Product details">
          <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2">
            {product.attributes.map((attribute) => (
              <div key={attribute.slug} className="contents">
                <dt className="text-muted">{attribute.name}</dt>
                <dd>{attribute.values.map((value) => value.value).join(", ")}</dd>
              </div>
            ))}
          </dl>
        </Fold>
      )}
      <Fold title="Shipping and returns">
        <p>
          Delivery times, shipping rates and returns are explained on our{" "}
          <Link href="/pages/shipping-delivery" className="underline hover:text-gold">
            shipping and delivery
          </Link>{" "}
          and{" "}
          <Link href="/pages/returns-exchanges" className="underline hover:text-gold">
            returns and exchanges
          </Link>{" "}
          pages.
        </p>
      </Fold>
    </div>
  );
}
