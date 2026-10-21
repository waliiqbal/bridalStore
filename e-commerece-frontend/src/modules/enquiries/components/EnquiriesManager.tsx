"use client";

import { formatDateTime } from "@/shared/lib/date";
import { useState } from "react";
import {
  LuCalendarDays,
  LuCheck,
  LuCopy,
  LuMail,
  LuMessageCircle,
  LuPencil,
  LuPhone,
  LuSearch,
  LuTrash2,
} from "react-icons/lu";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { Field, Input, Select, Textarea } from "@/shared/admin/Form";
import { useAdminQuery, useDebouncedValue } from "@/shared/admin/hooks";
import { Badge, EmptyState, Notice, PageHeader, Spinner } from "@/shared/admin/Layout";
import { Modal } from "@/shared/admin/Modal";
import { Pagination } from "@/shared/admin/Pagination";
import { whatsappLink } from "@/shared/layouts/whatsapp";
import {
  deleteEnquiry,
  fetchEnquiryOptions,
  getEnquiryCounts,
  listEnquiries,
  updateEnquiry,
} from "../api/enquiries.api";
import type { AdminEnquiry, EnquiryChoice, EnquiryStatus } from "../types/enquiries";

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<EnquiryStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  BOOKED: "Booked",
  CLOSED: "Closed",
};
const STATUS_TONE = { NEW: "gold", CONTACTED: "amber", BOOKED: "green", CLOSED: "neutral" } as const;

const TABS: { value: EnquiryStatus | undefined; label: string; countKey: EnquiryStatus | "ALL" }[] = [
  { value: undefined, label: "All", countKey: "ALL" },
  { value: "NEW", label: "New", countKey: "NEW" },
  { value: "CONTACTED", label: "Contacted", countKey: "CONTACTED" },
  { value: "BOOKED", label: "Booked", countKey: "BOOKED" },
  { value: "CLOSED", label: "Closed", countKey: "CLOSED" },
];

// One-click next steps, in plain words
const NEXT_STEPS: Record<EnquiryStatus, { to: EnquiryStatus; label: string; primary?: boolean }[]> = {
  NEW: [{ to: "CONTACTED", label: "I have contacted them", primary: true }],
  CONTACTED: [
    { to: "BOOKED", label: "They booked", primary: true },
    { to: "CLOSED", label: "Close it" },
  ],
  BOOKED: [{ to: "CLOSED", label: "Close it" }],
  CLOSED: [{ to: "NEW", label: "Reopen" }],
};

const sourceLabel = (source: string) =>
  source === "window" ? "Shop window QR code" : source === "website" ? "Website" : `QR: ${source}`;

const DAY_MS = 86_400_000;

// The event date is stored as a plain date (midnight UTC), so show it without shifting time zones
function eventDateText(iso: string) {
  const date = new Date(iso);
  const text = date.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const todayUtc = Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const days = Math.round((date.getTime() - todayUtc) / DAY_MS);
  const hint =
    days < 0 ? "date has passed" : days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
  return { text, hint, soon: days >= 0 && days <= 60 };
}

