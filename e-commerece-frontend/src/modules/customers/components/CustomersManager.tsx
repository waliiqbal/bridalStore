"use client";

import { useState } from "react";
import { LuSearch } from "react-icons/lu";
import { Button } from "@/shared/admin/Button";
import { Input } from "@/shared/admin/Form";
import { useAdminQuery, useDebouncedValue } from "@/shared/admin/hooks";
import { Badge, EmptyState, Notice, PageHeader, Spinner } from "@/shared/admin/Layout";
import { Pagination } from "@/shared/admin/Pagination";
import { formatDate } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import { listCustomers } from "../api/customers.admin.api";
import type { AdminCustomer } from "../types/customers";
import { CustomerModal } from "./CustomerModal";
import { customerName } from "./customer-name";

const PAGE_SIZE = 20;

// Everyone who has ordered or signed up. Open one to see their orders or switch them off.
export function CustomersManager() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<AdminCustomer | null>(null);
  const q = useDebouncedValue(search.trim());

  const list = useAdminQuery(() => listCustomers({ q, page, pageSize: PAGE_SIZE }), [q, page]);
  const data = list.data;

  return (
    <>
      <PageHeader
        title="Customers"
        description="The people who have bought from you or made an account. Open a customer to see their orders and addresses."
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
          placeholder="Search by name or email"
          aria-label="Search customers"
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
          title={q ? "No customers match" : "No customers yet"}
          description={
            q ? "Try a different name or email." : "Customers appear here after their first order or sign-up."
          }
        />
      )}

      {!list.error && data && data.items.length > 0 && (
        <div className={list.loading ? "opacity-60 transition" : "transition"}>
          <ul className="divide-y divide-line rounded-sm border border-line bg-white">
            {data.items.map((customer) => (
              <li key={customer.id}>
                <button
                  type="button"
                  onClick={() => setOpen(customer)}
                  className="flex w-full flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 text-left hover:bg-cream/50"
                >
                  <span className="min-w-0 flex-1 basis-56">
                    <span className="flex flex-wrap items-center gap-2 font-medium">
                      {customerName(customer)}
                      {!customer.isActive && <Badge tone="red">Switched off</Badge>}
                      {!customer.hasAccount && <Badge tone="neutral">Guest</Badge>}
                    </span>
                    <span className="block truncate text-sm text-muted">{customer.email}</span>
                  </span>
                  <span className="text-sm">
                    {customer.orderCount} {customer.orderCount === 1 ? "order" : "orders"}
                  </span>
                  <span className="w-28 text-sm font-medium">{formatMoney(customer.totalSpent)}</span>
                  <span className="text-xs text-muted">Joined {formatDate(customer.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
        </div>
      )}

      {open && (
        <CustomerModal key={open.id} customer={open} onClose={() => setOpen(null)} onChanged={list.reload} />
      )}
    </>
  );
}
