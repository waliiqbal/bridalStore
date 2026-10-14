"use client";

import { useState, type FormEvent } from "react";
import { LuCheck, LuPencil, LuPlus, LuTrash2, LuX } from "react-icons/lu";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { Field, Input, Toggle } from "@/shared/admin/Form";
import { useAdminQuery } from "@/shared/admin/hooks";
import { Badge, EmptyState, Notice, PageHeader, Spinner } from "@/shared/admin/Layout";
import { Modal } from "@/shared/admin/Modal";
import { ReorderList } from "@/shared/admin/ReorderList";
import {
  createAttribute,
  createAttributeValue,
  deleteAttribute,
  deleteAttributeValue,
  listAttributes,
  reorderAttributes,
  reorderAttributeValues,
  updateAttribute,
  updateAttributeValue,
} from "../api/catalog.api";
import type { Attribute } from "../types/catalog";

type FilterModal = { mode: "new" } | { mode: "edit"; attribute: Attribute };

export function AttributesManager() {
  const ui = useAdminUi();
  const list = useAdminQuery(() => listAttributes(), []);
  const [modal, setModal] = useState<FilterModal | null>(null);

  async function reorder(next: Attribute[]) {
    try {
      await reorderAttributes(next.map((attribute) => attribute.id));
      list.reload();
    } catch (error) {
      ui.error(error);
    }
  }

  async function remove(attribute: Attribute) {
    const ok = await ui.confirm({
      title: `Delete the “${attribute.name}” filter?`,
      message:
        "Its options will be removed from every product, and from any automatic collections that use them. This can't be undone.",
      confirmLabel: "Delete filter",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteAttribute(attribute.id);
      ui.success("Filter deleted.");
      list.reload();
    } catch (error) {
      ui.error(error);
    }
  }

  return (
    <>
      <PageHeader
        title="Filters"
        description="Filters help customers narrow down the shop, such as Fabric, Occasion or Work. Create a filter, add its options, then tick them on each product."
        actions={
          <Button onClick={() => setModal({ mode: "new" })}>
            <LuPlus className="h-4 w-4" />
            Add filter
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
          title="No filters yet"
          description="Try starting with Fabric, Occasion and Work."
          action={<Button onClick={() => setModal({ mode: "new" })}>Add filter</Button>}
        />
      )}
      {!list.error && list.data && list.data.length > 0 && (
        <ReorderList
          items={list.data}
          getKey={(attribute) => attribute.id}
          onReorder={reorder}
          className="max-w-4xl space-y-4"
          renderItem={(attribute, { controls }) => (
            <AttributeCard
              attribute={attribute}
              controls={controls}
              onChanged={list.reload}
              onEdit={() => setModal({ mode: "edit", attribute })}
              onDelete={() => remove(attribute)}
            />
          )}
        />
      )}

      {modal && (
        <FilterEditor
          key={modal.mode === "edit" ? modal.attribute.id : "new"}
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

function AttributeCard({
  attribute,
  controls,
  onChanged,
  onEdit,
  onDelete,
}: {
  attribute: Attribute;
  controls: React.ReactNode;
  onChanged: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const ui = useAdminUi();
  const [newValue, setNewValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  async function add(event: FormEvent) {
    event.preventDefault();
    const text = newValue.trim();
    if (!text) return;
    setAdding(true);
    try {
      await createAttributeValue(attribute.id, text);
      setNewValue("");
      onChanged();
    } catch (error) {
      ui.error(error);
    } finally {
      setAdding(false);
    }
  }

  async function rename(valueId: string) {
    const text = editText.trim();
    if (!text) return;
    try {
      await updateAttributeValue(attribute.id, valueId, text);
      setEditingId(null);
      onChanged();
    } catch (error) {
      ui.error(error);
    }
  }

  async function removeValue(valueId: string, label: string) {
    const ok = await ui.confirm({
      title: `Delete “${label}”?`,
      message: "It will be removed from every product that uses it, and from automatic collections that use it.",
      confirmLabel: "Delete option",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteAttributeValue(attribute.id, valueId);
      onChanged();
    } catch (error) {
      ui.error(error);
    }
  }

  async function reorderValues(next: Attribute["values"]) {
    try {
      await reorderAttributeValues(
        attribute.id,
        next.map((value) => value.id),
      );
      onChanged();
    } catch (error) {
      ui.error(error);
    }
  }

  return (
    <section className="rounded-sm border border-line bg-white">
      <header className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        {controls}
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-serif text-xl font-bold">{attribute.name}</h2>
          <p className="text-sm text-muted">
            {attribute.values.length} option{attribute.values.length === 1 ? "" : "s"}
          </p>
        </div>
        {!attribute.isFilterable && <Badge tone="amber">Not shown as a filter</Badge>}
        <Button size="sm" variant="secondary" onClick={onEdit}>
          <LuPencil className="h-4 w-4" />
          <span className="hidden sm:inline">Rename</span>
        </Button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${attribute.name}`}
          className="flex h-9 w-9 items-center justify-center rounded-sm text-red-600 hover:bg-red-50"
        >
          <LuTrash2 className="h-4 w-4" />
        </button>
      </header>

      <div className="p-4">
        {attribute.values.length > 0 && (
          <ReorderList
            items={attribute.values}
            getKey={(value) => value.id}
            onReorder={reorderValues}
            className="mb-4 divide-y divide-line rounded-sm border border-line"
            itemClassName="bg-white"
            renderItem={(value, { controls: valueControls }) => (
              <div className="flex items-center gap-2 px-2 py-1.5">
                {valueControls}
                {editingId === value.id ? (
                  <form
                    className="flex min-w-0 flex-1 items-center gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void rename(value.id);
                    }}
                  >
                    <Input
                      autoFocus
                      value={editText}
                      maxLength={80}
                      onChange={(event) => setEditText(event.target.value)}
                      aria-label="Option name"
                      className="h-10"
                    />
                    <Button type="submit" size="sm" aria-label="Save name">
                      <LuCheck className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} aria-label="Cancel">
                      <LuX className="h-4 w-4" />
                    </Button>
                  </form>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate">{value.value}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(value.id);
                        setEditText(value.value);
                      }}
                      aria-label={`Rename ${value.value}`}
                      className="flex h-8 w-8 items-center justify-center rounded-sm hover:bg-cream"
                    >
                      <LuPencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeValue(value.id, value.value)}
                      aria-label={`Delete ${value.value}`}
                      className="flex h-8 w-8 items-center justify-center rounded-sm text-red-600 hover:bg-red-50"
                    >
                      <LuTrash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            )}
          />
        )}

        <form onSubmit={add} className="flex gap-2">
          <Input
            value={newValue}
            maxLength={80}
            onChange={(event) => setNewValue(event.target.value)}
            placeholder={`Add an option, e.g. ${attribute.values.length === 0 ? "Chiffon" : "another one"}`}
            aria-label={`New ${attribute.name} option`}
          />
          <Button type="submit" loading={adding} disabled={!newValue.trim()}>
            Add
          </Button>
        </form>
      </div>
    </section>
  );
}

function FilterEditor({
  target,
  onClose,
  onSaved,
}: {
  target: FilterModal;
  onClose: () => void;
  onSaved: () => void;
}) {
  const ui = useAdminUi();
  const editing = target.mode === "edit";
  const [name, setName] = useState(editing ? target.attribute.name : "");
  const [isFilterable, setIsFilterable] = useState(editing ? target.attribute.isFilterable : true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Please enter a name.");
      return;
    }
    setSaving(true);
    try {
      if (target.mode === "edit") {
        await updateAttribute(target.attribute.id, { name: name.trim(), isFilterable });
      } else {
        await createAttribute({ name: name.trim(), isFilterable });
      }
      ui.success(editing ? "Filter saved." : "Filter added. Now add its options.");
      onSaved();
    } catch (err) {
      ui.error(err);
      setSaving(false);
    }
  }

  return (
    <Modal open title={editing ? "Rename filter" : "Add filter"} onClose={onClose} size="sm">
      <form onSubmit={save} className="space-y-5">
        <Field label="Filter name" htmlFor="f-name" required error={error} hint="For example: Fabric, Occasion, Work">
          <Input
            id="f-name"
            value={name}
            maxLength={60}
            autoFocus
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
          />
        </Field>
        <Toggle
          checked={isFilterable}
          onChange={setIsFilterable}
          label="Show this as a filter in the shop"
          hint="Turn off to keep it for product details only."
        />
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {editing ? "Save" : "Add filter"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
