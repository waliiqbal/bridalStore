"use client";

import { formatDate } from "@/shared/lib/date";
import { useState, type FormEvent } from "react";
import { LuArrowRight, LuPencil, LuPlus, LuSearch, LuTrash2 } from "react-icons/lu";
import { LinkField } from "@/modules/pages/components/LinkField";
import { useLinkGroups } from "@/modules/pages/hooks/use-link-groups";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { Field, Input } from "@/shared/admin/Form";
import { useAdminQuery, useDebouncedValue } from "@/shared/admin/hooks";
import { EmptyState, Notice, PageHeader, Spinner } from "@/shared/admin/Layout";
import { Modal } from "@/shared/admin/Modal";
import { Pagination } from "@/shared/admin/Pagination";
import { createRedirect, deleteRedirect, listRedirects, updateRedirect } from "../api/redirects.api";
import type { AdminRedirect } from "../types/redirects";

const PAGE_SIZE = 20;

export function RedirectsManager() {
  const ui = useAdminUi();
  const links = useLinkGroups();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  // `null` = closed, `"new"` = adding, otherwise the redirect whose destination is being changed
  const [editing, setEditing] = useState<AdminRedirect | "new" | null>(null);
  const q = useDebouncedValue(search.trim());

  const redirects = useAdminQuery(() => listRedirects({ q, page, pageSize: PAGE_SIZE }), [q, page]);
  const data = redirects.data;

  async function remove(redirect: AdminRedirect) {
    const ok = await ui.confirm({
      title: "Remove this forwarding?",
      message: `Anyone opening ${redirect.fromPath} will get a “page not found” instead of being sent to ${redirect.toPath}.`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteRedirect(redirect.id);
      ui.success("Removed.");
      redirects.reload();
    } catch (error) {
      ui.error(error);
    }
  }

  return (
    <>
      <PageHeader
        title="Redirects"
        description="When a page's web address changes, the old address is forwarded to the new one so links in Google and on Instagram keep working. This happens automatically. You can also add your own."
        actions={
          <Button onClick={() => setEditing("new")}>
            <LuPlus className="h-4 w-4" />
            Add forwarding
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
          placeholder="Search by address"
          aria-label="Search redirects"
          className="pl-11"
        />
      </div>

      {redirects.error && (
        <div className="space-y-3">
          <Notice tone="error">{redirects.error}</Notice>
          <Button variant="secondary" onClick={redirects.reload}>
            Try again
          </Button>
        </div>
      )}
      {!redirects.error && !data && <Spinner />}

      {!redirects.error && data && data.items.length === 0 && (
        <EmptyState
          title={q ? "No forwardings match" : "No forwardings yet"}
          description={
            q
              ? "Try a different search."
              : "They appear here automatically when you change the web address of a product, collection, category or page."
          }
        />
      )}

      {!redirects.error && data && data.items.length > 0 && (
        <div className={redirects.loading ? "opacity-60 transition" : "transition"}>
          <ul className="divide-y divide-line rounded-sm border border-line bg-white">
            {data.items.map((redirect) => (
              <li key={redirect.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                <div className="min-w-0 flex-1 basis-72">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="break-all font-medium">{redirect.fromPath}</span>
                    <LuArrowRight className="h-4 w-4 shrink-0 text-gold" aria-label="is forwarded to" />
                    <span className="break-all">{redirect.toPath}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Added{" "}
                    {formatDate(redirect.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(redirect)}>
                    <LuPencil className="h-4 w-4" />
                    Change where it goes
                  </Button>
                  <button
                    type="button"
                    onClick={() => remove(redirect)}
                    aria-label={`Remove forwarding from ${redirect.fromPath}`}
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
        <RedirectEditor
          // A fresh editor each time it opens
          key={editing === "new" ? "new" : editing.id}
          redirect={editing === "new" ? null : editing}
          linkGroups={links.groups}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            redirects.reload();
          }}
        />
      )}
    </>
  );
}

function RedirectEditor({
  redirect,
  linkGroups,
  onClose,
  onSaved,
}: {
  redirect: AdminRedirect | null;
  linkGroups: ReturnType<typeof useLinkGroups>["groups"];
  onClose: () => void;
  onSaved: () => void;
}) {
  const ui = useAdminUi();
  const [from, setFrom] = useState(redirect?.fromPath ?? "");
  const [to, setTo] = useState(redirect?.toPath ?? "");
  const [errors, setErrors] = useState<{ from?: string; to?: string }>({});
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    const found = {
      from:
        !redirect && !from.trim().startsWith("/")
          ? "The old address must start with /, like /products/old-name."
          : from.trim() === "/"
            ? "The home page can't be forwarded."
            : undefined,
      to: to.trim().startsWith("/")
        ? undefined
        : "The new address must start with /, like /products/new-name.",
    };
    setErrors(found);
    if (found.from || found.to) {
      ui.error(new Error(found.from ?? found.to));
      return;
    }
    setSaving(true);
    try {
      if (redirect) await updateRedirect(redirect.id, to.trim());
      else await createRedirect(from.trim(), to.trim());
      ui.success(redirect ? "Forwarding updated." : "Forwarding added.");
      onSaved();
    } catch (error) {
      ui.error(error);
      setSaving(false);
    }
  }

  return (
    <Modal open title={redirect ? "Change where it goes" : "Add forwarding"} size="md" onClose={onClose}>
      <form onSubmit={save} className="space-y-5">
        <Field
          label="Old address"
          htmlFor="r-from"
          required
          error={errors.from}
          hint="The address people already have. It starts with /, like /products/old-name."
        >
          <Input
            id="r-from"
            value={from}
            disabled={redirect !== null}
            maxLength={500}
            autoFocus={!redirect}
            placeholder="/products/old-name"
            onChange={(event) => {
              setFrom(event.target.value);
              setErrors((current) => ({ ...current, from: undefined }));
            }}
          />
        </Field>
        <LinkField
          id="r-to"
          label="New address (where it should go)"
          value={to}
          onChange={(value) => {
            setTo(value);
            setErrors((current) => ({ ...current, to: undefined }));
          }}
          groups={linkGroups}
          error={errors.to}
          hint="Choose a page from your shop, or type an address starting with /."
        />
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {redirect ? "Save" : "Add forwarding"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
