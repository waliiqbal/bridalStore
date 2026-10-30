"use client";

import { useState } from "react";
import Image from "next/image";
import { LuChevronRight, LuFolderPlus, LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";
import { SingleImageField } from "@/modules/uploads/components/SingleImageField";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { Field, Input, Toggle } from "@/shared/admin/Form";
import { useAdminQuery } from "@/shared/admin/hooks";
import { Badge, EmptyState, Notice, PageHeader, Spinner } from "@/shared/admin/Layout";
import { Modal } from "@/shared/admin/Modal";
import { ReorderList } from "@/shared/admin/ReorderList";
import {
  createCategory,
  deleteCategory,
  getCategory,
  getCategoryTree,
  reorderCategories,
  updateCategory,
} from "../api/catalog.api";
import { collectIds, findCategory } from "../lib/category-options";
import type { CategoryInput, CategoryNode } from "../types/catalog";
import { CategorySelect } from "./CategorySelect";

type EditorTarget = { mode: "new"; parentId: string } | { mode: "edit"; id: string };

export function CategoriesManager() {
  const ui = useAdminUi();
  const tree = useAdminQuery(() => getCategoryTree(), []);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  // Parents whose sub-categories are showing. Everything starts closed.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  async function reorder(siblings: CategoryNode[]) {
    try {
      await reorderCategories(siblings.map((node) => node.id));
      tree.reload();
    } catch (error) {
      ui.error(error);
    }
  }

  async function remove(node: CategoryNode) {
    const ok = await ui.confirm({
      title: `Delete “${node.name}”?`,
      message:
        "A category can only be deleted when it has no products and no sub-categories. Any automatic-collection rules that use it will be removed too.",
      confirmLabel: "Delete category",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteCategory(node.id);
      ui.success("Category deleted.");
      tree.reload();
    } catch (error) {
      ui.error(error);
    }
  }

  return (
    <>
      <PageHeader
        title="Categories"
        description="What each product is, for example Bridal › Lehenga. Customers use categories to browse the shop."
        actions={
          <Button onClick={() => setEditor({ mode: "new", parentId: "" })}>
            <LuPlus className="h-4 w-4" />
            Add category
          </Button>
        }
      />

      {tree.error && (
        <div className="space-y-3">
          <Notice tone="error">{tree.error}</Notice>
          <Button variant="secondary" onClick={tree.reload}>
            Try again
          </Button>
        </div>
      )}
      {!tree.error && !tree.data && <Spinner />}
      {!tree.error && tree.data?.length === 0 && (
        <EmptyState
          title="No categories yet"
          description="Start with the main groups, like Bridal, Formals and Menswear."
          action={<Button onClick={() => setEditor({ mode: "new", parentId: "" })}>Add category</Button>}
        />
      )}
      {!tree.error && tree.data && tree.data.length > 0 && (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted">
              Click the arrow on a category to see its sub-categories. Drag a category (or use the arrows) to
              change the order. The order is the same in the shop menu.
            </p>
            {parentIds(tree.data).length > 0 && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setExpanded(new Set(parentIds(tree.data ?? [])))}
                >
                  Open all
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setExpanded(new Set())}>
                  Close all
                </Button>
              </div>
            )}
          </div>
          <Branch
            nodes={tree.data}
            depth={0}
            expanded={expanded}
            onToggle={toggle}
            onReorder={reorder}
            onAddChild={(parentId) => setEditor({ mode: "new", parentId })}
            onEdit={(id) => setEditor({ mode: "edit", id })}
            onDelete={remove}
          />
        </div>
      )}

      {editor && (
        <CategoryEditor
          // A fresh editor each time it opens
          key={editor.mode === "edit" ? editor.id : `new-${editor.parentId}`}
          target={editor}
          tree={tree.data ?? []}
          onClose={() => setEditor(null)}
          onSaved={() => {
            // A new sub-category opens its parent so you can see it straight away
            if (editor.mode === "new" && editor.parentId) {
              setExpanded((current) => new Set(current).add(editor.parentId));
            }
            setEditor(null);
            tree.reload();
          }}
        />
      )}
    </>
  );
}

// Ids of every category that has sub-categories
function parentIds(nodes: CategoryNode[]): string[] {
  return nodes.flatMap((node) => (node.children.length > 0 ? [node.id, ...parentIds(node.children)] : []));
}

