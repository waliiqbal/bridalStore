"use client";

import { useState } from "react";
import { LuPencil, LuPlus, LuSearch, LuTrash2 } from "react-icons/lu";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { Input } from "@/shared/admin/Form";
import { useAdminQuery, useDebouncedValue } from "@/shared/admin/hooks";
import { Badge, EmptyState, Notice, PageHeader, Spinner } from "@/shared/admin/Layout";
import { Pagination } from "@/shared/admin/Pagination";
import { deleteCoupon, listCoupons, updateCoupon } from "../api/coupons.admin.api";
import { couponDetails, describeDiscount, STATE_TONE, STATE_WORDS } from "../lib/coupon-text";
import type { AdminCoupon } from "../types/coupons";
import { CouponModal } from "./CouponModal";

const PAGE_SIZE = 20;

// Discount codes customers can type at checkout (like EID10).
export function CouponsManager() {
  const ui = useAdminUi();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  // `null` = closed, "new" = creating, otherwise the code being changed
  const [editing, setEditing] = useState<AdminCoupon | "new" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const q = useDebouncedValue(search.trim());

  const list = useAdminQuery(() => listCoupons({ q, page, pageSize: PAGE_SIZE }), [q, page]);
  const data = list.data;

  async function toggle(coupon: AdminCoupon) {
    setBusy(coupon.id);
    try {
      await updateCoupon(coupon.id, { isActive: !coupon.isActive });
      ui.success(coupon.isActive ? `${coupon.code} is switched off.` : `${coupon.code} is switched on.`);
      list.reload();
    } catch (error) {
      ui.error(error);
    } finally {
      setBusy(null);
    }
  }

  async function remove(coupon: AdminCoupon) {
    const ok = await ui.confirm({
      title: `Delete ${coupon.code}?`,
      message:
        coupon.usedCount > 0
          ? "This code has been used in orders, so it can't be deleted. Switch it off instead."
          : "Customers will no longer be able to use it.",
      confirmLabel: coupon.usedCount > 0 ? "Try anyway" : "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteCoupon(coupon.id);
      ui.success("Code deleted.");
      list.reload();
    } catch (error) {
      ui.error(error);
    }
  }

  return (
    <>
      <PageHeader
        title="Coupons"
        description="Discount codes your customers type at checkout, like EID10 for 10% off. You choose what it gives, who it works for, and when it stops."
        actions={
          <Button onClick={() => setEditing("new")}>
            <LuPlus className="h-4 w-4" />
            Create a code
          </Button>
        }
      />

      <div className="relative mb-5 max-w-md">
        <LuSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search by code"
          aria-label="Search codes"
          className="pl-11"
        />
      </div>

      {list.error && (
        <div className="space-y-3">
          <Notice tone="error">{list.error}</Notice>
          <Button variant="secondary" onClick={list.reload}>
            Try again
          </Button>
        </div>
      )}
      {!list.error && !data && <Spinner />}

      {!list.error && data && data.items.length === 0 && (
        <EmptyState
          title={q ? "No codes match" : "No discount codes yet"}
          description={
            q ? "Try a different search." : "Create a code like EID10 and share it with your customers."
          }
          action={q ? undefined : <Button onClick={() => setEditing("new")}>Create a code</Button>}
        />
      )}

      {!list.error && data && data.items.length > 0 && (
        <div className={list.loading ? "opacity-60 transition" : "transition"}>
          <ul className="divide-y divide-line rounded-sm border border-line bg-white">
            {data.items.map((coupon) => (
              <li key={coupon.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                <div className="min-w-0 flex-1 basis-64">
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-medium tracking-wide">{coupon.code}</span>
                    <Badge tone={STATE_TONE[coupon.state]}>{STATE_WORDS[coupon.state]}</Badge>
                  </p>
                  <p className="mt-0.5 text-sm">{describeDiscount(coupon)}</p>
                  <p className="text-xs text-muted">{couponDetails(coupon)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busy === coupon.id}
                    onClick={() => toggle(coupon)}
                  >
                    {coupon.isActive ? "Switch off" : "Switch on"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditing(coupon)}>
                    <LuPencil className="h-4 w-4" />
                    Change
                  </Button>
                  <button
                    type="button"
                    onClick={() => remove(coupon)}
                    aria-label={`Delete ${coupon.code}`}
                    className="flex h-9 w-9 items-center justify-center rounded-sm text-red-600 hover:bg-red-50"
                  >
                    <LuTrash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
        </div>
      )}

      {editing && (
        <CouponModal
          key={editing === "new" ? "new" : editing.id}
          coupon={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.reload();
          }}
        />
      )}
    </>
  );
}
