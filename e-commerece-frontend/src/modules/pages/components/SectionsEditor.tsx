"use client";

import { useState } from "react";
import { LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";
import type { CollectionListItem } from "@/modules/collections/types/collections";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { Toggle } from "@/shared/admin/Form";
import { Modal } from "@/shared/admin/Modal";
import { ReorderList } from "@/shared/admin/ReorderList";
import { removeSection, reorderSections, updateSection } from "../api/pages.api";
import type { LinkGroup } from "../lib/link-options";
import { describeSection, SECTION_TYPES, sectionDef } from "../lib/sections";
import type { PageSection, SectionType } from "../types/pages";
import { SectionEditor, type SectionTarget } from "./SectionEditor";

// The blocks a page is built from. Changes here save straight away.
export function SectionsEditor({
  pageId,
  sections,
  collections,
  linkGroups,
  onChanged,
}: {
  pageId: string;
  sections: PageSection[];
  collections: CollectionListItem[];
  linkGroups: LinkGroup[];
  onChanged: () => void;
}) {
  const ui = useAdminUi();
  const [choosing, setChoosing] = useState(false);
  const [target, setTarget] = useState<SectionTarget | null>(null);

  const collectionTitle = (id: string) =>
    collections.find((c) => c.id === id)?.title ?? "A deleted collection";

  async function reorder(next: PageSection[]) {
    try {
      await reorderSections(
        pageId,
        next.map((section) => section.id),
      );
      onChanged();
    } catch (error) {
      ui.error(error);
    }
  }

  async function toggleShown(section: PageSection, isActive: boolean) {
    try {
      await updateSection(pageId, section.id, { isActive });
      onChanged();
    } catch (error) {
      ui.error(error);
    }
  }

  async function remove(section: PageSection) {
    const ok = await ui.confirm({
      title: `Delete this ${sectionDef(section.type).label.toLowerCase()} block?`,
      message: "It will disappear from the page. Your products and collections are not deleted.",
      confirmLabel: "Delete block",
      danger: true,
    });
    if (!ok) return;
    try {
      await removeSection(pageId, section.id);
      ui.success("Block deleted.");
      onChanged();
    } catch (error) {
      ui.error(error);
    }
  }

  function startAdding(type: SectionType) {
    setChoosing(false);
    setTarget({ mode: "new", type });
  }

  return (
    <div className="space-y-4">
      {sections.length === 0 ? (
        <p className="rounded-sm border border-dashed border-line bg-cream/50 px-4 py-8 text-center text-sm text-muted">
          No blocks yet. Press “Add a block” to start building this page.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted">
            Blocks appear on the page from top to bottom. Drag them, or use the arrows, to change the order.
          </p>
          <ReorderList
            items={sections}
            getKey={(section) => section.id}
            onReorder={reorder}
            className="space-y-3"
            itemClassName="rounded-sm border border-line bg-white"
            renderItem={(section, { controls }) => {
              const def = sectionDef(section.type);
              const Icon = def.icon;
              return (
                <div
                  className={`flex flex-wrap items-center gap-3 p-3 ${section.isActive ? "" : "bg-cream/50"}`}
                >
                  {controls}
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-cream text-gold">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="font-medium">{def.label}</p>
                    <p className="truncate text-sm text-muted">{describeSection(section, collectionTitle)}</p>
                  </div>
                  <Toggle
                    checked={section.isActive}
                    onChange={(value) => toggleShown(section, value)}
                    label={section.isActive ? "Shown" : "Hidden"}
                  />
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setTarget({ mode: "edit", section })}
                    >
                      <LuPencil className="h-4 w-4" />
                      Edit
                    </Button>
                    <button
                      type="button"
                      onClick={() => remove(section)}
                      aria-label={`Delete ${def.label} block`}
                      className="flex h-9 w-9 items-center justify-center rounded-sm text-red-600 hover:bg-red-50"
                    >
                      <LuTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            }}
          />
        </>
      )}

      <Button variant="secondary" onClick={() => setChoosing(true)}>
        <LuPlus className="h-4 w-4" />
        Add a block
      </Button>

      <Modal open={choosing} title="What would you like to add?" size="lg" onClose={() => setChoosing(false)}>
        <ul className="grid gap-3 sm:grid-cols-2">
          {SECTION_TYPES.map(({ type, label, description, icon: Icon }) => (
            <li key={type}>
              <button
                type="button"
                onClick={() => startAdding(type)}
                className="flex h-full w-full items-start gap-3 rounded-sm border border-line p-4 text-left transition hover:border-gold hover:bg-cream/50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-cream text-gold">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-medium">{label}</span>
                  <span className="mt-0.5 block text-sm text-muted">{description}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Modal>

      {target && (
        <SectionEditor
          // A fresh editor each time it opens
          key={target.mode === "edit" ? target.section.id : `new-${target.type}`}
          pageId={pageId}
          target={target}
          collections={collections}
          linkGroups={linkGroups}
          onClose={() => setTarget(null)}
          onSaved={() => {
            setTarget(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}
