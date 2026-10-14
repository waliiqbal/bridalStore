"use client";

import { useState, type FormEvent } from "react";
import { LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { Field, Input } from "@/shared/admin/Form";
import { useAdminQuery } from "@/shared/admin/hooks";
import { EmptyState, Notice, PageHeader, Spinner } from "@/shared/admin/Layout";
import { Modal } from "@/shared/admin/Modal";
import { createSizeGuide, deleteSizeGuide, listSizeGuides, updateSizeGuide } from "../api/catalog.api";
import { buildChartHtml, DEFAULT_CHART } from "../lib/size-chart";
import type { SizeGuide } from "../types/catalog";
import { SizeChartEditor } from "./SizeChartEditor";

type GuideModal = { mode: "new" } | { mode: "edit"; guide: SizeGuide };

export function SizeGuidesManager() {
  const ui = useAdminUi();
  const list = useAdminQuery(() => listSizeGuides(), []);
  const [modal, setModal] = useState<GuideModal | null>(null);

  async function remove(guide: SizeGuide) {
    const used = guide._count.products;
    const ok = await ui.confirm({
      title: `Delete “${guide.name}”?`,
      message:
        used > 0
          ? `${used} product${used === 1 ? " uses" : "s use"} this guide. They will simply stop showing a size guide.`
          : "This size guide isn't used by any product.",
      confirmLabel: "Delete size guide",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteSizeGuide(guide.id);
      ui.success("Size guide deleted.");
      list.reload();
    } catch (error) {
      ui.error(error);
    }
  }

  return (
    <>
      <PageHeader
        title="Size guides"
        description="The measurement charts customers see on a product page. One guide can be used by many products."
        actions={
          <Button onClick={() => setModal({ mode: "new" })}>
            <LuPlus className="h-4 w-4" />
            Add size guide
          </Button>
        }
      />

      {list.error && (
        <div className="space-y-3">
          <Notice tone="error">{list.error}</Notice>
          <Button variant="secondary" onClick={list.reload}>
            Try again
          </Button>
        </div>
      )}
      {!list.error && !list.data && <Spinner />}
      {!list.error && list.data?.length === 0 && (
        <EmptyState
          title="No size guides yet"
          description="Create a chart, like “Lehenga size chart”, then choose it on your products."
          action={<Button onClick={() => setModal({ mode: "new" })}>Add size guide</Button>}
        />
      )}
      {!list.error && list.data && list.data.length > 0 && (
        <ul className="max-w-4xl divide-y divide-line rounded-sm border border-line bg-white">
          {list.data.map((guide) => (
            <li key={guide.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{guide.name}</p>
                <p className="text-sm text-muted">
                  Used by {guide._count.products} product{guide._count.products === 1 ? "" : "s"}
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setModal({ mode: "edit", guide })}>
                <LuPencil className="h-4 w-4" />
                Edit
              </Button>
              <button
                type="button"
                onClick={() => remove(guide)}
                aria-label={`Delete ${guide.name}`}
                className="flex h-9 w-9 items-center justify-center rounded-sm text-red-600 hover:bg-red-50"
              >
                <LuTrash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {modal && (
        <GuideEditor
          key={modal.mode === "edit" ? modal.guide.id : "new"}
          target={modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            list.reload();
          }}
        />
      )}
    </>
  );
}

function GuideEditor({
  target,
  onClose,
  onSaved,
}: {
  target: GuideModal;
  onClose: () => void;
  onSaved: () => void;
}) {
  const ui = useAdminUi();
  const editing = target.mode === "edit";
  const [name, setName] = useState(editing ? target.guide.name : "");
  const [content, setContent] = useState(
    editing ? target.guide.content : buildChartHtml(DEFAULT_CHART),
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setNameError("Please give this size guide a name.");
      return;
    }
    if (!content.trim()) {
      ui.error(new Error("The size chart can't be empty."));
      return;
    }
    setSaving(true);
    try {
      if (target.mode === "edit") {
        await updateSizeGuide(target.guide.id, { name: name.trim(), content });
      } else {
        await createSizeGuide({ name: name.trim(), content });
      }
      ui.success(editing ? "Size guide saved." : "Size guide added.");
      onSaved();
    } catch (error) {
      ui.error(error);
      setSaving(false);
    }
  }

  return (
    <Modal open title={editing ? "Edit size guide" : "Add size guide"} onClose={onClose} size="lg">
      <form onSubmit={save} className="space-y-5">
        <Field label="Name" htmlFor="g-name" required error={nameError} hint="Only you see this, e.g. “Lehenga size chart”.">
          <Input
            id="g-name"
            value={name}
            maxLength={120}
            autoFocus
            onChange={(event) => {
              setName(event.target.value);
              setNameError(null);
            }}
          />
        </Field>
        <Field label="Size chart" hint="Type the measurements into the boxes. Add rows or columns as you need.">
          <SizeChartEditor value={content} onChange={setContent} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {editing ? "Save changes" : "Add size guide"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
