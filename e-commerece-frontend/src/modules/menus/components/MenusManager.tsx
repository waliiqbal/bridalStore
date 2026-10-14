"use client";

import { useState } from "react";
import { LuChevronRight, LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";
import { useLinkGroups } from "@/modules/pages/hooks/use-link-groups";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { useAdminQuery } from "@/shared/admin/hooks";
import { Badge, EmptyState, Notice, PageHeader, Spinner } from "@/shared/admin/Layout";
import { ReorderList } from "@/shared/admin/ReorderList";
import { deleteMenuItem, getMenu, listMenus, reorderMenuItems } from "../api/menus.api";
import { hiddenReason, typeLabel } from "../lib/menu-form";
import type { AdminMenuItem } from "../types/menus";
import { MenuItemEditor, type MenuItemTarget } from "./MenuItemEditor";

const MENU_HELP: Record<string, string> = {
  main: "The menu across the top of your website. Build big drop-down menus: a top item, then group titles, then links.",
  footer: "The links at the bottom of every page.",
};

export function MenusManager() {
  const ui = useAdminUi();
  const menus = useAdminQuery(() => listMenus(), []);
  const links = useLinkGroups();
  const [chosen, setChosen] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [target, setTarget] = useState<MenuItemTarget | null>(null);

  const handle =
    chosen ?? menus.data?.find((m) => m.handle === "main")?.handle ?? menus.data?.[0]?.handle ?? null;
  const menu = useAdminQuery(() => (handle ? getMenu(handle) : Promise.resolve(null)), [handle]);

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  async function reorder(parentId: string | null, siblings: AdminMenuItem[]) {
    if (!handle) return;
    try {
      await reorderMenuItems(
        handle,
        parentId,
        siblings.map((item) => item.id),
      );
      menu.reload();
    } catch (error) {
      ui.error(error);
    }
  }

  async function remove(item: AdminMenuItem) {
    if (!handle) return;
    const inside = item.children.length;
    const ok = await ui.confirm({
      title: `Remove “${item.label}” from the menu?`,
      message:
        inside > 0
          ? `Everything inside it (${inside} item${inside === 1 ? "" : "s"} and their sub-items) will be removed from the menu too. The pages and collections themselves are not deleted.`
          : "The page or collection it opens is not deleted, only this menu item.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteMenuItem(handle, item.id);
      ui.success("Removed from the menu.");
      menu.reload();
    } catch (error) {
      ui.error(error);
    }
  }

  const failure = menus.error ?? menu.error ?? links.error;
  const items = menu.data?.items ?? [];
  const loaded = menus.data !== undefined && menu.data !== undefined && links.collections !== undefined;

  return (
    <>
      <PageHeader
        title="Menus"
        description="Build the menus customers use to find things: the big menu at the top, and the links at the bottom."
        actions={
          handle && (
            <Button onClick={() => setTarget({ mode: "new", parentId: "" })}>
              <LuPlus className="h-4 w-4" />
              Add menu item
            </Button>
          )
        }
      />

      {failure && (
        <div className="space-y-3">
          <Notice tone="error">{failure}</Notice>
          <Button
            variant="secondary"
            onClick={() => {
              menus.reload();
              menu.reload();
              links.reload();
            }}
          >
            Try again
          </Button>
        </div>
      )}
      {!failure && !loaded && <Spinner />}

      {!failure && loaded && menus.data && (
        <>
          <div role="tablist" aria-label="Choose a menu" className="mb-4 flex flex-wrap gap-2">
            {menus.data.map((m) => (
              <button
                key={m.handle}
                type="button"
                role="tab"
                aria-selected={m.handle === handle}
                onClick={() => setChosen(m.handle)}
                className={`rounded-sm border px-4 py-2 text-sm transition ${
                  m.handle === handle ? "border-black bg-black text-white" : "border-line hover:border-gold"
                }`}
              >
                {m.name} <span className="opacity-70">({m._count.items})</span>
              </button>
            ))}
          </div>
          {handle && MENU_HELP[handle] && <p className="mb-4 text-sm text-muted">{MENU_HELP[handle]}</p>}

          {items.length === 0 ? (
            <EmptyState
              title="This menu is empty"
              description="Add your first item, for example a top item like “Bridal” that opens a category."
              action={<Button onClick={() => setTarget({ mode: "new", parentId: "" })}>Add menu item</Button>}
            />
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted">
                  Click the arrow to see what is inside an item. Drag items (or use the arrows) to change the
                  order.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setExpanded(new Set(parentIds(items)))}
                  >
                    Open all
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setExpanded(new Set())}>
                    Close all
                  </Button>
                </div>
              </div>
              <Branch
                nodes={items}
                parentId={null}
                depth={0}
                expanded={expanded}
                onToggle={toggle}
                onReorder={reorder}
                onAddInside={(id) => setTarget({ mode: "new", parentId: id })}
                onEdit={(item) => setTarget({ mode: "edit", item })}
                onDelete={remove}
              />
            </>
          )}
        </>
      )}

      {target && handle && links.collections && links.categories && links.pages && (
        <MenuItemEditor
          // A fresh editor each time it opens
          key={target.mode === "edit" ? target.item.id : `new-${target.parentId}`}
          handle={handle}
          target={target}
          items={items}
          categories={links.categories}
          collections={links.collections}
          pages={links.pages}
          onClose={() => setTarget(null)}
          onSaved={() => {
            // A new item opens the item it was added inside, so you can see it
            if (target.mode === "new" && target.parentId) {
              setExpanded((current) => new Set(current).add(target.parentId));
            }
            setTarget(null);
            menu.reload();
            menus.reload();
          }}
        />
      )}
    </>
  );
}