// A main category is a white row with a bigger picture. Click its arrow to open (or close)
// its sub-categories, which appear indented underneath on a cream background with a gold
// line down the side, so they can never be mistaken for main categories.
// Drag and the arrows only move a category among its own siblings.
function Branch({
  nodes,
  depth,
  expanded,
  onToggle,
  onReorder,
  onAddChild,
  onEdit,
  onDelete,
}: {
  nodes: CategoryNode[];
  depth: number;
  expanded: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onReorder: (nodes: CategoryNode[]) => void;
  onAddChild: (parentId: string) => void;
  onEdit: (id: string) => void;
  onDelete: (node: CategoryNode) => void;
}) {
  const isMain = depth === 0;

  return (
    <ReorderList
      items={nodes}
      getKey={(node) => node.id}
      onReorder={onReorder}
      className="space-y-3"
      renderItem={(node, { controls }) => {
        const hasChildren = node.children.length > 0;
        const open = hasChildren && expanded.has(node.id);
        return (
          <>
            <div
              className={`grid items-center gap-3 rounded-sm border border-line p-3 ${
                isMain
                  ? "grid-cols-[2rem_6rem_3rem_minmax(0,1fr)_auto] bg-white"
                  : "grid-cols-[2rem_6rem_2.5rem_minmax(0,1fr)_auto] bg-cream/60"
              }`}
            >
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => onToggle(node.id)}
                  aria-expanded={open}
                  aria-label={`${open ? "Hide" : "Show"} the sub-categories of ${node.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-sm hover:bg-cream"
                >
                  <LuChevronRight className={`h-5 w-5 transition-transform ${open ? "rotate-90" : ""}`} />
                </button>
              ) : (
                <span aria-hidden />
              )}
              <div>{controls}</div>
              <div
                className={`relative overflow-hidden rounded-sm bg-cream ${isMain ? "h-12 w-12" : "h-10 w-10"}`}
              >
                {node.imageUrl && (
                  <Image src={node.imageUrl} alt="" fill unoptimized sizes="48px" className="object-cover" />
                )}
              </div>
              <div
                className={`min-w-0 ${hasChildren ? "cursor-pointer" : ""}`}
                onClick={hasChildren ? () => onToggle(node.id) : undefined}
              >
                <p className={`flex items-center gap-2 truncate ${isMain ? "font-semibold" : "font-medium"}`}>
                  <span className="truncate">{node.name}</span>
                  {!node.isVisible && <Badge tone="amber">Hidden</Badge>}
                </p>
                <p className="text-sm text-muted">
                  {node.productCount} product{node.productCount === 1 ? "" : "s"}
                  {hasChildren &&
                    ` · ${node.children.length} sub-categor${node.children.length === 1 ? "y" : "ies"}`}
                </p>
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => onAddChild(node.id)}>
                  <LuFolderPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add sub-category</span>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onEdit(node.id)}
                  aria-label={`Edit ${node.name}`}
                >
                  <LuPencil className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                <button
                  type="button"
                  onClick={() => onDelete(node)}
                  aria-label={`Delete ${node.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-sm text-red-600 hover:bg-red-50"
                >
                  <LuTrash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {open && (
              <div className="ml-5 mt-3 border-l-2 border-gold/50 pl-4 sm:ml-8 sm:pl-6">
                <Branch
                  nodes={node.children}
                  depth={depth + 1}
                  expanded={expanded}
                  onToggle={onToggle}
                  onReorder={onReorder}
                  onAddChild={onAddChild}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </div>
            )}
          </>
        );
      }}
    />
  );
}

interface CategoryForm {
  name: string;
  slug: string;
  parentId: string;
  description: string;
  imageUrl: string | null;
  tileImageUrl: string | null;
  isVisible: boolean;
  showInMenu: boolean;
  seoTitle: string;
  seoDescription: string;
}

const EMPTY_FORM: CategoryForm = {
  name: "",
  slug: "",
  parentId: "",
  description: "",
  imageUrl: null,
  tileImageUrl: null,
  isVisible: true,
  showInMenu: true,
  seoTitle: "",
  seoDescription: "",
};

const orNull = (text: string) => (text.trim() ? text.trim() : null);

function CategoryEditor({
  target,
  tree,
  onClose,
  onSaved,
}: {
  target: EditorTarget;
  tree: CategoryNode[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const ui = useAdminUi();
  const editing = target.mode === "edit";
  const existing = useAdminQuery(
    () => (target.mode === "edit" ? getCategory(target.id) : Promise.resolve(null)),
    [target.mode === "edit" ? target.id : null],
  );
  const loaded = existing.data !== undefined;

  return (
    <Modal open title={editing ? "Edit category" : "Add category"} onClose={onClose} size="lg">
      {existing.error && <Notice tone="error">{existing.error}</Notice>}
      {!existing.error && !loaded && <Spinner />}
      {!existing.error && loaded && (
        <CategoryFormBody
          initial={
            existing.data
              ? {
                  name: existing.data.name,
                  slug: existing.data.slug,
                  parentId: existing.data.parentId ?? "",
                  description: existing.data.description ?? "",
                  imageUrl: existing.data.imageUrl,
                  tileImageUrl: existing.data.tileImageUrl,
                  isVisible: existing.data.isVisible,
                  showInMenu: existing.data.showInMenu,
                  seoTitle: existing.data.seoTitle ?? "",
                  seoDescription: existing.data.seoDescription ?? "",
                }
              : { ...EMPTY_FORM, parentId: target.mode === "new" ? target.parentId : "" }
          }
          savedSlug={existing.data?.slug}
          editingId={target.mode === "edit" ? target.id : null}
          tree={tree}
          onClose={onClose}
          onSaved={() => {
            ui.success(editing ? "Category saved." : "Category added.");
            onSaved();
          }}
        />
      )}
    </Modal>
  );
}

function CategoryFormBody({
  initial,
  savedSlug,
  editingId,
  tree,
  onClose,
  onSaved,
}: {
  initial: CategoryForm;
  savedSlug?: string;
  editingId: string | null;
  tree: CategoryNode[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const ui = useAdminUi();
  const [form, setForm] = useState<CategoryForm>(initial);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof CategoryForm>(key: K, value: CategoryForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  // A category can't be moved inside itself or its own sub-categories
  const own = editingId ? findCategory(tree, editingId) : null;
  const excluded = new Set(own ? collectIds(own) : []);

  async function save() {
    if (!form.name.trim()) {
      setNameError("Please enter a name.");
      return;
    }
    setSaving(true);
    try {
      const slug = form.slug.trim();
      const input: CategoryInput = {
        name: form.name.trim(),
        ...(slug && slug !== savedSlug && { slug }),
        parentId: form.parentId || null,
        description: orNull(form.description),
        imageUrl: form.imageUrl,
        tileImageUrl: form.tileImageUrl,
        isVisible: form.isVisible,
        showInMenu: form.showInMenu,
        seoTitle: orNull(form.seoTitle),
        seoDescription: orNull(form.seoDescription),
      };
      if (editingId) await updateCategory(editingId, input);
      else await createCategory(input);
      onSaved();
    } catch (error) {
      ui.error(error);
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="space-y-5"
    >
      <Field label="Name" htmlFor="c-name" required error={nameError}>
        <Input
          id="c-name"
          value={form.name}
          maxLength={120}
          autoFocus
          onChange={(event) => {
            set("name", event.target.value);
            setNameError(null);
          }}
          placeholder="e.g. Lehenga"
        />
      </Field>

      <Field label="Sits inside" htmlFor="c-parent" hint="Choose a parent to make this a sub-category.">
        <CategorySelect
          id="c-parent"
          tree={tree}
          value={form.parentId}
          onChange={(id) => set("parentId", id)}
          emptyLabel="Nothing (main category)"
          exclude={excluded}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Banner picture (optional)" hint="A wide picture shown at the top of this category's page.">
          <SingleImageField value={form.imageUrl} onChange={(url) => set("imageUrl", url)} alt={form.name} />
        </Field>
        <Field
          label="Homepage tile picture (optional)"
          hint="A tall picture, 1200 × 1500 px, shown when this category appears as a tile on the homepage. If empty, the banner is used."
        >
          <SingleImageField
            value={form.tileImageUrl}
            onChange={(url) => set("tileImageUrl", url)}
            alt={form.name}
          />
        </Field>
      </div>

      <Field label="Short description (optional)" htmlFor="c-desc">
        <textarea
          id="c-desc"
          value={form.description}
          maxLength={5000}
          onChange={(event) => set("description", event.target.value)}
          className="min-h-24 w-full rounded-sm border border-line bg-white px-4 py-3 text-base outline-none focus:border-gold"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Toggle
          checked={form.isVisible}
          onChange={(value) => set("isVisible", value)}
          label="Show in the shop"
          hint="Turn off to hide this category from customers."
        />
        <Toggle
          checked={form.showInMenu}
          onChange={(value) => set("showInMenu", value)}
          label="Show in the menu"
          hint="Lists it in the website menu."
        />
      </div>

      <details className="rounded-sm border border-line p-4">
        <summary className="cursor-pointer text-sm font-medium">Search engines (Google)</summary>
        <div className="mt-4 space-y-4">
          <Field label="Page title" htmlFor="c-seo-title">
            <Input
              id="c-seo-title"
              value={form.seoTitle}
              maxLength={200}
              onChange={(event) => set("seoTitle", event.target.value)}
            />
          </Field>
          <Field label="Short description" htmlFor="c-seo-desc">
            <textarea
              id="c-seo-desc"
              value={form.seoDescription}
              maxLength={500}
              onChange={(event) => set("seoDescription", event.target.value)}
              className="min-h-20 w-full rounded-sm border border-line bg-white px-4 py-3 text-base outline-none focus:border-gold"
            />
          </Field>
          {editingId && (
            <Field
              label="Web address"
              htmlFor="c-slug"
              hint="Only change this if you have to. The old address will keep working."
            >
              <Input
                id="c-slug"
                value={form.slug}
                maxLength={120}
                onChange={(event) => set("slug", event.target.value)}
              />
            </Field>
          )}
        </div>
      </details>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {editingId ? "Save changes" : "Add category"}
        </Button>
      </div>
    </form>
  );
}
