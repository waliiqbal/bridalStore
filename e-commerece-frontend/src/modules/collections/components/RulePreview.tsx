"use client";

import Image from "next/image";
import { useAdminQuery, useDebouncedValue } from "@/shared/admin/hooks";
import { Notice } from "@/shared/admin/Layout";
import { formatMoney } from "@/shared/lib/money";
import { previewRules } from "../api/collections.api";
import { ruleProblem, toApiRule, type RuleDraft } from "../lib/rule-fields";

const SHOWN = 12;

// Shows which products the rules match right now, before anything is saved.
export function RulePreview({ rules, matchAll }: { rules: RuleDraft[]; matchAll: boolean }) {
  const ready = rules.length > 0 && rules.every((rule) => ruleProblem(rule) === null);
  const payload = ready ? JSON.stringify({ matchAllRules: matchAll, rules: rules.map(toApiRule) }) : "";
  const settled = useDebouncedValue(payload, 500);

  const preview = useAdminQuery(
    () =>
      settled
        ? previewRules({
            ...(JSON.parse(settled) as { matchAllRules: boolean; rules: ReturnType<typeof toApiRule>[] }),
            page: 1,
            pageSize: SHOWN,
          })
        : Promise.resolve(null),
    [settled],
  );

  if (!ready) {
    return (
      <p className="rounded-sm border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
        Fill in every rule to see which products match.
      </p>
    );
  }
  if (preview.error) return <Notice tone="error">{preview.error}</Notice>;

  const data = preview.data;
  const updating = preview.loading || settled !== payload;

  return (
    <div className={updating ? "opacity-60 transition" : "transition"} aria-live="polite">
      {data === undefined || data === null ? (
        <p className="py-6 text-center text-sm text-muted">Checking which products match…</p>
      ) : data.total === 0 ? (
        <Notice tone="warning">
          No live products match these rules yet. Products must be set to <strong>Live</strong> to appear.
        </Notice>
      ) : (
        <>
          <p className="mb-3 text-sm">
            <strong>{data.total}</strong> product{data.total === 1 ? "" : "s"} match
            {data.total === 1 ? "es" : ""} right now
            {data.total > SHOWN && ` (showing the first ${SHOWN})`}.
          </p>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {data.items.map((product) => (
              <li key={product.id}>
                <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-cream">
                  {product.images[0] && (
                    <Image
                      src={product.images[0].url}
                      alt=""
                      fill
                      unoptimized
                      sizes="(min-width: 1024px) 12vw, 30vw"
                      className="object-cover"
                    />
                  )}
                </div>
                <p className="mt-1.5 truncate text-xs font-medium">{product.name}</p>
                <p className="text-xs text-muted">{formatMoney(product.price)}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
