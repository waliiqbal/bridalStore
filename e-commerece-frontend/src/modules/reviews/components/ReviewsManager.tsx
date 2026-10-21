"use client";

import { useState } from "react";
import Link from "next/link";
import { LuCheck, LuEyeOff, LuMessageSquareReply, LuSearch, LuTrash2 } from "react-icons/lu";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { Field, Input, Textarea } from "@/shared/admin/Form";
import { useAdminQuery, useDebouncedValue } from "@/shared/admin/hooks";
import { Badge, EmptyState, Notice, PageHeader, Spinner } from "@/shared/admin/Layout";
import { Modal } from "@/shared/admin/Modal";
import { Pagination } from "@/shared/admin/Pagination";
import { formatDate } from "@/shared/lib/date";
import { deleteReview, getReviewCounts, listReviews, updateReview } from "../api/reviews.admin.api";
import type { AdminReview, ReviewStatus } from "../types/reviews";
import { Stars } from "./Stars";

const PAGE_SIZE = 20;

const TABS: { value: ReviewStatus | undefined; label: string }[] = [
  { value: "PENDING", label: "Waiting for you" },
  { value: "APPROVED", label: "On the website" },
  { value: "REJECTED", label: "Hidden" },
  { value: undefined, label: "All" },
];

const STATUS_WORDS = { PENDING: "Waiting for you", APPROVED: "On the website", REJECTED: "Hidden" } as const;
const STATUS_TONE = { PENDING: "gold", APPROVED: "green", REJECTED: "neutral" } as const;

// Customer reviews: approve, hide, answer or delete.
export function ReviewsManager() {
  const ui = useAdminUi();
  const [status, setStatus] = useState<ReviewStatus | undefined>("PENDING");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [replyTo, setReplyTo] = useState<AdminReview | null>(null);
  const q = useDebouncedValue(search.trim());

  const counts = useAdminQuery(getReviewCounts, []);
  const list = useAdminQuery(() => listReviews({ status, q, page, pageSize: PAGE_SIZE }), [status, q, page]);
  const data = list.data;
  const total = counts.data ? counts.data.PENDING + counts.data.APPROVED + counts.data.REJECTED : undefined;

  const reloadAll = () => {
    list.reload();
    counts.reload();
  };

  async function move(review: AdminReview, to: ReviewStatus) {
    try {
      await updateReview(review.id, { status: to });
      ui.success(to === "APPROVED" ? "Review is now on the website." : "Review is hidden.");
      reloadAll();
    } catch (error) {
      ui.error(error);
    }
  }

  async function remove(review: AdminReview) {
    const ok = await ui.confirm({
      title: "Delete this review?",
      message: "It is removed for good. If you only want it off the website, use “Hide” instead.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteReview(review.id);
      ui.success("Review deleted.");
      reloadAll();
    } catch (error) {
      ui.error(error);
    }
  }

  return (
    <>
      <PageHeader
        title="Reviews"
        description="What customers say about your products. New reviews wait here until you approve them (you can change this in Settings)."
      />

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter reviews">
        {TABS.map((tab) => {
          const active = status === tab.value;
          const count = tab.value ? counts.data?.[tab.value] : total;
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

      <div className="relative mb-5 max-w-md">
        <LuSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search by product name"
          aria-label="Search reviews"
          className="pl-11"
        />
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
          title={q || status !== "PENDING" ? "No reviews here" : "Nothing waiting for you"}
          description={
            q || status !== "PENDING"
              ? "Try a different search or tab."
              : "When a customer writes a review, it will appear here for you to approve."
          }
        />
      )}

      {!list.error && data && data.items.length > 0 && (
        <div className={list.loading ? "opacity-60 transition" : "transition"}>
          <ul className="space-y-3">
            {data.items.map((review) => (
              <li key={review.id} className="rounded-sm border border-line bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Stars rating={review.rating} />
                  <span className="font-medium">{review.authorName}</span>
                  {review.isVerified && <Badge tone="green">Verified buyer</Badge>}
                  <Badge tone={STATUS_TONE[review.status]}>{STATUS_WORDS[review.status]}</Badge>
                  <span className="text-xs text-muted">{formatDate(review.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  On{" "}
                  <Link
                    href={`/products/${review.product.slug}`}
                    target="_blank"
                    className="underline hover:text-gold"
                  >
                    {review.product.name}
                  </Link>
                  {review.customer && <> · {review.customer.email}</>}
                </p>
                {review.title && <p className="mt-3 font-medium">{review.title}</p>}
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{review.body}</p>
                {review.shopReply && (
                  <p className="mt-3 border-l-2 border-gold bg-cream/60 px-3 py-2 text-sm">
                    <span className="font-medium">Your reply: </span>
                    {review.shopReply}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {review.status !== "APPROVED" && (
                    <Button size="sm" onClick={() => move(review, "APPROVED")}>
                      <LuCheck className="h-4 w-4" />
                      Show on website
                    </Button>
                  )}
                  {review.status !== "REJECTED" && (
                    <Button size="sm" variant="secondary" onClick={() => move(review, "REJECTED")}>
                      <LuEyeOff className="h-4 w-4" />
                      Hide
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => setReplyTo(review)}>
                    <LuMessageSquareReply className="h-4 w-4" />
                    {review.shopReply ? "Change reply" : "Reply"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => remove(review)}
                    aria-label={`Delete review by ${review.authorName}`}
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

      {replyTo && (
        <ReplyModal
          key={replyTo.id}
          review={replyTo}
          onClose={() => setReplyTo(null)}
          onSaved={() => {
            setReplyTo(null);
            reloadAll();
          }}
        />
      )}
    </>
  );
}

// The shop's public answer, shown under the review (empty removes it)
function ReplyModal({
  review,
  onClose,
  onSaved,
}: {
  review: AdminReview;
  onClose: () => void;
  onSaved: () => void;
}) {
  const ui = useAdminUi();
  const [text, setText] = useState(review.shopReply ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateReview(review.id, { shopReply: text.trim() || null });
      ui.success(text.trim() ? "Reply saved." : "Reply removed.");
      onSaved();
    } catch (error) {
      ui.error(error);
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={`Reply to ${review.authorName}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Save reply
          </Button>
        </>
      }
    >
      <p className="mb-4 rounded-sm bg-cream px-3 py-2 text-sm">{review.body}</p>
      <Field
        label="Your reply"
        htmlFor="review-reply"
        hint="Everyone can read this under the review. Leave empty to remove it."
      >
        <Textarea
          id="review-reply"
          rows={4}
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
      </Field>
    </Modal>
  );
}
