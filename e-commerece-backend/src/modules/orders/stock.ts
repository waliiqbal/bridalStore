import type { Prisma } from '../../generated/prisma/client.js';

type Tx = Prisma.TransactionClient;

export interface StockLine {
  variantId: string;
  quantity: number;
}

export interface StockRow {
  id: string;
  productId: string;
  stock: number;
}

// Sum quantities per variant (a variant appears once per cart, but be safe).
function grouped(lines: StockLine[]) {
  const totals = new Map<string, number>();
  for (const l of lines) totals.set(l.variantId, (totals.get(l.variantId) ?? 0) + l.quantity);
  return { ids: [...totals.keys()], quantities: [...totals.values()] };
}

/**
 * Takes stock for every line in ONE conditional UPDATE: a row is only
 * updated if it still has enough stock (never below zero) and is active.
 * ok is false when any line could not be reserved — the caller must then
 * roll back the transaction.
 */
export async function reserveStock(tx: Tx, lines: StockLine[]): Promise<{ ok: boolean; rows: StockRow[] }> {
  const { ids, quantities } = grouped(lines);
  if (!ids.length) return { ok: true, rows: [] };
  const rows = await tx.$queryRaw<StockRow[]>`
    UPDATE "ProductVariant" AS v
    SET "stock" = v."stock" - x.qty, "updatedAt" = now()
    FROM unnest(${ids}::text[], ${quantities}::int[]) AS x(id, qty)
    WHERE v."id" = x.id AND v."stock" >= x.qty AND v."isActive" = true
    RETURNING v."id", v."productId", v."stock"`;
  return { ok: rows.length === ids.length, rows };
}

// Gives stock back (cancelled or expired orders). Variants deleted since are skipped.
export async function releaseStock(tx: Tx, lines: StockLine[]): Promise<StockRow[]> {
  const { ids, quantities } = grouped(lines.filter((l) => l.variantId));
  if (!ids.length) return [];
  return tx.$queryRaw<StockRow[]>`
    UPDATE "ProductVariant" AS v
    SET "stock" = v."stock" + x.qty, "updatedAt" = now()
    FROM unnest(${ids}::text[], ${quantities}::int[]) AS x(id, qty)
    WHERE v."id" = x.id
    RETURNING v."id", v."productId", v."stock"`;
}

// "Best selling" counts pieces sold, once per paid order.
export async function addSales(tx: Tx, lines: { productId: string; quantity: number }[]): Promise<void> {
  const totals = new Map<string, number>();
  for (const l of lines) totals.set(l.productId, (totals.get(l.productId) ?? 0) + l.quantity);
  if (!totals.size) return;
  await tx.$executeRaw`
    UPDATE "Product" AS p
    SET "salesCount" = p."salesCount" + x.qty
    FROM unnest(${[...totals.keys()]}::text[], ${[...totals.values()]}::int[]) AS x(id, qty)
    WHERE p."id" = x.id`;
}

/**
 * Products whose availability flipped (sold out ↔ back in stock), so the
 * storefront only refreshes pages that actually change.
 */
export function availabilityChanged(rows: StockRow[], lines: StockLine[], direction: 'reserved' | 'released'): string[] {
  const qty = new Map<string, number>();
  for (const l of lines) qty.set(l.variantId, (qty.get(l.variantId) ?? 0) + l.quantity);
  const products = new Set<string>();
  for (const row of rows) {
    const before = direction === 'reserved' ? row.stock + (qty.get(row.id) ?? 0) : row.stock - (qty.get(row.id) ?? 0);
    if ((before > 0) !== (row.stock > 0)) products.add(row.productId);
  }
  return [...products];
}