const parentIds = (nodes: AdminMenuItem[]): string[] =>
  nodes.flatMap((node) => (node.children.length > 0 ? [node.id, ...parentIds(node.children)] : []));

// Items with something inside show an arrow. What is inside appears indented below, on a
// cream background with a gold line, so a top item can't be mistaken for one of its links.
function Branch({
  nodes,
  parentId,
  depth,
  expanded,
  onToggle,
  onReorder,
  onAddInside,
  onEdit,
  onDelete,
}: {
  nodes: AdminMenuItem[];
  parentId: string | null;
  depth: number;
  expanded: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onReorder: (parentId: string | null, nodes: AdminMenuItem[]) => void;
  onAddInside: (id: string) => void;
  onEdit: (item: AdminMenuItem) => void;
  onDelete: (item: AdminMenuItem) => void;
}) {
  const isTop = depth === 0;

  return (
    <ReorderList
      items={nodes}
      getKey={(node) => node.id}
      onReorder={(next) => onReorder(parentId, next)}
      className="space-y-3"
      renderItem={(node, { controls }) => {
        const hasChildren = node.children.length > 0;
        const open = hasChildren && expanded.has(node.id);
        const warning = hiddenReason(node);
        return (
          <>
            <div
              className={`grid grid-cols-[2rem_6rem_minmax(0,1fr)_auto] items-center gap-3 rounded-sm border border-line p-3 ${
                isTop ? "bg-white" : "bg-cream/60"
              }`}
            >
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => onToggle(node.id)}
                  aria-expanded={open}
                  aria-label={`${open ? "Hide" : "Show"} what is inside ${node.label}`}
                  className="flex h-8 w-8 items-center justify-center rounded-sm hover:bg-cream"
                >
                  <LuChevronRight className={`h-5 w-5 transition-transform ${open ? "rotate-90" : ""}`} />
                </button>
              ) : (
                <span aria-hidden />
              )}
              <div>{controls}</div>
              <div
                className={`min-w-0 ${hasChildren ? "cursor-pointer" : ""}`}
                onClick={hasChildren ? () => onToggle(node.id) : undefined}
              >
                <p className={`flex flex-wrap items-center gap-2 ${isTop ? "font-semibold" : "font-medium"}`}>
                  <span className="truncate">{node.label}</span>
                  <Badge tone={node.type === "HEADING" ? "gold" : "neutral"}>
                    {node.type === "HEADING" ? "Group title" : typeLabel(node.type).replace(/^An? /, "")}
                  </Badge>
                  {node.highlight && <Badge tone="red">{node.highlight}</Badge>}
                </p>
                <p className="truncate text-sm text-muted">
                  {node.type === "HEADING"
                    ? hasChildren
                      ? `${node.children.length} link${node.children.length === 1 ? "" : "s"} inside`
                      : "Nothing inside yet, so it is hidden"
                    : `${node.targetName ?? ""}${node.targetName && node.href ? " · " : ""}${node.href ?? ""}`}
                </p>
                {warning && <p className="text-xs text-amber-700">{warning}</p>}
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => onAddInside(node.id)}>
                  <LuPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add inside</span>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onEdit(node)}
                  aria-label={`Edit ${node.label}`}
                >
                  <LuPencil className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                <button
                  type="button"
                  onClick={() => onDelete(node)}
                  aria-label={`Remove ${node.label}`}
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
                  parentId={node.id}
                  depth={depth + 1}
                  expanded={expanded}
                  onToggle={onToggle}
                  onReorder={onReorder}
                  onAddInside={onAddInside}
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
