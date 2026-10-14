"use client";

import { useState } from "react";
import { LuTrash2 } from "react-icons/lu";
import type { CollectionListItem } from "@/modules/collections/types/collections";
import { SingleImageField } from "@/modules/uploads/components/SingleImageField";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { Field, Input, Select, Toggle } from "@/shared/admin/Form";
import { Notice } from "@/shared/admin/Layout";
import { Modal } from "@/shared/admin/Modal";
import { ReorderList } from "@/shared/admin/ReorderList";
import { RichTextField } from "@/shared/admin/RichTextField";
import { addSection, updateSection } from "../api/pages.api";
import type { LinkGroup } from "../lib/link-options";
import {
  isProductBlock,
  MAX_PRODUCT_LIMIT,
  MAX_TILES,
  newSectionForm,
  sectionDef,
  toSectionForm,
  toSectionInput,
  validateSectionForm,
  type SectionErrors,
  type SectionFormState,
} from "../lib/sections";
import type { PageSection, SectionType } from "../types/pages";
import { LinkField } from "./LinkField";

export type SectionTarget = { mode: "new"; type: SectionType } | { mode: "edit"; section: PageSection };

export function SectionEditor({
  pageId,
  target,
  collections,
  linkGroups,
  onClose,
  onSaved,
}: {
  pageId: string;
  target: SectionTarget;
  collections: CollectionListItem[];
  linkGroups: LinkGroup[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const ui = useAdminUi();
  const editing = target.mode === "edit";
  const [form, setForm] = useState<SectionFormState>(() =>
    target.mode === "edit" ? toSectionForm(target.section) : newSectionForm(target.type),
  );
  const [errors, setErrors] = useState<SectionErrors>({});
  const [saving, setSaving] = useState(false);

  const { type } = form;
  const def = sectionDef(type);
  const set = <K extends keyof SectionFormState>(key: K, value: SectionFormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function save() {
    const found = validateSectionForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      ui.error(new Error("Please fix the highlighted fields."));
      return;
    }
    setSaving(true);
    try {
      if (target.mode === "edit") {
        await updateSection(pageId, target.section.id, toSectionInput(form));
      } else {
        await addSection(pageId, { type, ...toSectionInput(form) });
      }
      ui.success(editing ? "Block saved." : "Block added.");
      onSaved();
    } catch (error) {
      ui.error(error);
      setSaving(false);
    }
  }

  const titleBox = (label: string, hint?: string, placeholder?: string) => (
    <Field label={label} htmlFor="b-title" hint={hint}>
      <Input
        id="b-title"
        value={form.title}
        maxLength={200}
        placeholder={placeholder}
        onChange={(event) => set("title", event.target.value)}
      />
    </Field>
  );
  const subtitleBox = (label: string, placeholder?: string) => (
    <Field label={label} htmlFor="b-subtitle">
      <Input
        id="b-subtitle"
        value={form.subtitle}
        maxLength={300}
        placeholder={placeholder}
        onChange={(event) => set("subtitle", event.target.value)}
      />
    </Field>
  );
  const buttonBoxes = (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Button text (optional)" htmlFor="b-button" error={errors.button}>
        <Input
          id="b-button"
          value={form.buttonText}
          maxLength={60}
          placeholder="e.g. Shop now"
          onChange={(event) => set("buttonText", event.target.value)}
        />
      </Field>
      <LinkField
        id="b-link"
        label="Where the button goes"
        value={form.linkUrl}
        onChange={(value) => set("linkUrl", value)}
        groups={linkGroups}
        error={errors.link}
      />
    </div>
  );

  return (
    <Modal
      open
      title={`${editing ? "Edit" : "Add"}: ${def.label}`}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            {editing ? "Save block" : "Add block"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-muted">{def.description}</p>

        {type === "HERO_BANNER" && (
          <>
            <Field label="Picture" required error={errors.image} hint="A wide picture works best.">
              <SingleImageField
                value={form.imageUrl}
                onChange={(url) => set("imageUrl", url)}
                alt={form.title}
              />
            </Field>
            <Field
              label="Phone picture (optional)"
              hint="A taller picture for phones. If empty, the main picture is used."
            >
              <SingleImageField
                value={form.mobileImageUrl}
                onChange={(url) => set("mobileImageUrl", url)}
                alt={form.title}
              />
            </Field>
            {titleBox("Headline", undefined, "e.g. The Bridal Edit")}
            {subtitleBox("Smaller line (optional)", "e.g. Made to order in our studio")}
            {buttonBoxes}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Where the words sit" htmlFor="b-align">
                <Select
                  id="b-align"
                  value={form.textAlign}
                  onChange={(event) => set("textAlign", event.target.value as SectionFormState["textAlign"])}
                >
                  <option value="left">On the left</option>
                  <option value="center">In the middle</option>
                  <option value="right">On the right</option>
                </Select>
              </Field>
              <Field label="Colour of the words" htmlFor="b-tone">
                <Select
                  id="b-tone"
                  value={form.textTone}
                  onChange={(event) => set("textTone", event.target.value as SectionFormState["textTone"])}
                >
                  <option value="light">White (for dark pictures)</option>
                  <option value="dark">Dark (for light pictures)</option>
                </Select>
              </Field>
            </div>
          </>
        )}

        {type === "COLLECTION_TILES" && (
          <>
            {titleBox("Heading (optional)", undefined, "e.g. Shop by occasion")}
            {subtitleBox("Smaller line (optional)")}
            <Field label="Collections to show" required error={errors.collections}>
              <TilesPicker
                collections={collections}
                selected={form.collectionIds}
                onChange={(ids) => set("collectionIds", ids)}
              />
            </Field>
            <Notice>
              Each tile uses the banner picture from its collection, so make sure your collections have one.
            </Notice>
          </>
        )}

        {isProductBlock(type) && (
          <>
            {titleBox("Heading", undefined, "e.g. New Arrivals")}
            {subtitleBox("Smaller line (optional)")}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Show products from" htmlFor="b-collection" required error={errors.collection}>
                <Select
                  id="b-collection"
                  value={form.collectionId}
                  onChange={(event) => set("collectionId", event.target.value)}
                >
                  <option value="">Choose a collection…</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.title}
                      {collection.isPublished ? "" : " (draft)"}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Number of products"
                htmlFor="b-limit"
                error={errors.limit}
                hint={`Between 1 and ${MAX_PRODUCT_LIMIT}.`}
              >
                <Input
                  id="b-limit"
                  type="number"
                  min={1}
                  max={MAX_PRODUCT_LIMIT}
                  value={form.productLimit}
                  onChange={(event) => set("productLimit", event.target.value)}
                />
              </Field>
            </div>
            <Field
              label="“View all” button text (optional)"
              htmlFor="b-button"
              hint="A button that opens the whole collection."
            >
              <Input
                id="b-button"
                value={form.buttonText}
                maxLength={60}
                placeholder="e.g. View all"
                onChange={(event) => set("buttonText", event.target.value)}
              />
            </Field>
          </>
        )}

        {type === "IMAGE_WITH_TEXT" && (
          <>
            <Field label="Picture" required error={errors.image}>
              <SingleImageField
                value={form.imageUrl}
                onChange={(url) => set("imageUrl", url)}
                alt={form.title}
              />
            </Field>
            <Field label="Picture is on the" htmlFor="b-side">
              <Select
                id="b-side"
                value={form.imageSide}
                onChange={(event) => set("imageSide", event.target.value as SectionFormState["imageSide"])}
              >
                <option value="left">Left, with words on the right</option>
                <option value="right">Right, with words on the left</option>
              </Select>
            </Field>
            {titleBox("Heading", undefined, "e.g. Made to order in our studio")}
            <Field label="Words" htmlFor="b-body">
              <RichTextField
                id="b-body"
                value={form.body}
                onChange={(html) => set("body", html)}
                minHeight={120}
              />
            </Field>
            {buttonBoxes}
          </>
        )}

        {type === "RICH_TEXT" && (
          <>
            {titleBox("Heading (optional)")}
            <Field label="Text" htmlFor="b-body" required error={errors.body}>
              <RichTextField id="b-body" value={form.body} onChange={(html) => set("body", html)} />
            </Field>
          </>
        )}

        {type === "FAQ" && (
          <>
            {titleBox("Heading", "Shown above the questions.")}
            {subtitleBox("Smaller line (optional)")}
            <Notice>The questions come from your FAQ list. You can edit them there at any time.</Notice>
          </>
        )}

        <Toggle
          checked={form.isActive}
          onChange={(value) => set("isActive", value)}
          label="Show this block on the website"
          hint="Turn off to hide it without deleting it."
        />
      </div>
    </Modal>
  );
}

// The collections chosen for a tiles block, in the order they appear
function TilesPicker({
  collections,
  selected,
  onChange,
}: {
  collections: CollectionListItem[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const title = (id: string) => collections.find((c) => c.id === id)?.title ?? "Deleted collection";
  const remaining = collections.filter((c) => !selected.includes(c.id));

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <ReorderList
          items={selected}
          getKey={(id) => id}
          onReorder={onChange}
          className="divide-y divide-line rounded-sm border border-line bg-white"
          renderItem={(id, { controls }) => (
            <div className="flex items-center gap-3 p-2">
              {controls}
              <span className="min-w-0 flex-1 truncate">{title(id)}</span>
              <button
                type="button"
                onClick={() => onChange(selected.filter((existing) => existing !== id))}
                aria-label={`Remove ${title(id)}`}
                className="flex h-8 w-8 items-center justify-center rounded-sm text-red-600 hover:bg-red-50"
              >
                <LuTrash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        />
      )}
      {selected.length < MAX_TILES && (
        <div className="flex items-center gap-2">
          <Select
            aria-label="Add a collection"
            value=""
            onChange={(event) => event.target.value && onChange([...selected, event.target.value])}
          >
            <option value="">
              {remaining.length === 0 ? "No more collections to add" : "Add a collection…"}
            </option>
            {remaining.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.title}
                {collection.isPublished ? "" : " (draft)"}
              </option>
            ))}
          </Select>
        </div>
      )}
      <p className="text-xs text-muted">Up to {MAX_TILES}. Drag or use the arrows to set the order.</p>
    </div>
  );
}
