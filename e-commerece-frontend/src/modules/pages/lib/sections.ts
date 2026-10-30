import type { IconType } from "react-icons";
import {
  LuCircleHelp,
  LuColumns2,
  LuGalleryHorizontal,
  LuGrid2X2,
  LuImage,
  LuLayoutGrid,
  LuType,
} from "react-icons/lu";
import type { PageSection, SectionInput, SectionType } from "../types/pages";

export const MAX_TILES = 12;
export const MAX_PRODUCT_LIMIT = 24;
export const DEFAULT_PRODUCT_LIMIT = 8;

export interface SectionTypeDef {
  type: SectionType;
  label: string;
  // Plain-language explanation shown when choosing a block
  description: string;
  icon: IconType;
}

// In the order shown in the "Add a block" window
export const SECTION_TYPES: SectionTypeDef[] = [
  {
    type: "HERO_BANNER",
    label: "Big banner",
    description: "A large picture with a headline and a button. Usually the first thing on the homepage.",
    icon: LuImage,
  },
  {
    type: "COLLECTION_TILES",
    label: "Collection tiles",
    description: "Picture tiles that link to your collections or categories, like Bridal, Formals and Eid Edit.",
    icon: LuGrid2X2,
  },
  {
    type: "PRODUCT_CAROUSEL",
    label: "Product slider",
    description: "A sliding row of products from one collection, like New Arrivals.",
    icon: LuGalleryHorizontal,
  },
  {
    type: "COLLECTION_GRID",
    label: "Product grid",
    description: "A neat grid of products from one collection.",
    icon: LuLayoutGrid,
  },
  {
    type: "IMAGE_WITH_TEXT",
    label: "Picture with text",
    description: "A picture on one side and your words on the other, with an optional button.",
    icon: LuColumns2,
  },
  {
    type: "RICH_TEXT",
    label: "Text",
    description: "A heading and some writing, like a short welcome or announcement.",
    icon: LuType,
  },
  {
    type: "FAQ",
    label: "Questions and answers",
    description: "Shows the questions from your FAQ list, so customers find answers fast.",
    icon: LuCircleHelp,
  },
];

export const sectionDef = (type: SectionType): SectionTypeDef =>
  SECTION_TYPES.find((def) => def.type === type) ?? SECTION_TYPES[0];

export const isProductBlock = (type: SectionType) =>
  type === "PRODUCT_CAROUSEL" || type === "COLLECTION_GRID";

export type TextAlign = "left" | "center" | "right";
export type TextTone = "light" | "dark";
export type ImageSide = "left" | "right";

// A block as edited on screen
export interface SectionFormState {
  type: SectionType;
  title: string;
  subtitle: string;
  body: string;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  linkUrl: string;
  buttonText: string;
  collectionId: string;
  collectionIds: string[];
  productLimit: string;
  textAlign: TextAlign;
  textTone: TextTone;
  imageSide: ImageSide;
  isActive: boolean;
}

export function newSectionForm(type: SectionType): SectionFormState {
  return {
    type,
    title: type === "FAQ" ? "Frequently asked questions" : "",
    subtitle: "",
    body: "",
    imageUrl: null,
    mobileImageUrl: null,
    linkUrl: "",
    buttonText: "",
    collectionId: "",
    collectionIds: [],
    productLimit: String(DEFAULT_PRODUCT_LIMIT),
    textAlign: "center",
    textTone: "light",
    imageSide: "left",
    isActive: true,
  };
}

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

export function toSectionForm(section: PageSection): SectionFormState {
  const settings = section.settings ?? {};
  return {
    type: section.type,
    title: section.title ?? "",
    subtitle: section.subtitle ?? "",
    body: section.body ?? "",
    imageUrl: section.imageUrl,
    mobileImageUrl: typeof settings.mobileImageUrl === "string" ? settings.mobileImageUrl : null,
    linkUrl: section.linkUrl ?? "",
    buttonText: section.buttonText ?? "",
    collectionId: section.collectionId ?? "",
    collectionIds: section.collectionIds,
    productLimit: String(section.productLimit),
    textAlign: pick(settings.textAlign, ["left", "center", "right"], "center"),
    textTone: pick(settings.textTone, ["light", "dark"], "light"),
    imageSide: pick(settings.imageSide, ["left", "right"], "left"),
    isActive: section.isActive,
  };
}