export function EnquiriesManager() {
  const ui = useAdminUi();
  const [status, setStatus] = useState<EnquiryStatus | undefined>();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "event">("newest");
  const [page, setPage] = useState(1);
  const [noteFor, setNoteFor] = useState<AdminEnquiry | null>(null);
  const q = useDebouncedValue(search.trim());

  const options = useAdminQuery(fetchEnquiryOptions, []);
  const counts = useAdminQuery(getEnquiryCounts, []);
  const list = useAdminQuery(
    () => listEnquiries({ status, q, sort, page, pageSize: PAGE_SIZE }),
    [status, q, sort, page],
  );
  const data = list.data;

  const labelOf = (choices: EnquiryChoice[] | undefined, code: string) =>
    choices?.find((choice) => choice.code === code)?.label ?? code;

  const reloadAll = () => {
    list.reload();
    counts.reload();
  };

  async function move(enquiry: AdminEnquiry, to: EnquiryStatus) {
    try {
      await updateEnquiry(enquiry.id, { status: to });
      ui.success(`Marked as ${STATUS_LABEL[to].toLowerCase()}.`);
      reloadAll();
    } catch (error) {
      ui.error(error);
    }
  }

  async function remove(enquiry: AdminEnquiry) {
    const ok = await ui.confirm({
      title: `Delete ${enquiry.name}'s enquiry?`,
      message: "This removes it for good. If you only want it out of the way, use “Close it” instead.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteEnquiry(enquiry.id);
      ui.success("Deleted.");
      reloadAll();
    } catch (error) {
      ui.error(error);
    }
  }

  async function copyLink() {
    const link = `${window.location.origin}/enquiry?source=window`;
    try {
      await navigator.clipboard.writeText(link);
      ui.success("Link copied. Paste it into any QR code maker.");
    } catch {
      ui.error(new Error(`Couldn't copy automatically. The link is: ${link}`));
    }
  }

  return (
    <>
      <PageHeader
        title="Enquiries"
        description="People who filled in the “find your outfit” form. Call or message them, then update the status so you always know who is waiting."
        actions={
          <Button variant="secondary" onClick={copyLink}>
            <LuCopy className="h-4 w-4" />
            Copy QR code link
          </Button>
        }
      />

      <div className="mb-5">
        <Notice>
          <strong>QR code:</strong> make a QR code from the link above (any free QR maker works), print it and
          put it in your shop window. When someone scans it, they land on the form, and their details appear
          here marked “Shop window QR code”.
        </Notice>
      </div>

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {TABS.map((tab) => {
          const active = status === tab.value;
          const count = counts.data?.[tab.countKey];
          return (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
              className={`min-h-10 rounded-full border px-4 text-sm transition ${
                active ? "border-black bg-black text-white" : "border-line bg-white hover:border-gold"
              }`}
            >
              {tab.label}
              {count !== undefined && (
                <span className={active ? "ml-1.5 opacity-80" : "ml-1.5 text-muted"}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-60 max-w-md flex-1">
          <LuSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by name, phone or email"
            aria-label="Search enquiries"
            className="pl-11"
          />
        </div>
        <Select
          value={sort}
          onChange={(event) => {
            setSort(event.target.value as "newest" | "event");
            setPage(1);
          }}
          aria-label="Order"
          className="w-auto! min-w-56"
        >
          <option value="newest">Newest first</option>
          <option value="event">Wedding date: soonest first</option>
        </Select>
      </div>

      {list.error && (
        <div className="space-y-3">
          <Notice tone="error">{list.error}</Notice>
          <Button variant="secondary" onClick={reloadAll}>
            Try again
          </Button>
        </div>
      )}
      {!list.error && !data && <Spinner />}

      {!list.error && data && data.items.length === 0 && (
        <EmptyState
          title={q || status ? "No enquiries match" : "No enquiries yet"}
          description={
            q || status
              ? "Try a different search or tab."
              : "When someone fills in the form (for example after scanning your QR code) it will appear here."
          }
        />
      )}

      {!list.error && data && data.items.length > 0 && (
        <div className={list.loading ? "opacity-60 transition" : "transition"}>
          <ul className="space-y-3">
            {data.items.map((enquiry) => {
              const wa = whatsappLink(enquiry.phone);
              const event = enquiry.eventDate ? eventDateText(enquiry.eventDate) : null;
              return (
                <li key={enquiry.id} className="rounded-sm border border-line bg-white p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div>
                      <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold">
                        {enquiry.name}
                        <Badge tone={STATUS_TONE[enquiry.status]}>{STATUS_LABEL[enquiry.status]}</Badge>
                      </h2>
                      <p className="mt-0.5 text-xs text-muted">
                        Received{" "}
                        {formatDateTime(enquiry.createdAt)}{" "}
                        · {sourceLabel(enquiry.source)}
                      </p>
                    </div>
                    {event && (
                      <p className="flex items-center gap-1.5 text-sm">
                        <LuCalendarDays className="h-4 w-4 text-gold" aria-hidden />
                        <span className="font-medium">{event.text}</span>
                        <Badge tone={event.soon ? "red" : "neutral"}>{event.hint}</Badge>
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={`tel:${enquiry.phone.replace(/[^\d+]/g, "")}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-line px-3 text-sm hover:border-gold hover:text-gold"
                    >
                      <LuPhone className="h-4 w-4" />
                      {enquiry.phone}
                    </a>
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-line px-3 text-sm hover:border-gold hover:text-gold"
                      >
                        <LuMessageCircle className="h-4 w-4" />
                        WhatsApp
                      </a>
                    )}
                    {enquiry.email && (
                      <a
                        href={`mailto:${enquiry.email}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-line px-3 text-sm hover:border-gold hover:text-gold"
                      >
                        <LuMail className="h-4 w-4" />
                        {enquiry.email}
                      </a>
                    )}
                  </div>

                  <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted">Looking for</dt>
                      <dd>
                        {enquiry.outfitTypes.length > 0
                          ? enquiry.outfitTypes
                              .map((code) => labelOf(options.data?.outfitTypes, code))
                              .join(", ")
                          : "Not said"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Budget</dt>
                      <dd>{enquiry.budget ? labelOf(options.data?.budgets, enquiry.budget) : "Not said"}</dd>
                    </div>
                  </dl>

                  {enquiry.message && (
                    <p className="mt-3 whitespace-pre-wrap rounded-sm bg-cream px-3 py-2 text-sm">
                      {enquiry.message}
                    </p>
                  )}
                  {enquiry.adminNote && (
                    <p className="mt-3 whitespace-pre-wrap rounded-sm border border-dashed border-gold/60 px-3 py-2 text-sm">
                      <span className="text-xs font-medium text-gold">Your note: </span>
                      {enquiry.adminNote}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                    {NEXT_STEPS[enquiry.status].map((step) => (
                      <Button
                        key={step.to}
                        size="sm"
                        variant={step.primary ? "primary" : "secondary"}
                        onClick={() => move(enquiry, step.to)}
                      >
                        {step.primary && <LuCheck className="h-4 w-4" />}
                        {step.label}
                      </Button>
                    ))}
                    <Button size="sm" variant="secondary" onClick={() => setNoteFor(enquiry)}>
                      <LuPencil className="h-4 w-4" />
                      {enquiry.adminNote ? "Edit note" : "Add a note"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => remove(enquiry)}
                      aria-label={`Delete ${enquiry.name}'s enquiry`}
                      className="ml-auto flex h-9 w-9 items-center justify-center rounded-sm text-red-600 hover:bg-red-50"
                    >
                      <LuTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
        </div>
      )}

      {noteFor && (
        <NoteEditor
          key={noteFor.id}
          enquiry={noteFor}
          onClose={() => setNoteFor(null)}
          onSaved={() => {
            setNoteFor(null);
            list.reload();
          }}
        />
      )}
    </>
  );
}

function NoteEditor({
  enquiry,
  onClose,
  onSaved,
}: {
  enquiry: AdminEnquiry;
  onClose: () => void;
  onSaved: () => void;
}) {
  const ui = useAdminUi();
  const [note, setNote] = useState(enquiry.adminNote ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateEnquiry(enquiry.id, { adminNote: note.trim() || null });
      ui.success("Note saved.");
      onSaved();
    } catch (error) {
      ui.error(error);
      setSaving(false);
    }
  }

  return (
    <Modal open title={`Note about ${enquiry.name}`} size="md" onClose={onClose}>
      <div className="space-y-5">
        <Field
          label="Your private note"
          htmlFor="enq-note"
          hint="Only you can see this. For example: “Called, visiting Saturday 11am”."
        >
          <Textarea
            id="enq-note"
            value={note}
            maxLength={4000}
            autoFocus
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save}>
            Save note
          </Button>
        </div>
      </div>
    </Modal>
  );
}