const SAFE_LINK = /^(\/(?!\/)\S*|https?:\/\/\S+|mailto:\S+|tel:[+0-9 ()-]+)$/i;
const plainText = (html: string) =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

export type SectionErrors = Partial<
  Record<"title" | "image" | "body" | "collection" | "collections" | "limit" | "link" | "button", string>
>;

export function validateSectionForm(form: SectionFormState): SectionErrors {
  const errors: SectionErrors = {};
  const { type } = form;

  if ((type === "HERO_BANNER" || type === "IMAGE_WITH_TEXT") && !form.imageUrl) {
    errors.image = "Please add a picture.";
  }
  if (type === "RICH_TEXT" && !plainText(form.body)) errors.body = "Please write some text.";
  if (isProductBlock(type) && !form.collectionId) errors.collection = "Please choose a collection.";
  if (type === "COLLECTION_TILES") {
    if (form.collectionIds.length === 0) errors.collections = "Please choose at least one collection or category.";
    else if (form.collectionIds.length > MAX_TILES)
      errors.collections = `You can show up to ${MAX_TILES} tiles.`;
  }
  if (isProductBlock(type)) {
    const limit = Number(form.productLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PRODUCT_LIMIT) {
      errors.limit = `Enter a number from 1 to ${MAX_PRODUCT_LIMIT}.`;
    }
  }
  if (form.linkUrl.trim() && !SAFE_LINK.test(form.linkUrl.trim())) {
    errors.link = "Use a link like /collections/eid-edit, or a full address starting with https://";
  }
  if (
    form.buttonText.trim() &&
    !form.linkUrl.trim() &&
    (type === "HERO_BANNER" || type === "IMAGE_WITH_TEXT")
  ) {
    errors.link = "Add a link for the button to open.";
  }
  return errors;
}

const orNull = (text: string) => (text.trim() ? text.trim() : null);

// Only the fields a block type uses are sent
export function toSectionInput(form: SectionFormState): SectionInput {
  const { type } = form;
  const input: SectionInput = {
    title: orNull(form.title),
    isActive: form.isActive,
  };

  if (type !== "RICH_TEXT") input.subtitle = type === "IMAGE_WITH_TEXT" ? undefined : orNull(form.subtitle);
  if (type === "RICH_TEXT" || type === "IMAGE_WITH_TEXT") input.body = orNull(form.body);
  if (type === "HERO_BANNER" || type === "IMAGE_WITH_TEXT") {
    input.imageUrl = form.imageUrl;
    input.linkUrl = orNull(form.linkUrl);
    input.buttonText = orNull(form.buttonText);
  }
  if (isProductBlock(type)) {
    input.collectionId = form.collectionId;
    input.productLimit = Number(form.productLimit);
    input.buttonText = orNull(form.buttonText);
  }
  if (type === "COLLECTION_TILES") input.collectionIds = form.collectionIds;

  if (type === "HERO_BANNER") {
    input.settings = {
      textAlign: form.textAlign,
      textTone: form.textTone,
      ...(form.mobileImageUrl && { mobileImageUrl: form.mobileImageUrl }),
    };
  }
  if (type === "IMAGE_WITH_TEXT") input.settings = { imageSide: form.imageSide };
  return input;
}

// One-line description of a block for the list
export function describeSection(section: PageSection, collectionTitle: (id: string) => string): string {
  switch (section.type) {
    case "HERO_BANNER":
    case "IMAGE_WITH_TEXT":
    case "RICH_TEXT":
      return section.title || (section.body ? plainText(section.body).slice(0, 80) : "") || "No headline";
    case "PRODUCT_CAROUSEL":
    case "COLLECTION_GRID":
      return `${section.collectionId ? collectionTitle(section.collectionId) : "No collection"} · ${section.productLimit} products`;
    case "COLLECTION_TILES":
      return section.collectionIds.map(collectionTitle).join(", ") || "No collections";
    case "FAQ":
      return section.title || "Questions and answers";
  }
}
