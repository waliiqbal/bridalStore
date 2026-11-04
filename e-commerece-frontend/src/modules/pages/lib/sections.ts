import type { IconType } from "react-icons";
import {
  LuCircleHelp,
  LuClapperboard,
  LuColumns2,
  LuGalleryHorizontal,
  LuGrid2X2,
  LuPanelsTopLeft,
  LuImage,
  LuLayoutGrid,
  LuMapPin,
  LuType,
  LuVideo,
} from "react-icons/lu";
import type { PageSection, SectionBanner, SectionInput, SectionType, SectionVideo } from "../types/pages";

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
    type: "PROMO_BANNERS",
    label: "Side-by-side banners",
    description:
      "Two promotion banners next to each other, like “Eid Sale” and “Free alterations”. Put it anywhere on the page. Add the block again for another pair.",
    icon: LuPanelsTopLeft,
  },
  {
    type: "VIDEO_BANNER",
    label: "Banner video",
    description: "A wide video that looks like a banner. Add one video, or several that slide sideways.",
    icon: LuClapperboard,
  },
  {
    type: "VIDEO_SHOWCASE",
    label: "Trending videos",
    description:
      "A row of tall videos like reels (up to 50), the one in the middle bigger. You can add this block more than once, each with its own videos.",
    icon: LuVideo,
  },
  {
    type: "FAQ",
    label: "Questions and answers",
    description: "Shows the questions from your FAQ list, so customers find answers fast.",
    icon: LuCircleHelp,
  },
  {
    type: "STORE_MAP",
    label: "Map and address",
    description:
      "Your shop's address with a map and a “Get directions” link. The address and map position come from Settings, so you only change them there.",
    icon: LuMapPin,
  },
];

export const sectionDef = (type: SectionType): SectionTypeDef =>
  SECTION_TYPES.find((def) => def.type === type) ?? SECTION_TYPES[0];

export const isProductBlock = (type: SectionType) =>
  type === "PRODUCT_CAROUSEL" || type === "COLLECTION_GRID";

export const isVideoBlock = (type: SectionType) => type === "VIDEO_BANNER" || type === "VIDEO_SHOWCASE";

export const isPromoBlock = (type: SectionType) => type === "PROMO_BANNERS";

// The most banners one side-by-side block holds (two per row)
export const MAX_PROMO_BANNERS = 4;

// A banner as edited on screen. `key` only tells list rows apart.
export interface BannerFormItem {
  key: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string;
  buttonText: string;
  isActive: boolean;
}

let nextBannerKey = 0;
export const newBannerKey = () => `banner-${nextBannerKey++}`;

// An empty place in a side-by-side banners block
export const newBlankBanner = (): BannerFormItem => ({
  key: newBannerKey(),
  title: "",
  subtitle: "",
  imageUrl: "",
  mobileImageUrl: null,
  linkUrl: "",
  buttonText: "",
  isActive: true,
});

// A place counts as used as soon as anything is filled in
const isUsedBanner = (banner: BannerFormItem) =>
  Boolean(
    banner.imageUrl ||
      banner.mobileImageUrl ||
      banner.title.trim() ||
      banner.subtitle.trim() ||
      banner.buttonText.trim() ||
      banner.linkUrl.trim(),
  );

// The block always shows at least two places
const withMinimumPlaces = (banners: BannerFormItem[]): BannerFormItem[] => [
  ...banners,
  ...Array.from({ length: Math.max(0, 2 - banners.length) }, newBlankBanner),
];

export const toBannerItem = (banner: SectionBanner): BannerFormItem => ({
  key: newBannerKey(),
  title: banner.title ?? "",
  subtitle: banner.subtitle ?? "",
  imageUrl: banner.imageUrl,
  mobileImageUrl: banner.mobileImageUrl,
  linkUrl: banner.linkUrl ?? "",
  buttonText: banner.buttonText ?? "",
  isActive: banner.isActive,
});

// The most videos one block holds
export const MAX_BANNER_VIDEOS = 10;
export const MAX_SHOWCASE_VIDEOS = 50;
export const maxVideos = (type: SectionType) => (type === "VIDEO_BANNER" ? MAX_BANNER_VIDEOS : MAX_SHOWCASE_VIDEOS);

// A video as edited on screen. `key` only tells list rows apart; the link is text while editing.
export interface VideoFormItem {
  key: string;
  title: string;
  videoUrl: string;
  posterUrl: string | null;
  linkUrl: string;
  isActive: boolean;
}

let nextVideoKey = 0;
export const newVideoKey = () => `video-${nextVideoKey++}`;

export const toVideoItem = (video: SectionVideo): VideoFormItem => ({
  key: newVideoKey(),
  title: video.title ?? "",
  videoUrl: video.videoUrl,
  posterUrl: video.posterUrl,
  linkUrl: video.linkUrl ?? "",
  isActive: video.isActive,
});

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
  videos: VideoFormItem[];
  banners: BannerFormItem[];
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
    videos: [],
    banners: type === "PROMO_BANNERS" ? withMinimumPlaces([]) : [],
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
    videos: (section.videos ?? []).map(toVideoItem),
    banners: section.type === "PROMO_BANNERS" ? withMinimumPlaces((section.banners ?? []).map(toBannerItem)) : [],
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
  Record<"title" | "image" | "body" | "collection" | "collections" | "limit" | "link" | "button" | "videos" | "banners", string>
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
  if (isVideoBlock(type)) {
    if (form.videos.length === 0) errors.videos = "Please add at least one video.";
    else if (form.videos.length > maxVideos(type)) errors.videos = `You can add up to ${maxVideos(type)} videos.`;
  }
  if (isPromoBlock(type)) {
    const used = form.banners.filter(isUsedBanner);
    if (used.length === 0) errors.banners = "Please add a picture to at least one banner.";
    else if (form.banners.length > MAX_PROMO_BANNERS) errors.banners = `You can add up to ${MAX_PROMO_BANNERS} banners.`;
    else {
      const problems = form.banners.flatMap((banner, index) => {
        if (!isUsedBanner(banner)) return [];
        const name = `Banner ${index + 1}`;
        if (!banner.imageUrl) return [`${name} needs a picture.`];
        if (banner.linkUrl.trim() && !SAFE_LINK.test(banner.linkUrl.trim())) {
          return [`${name}: use a link like /collections/eid-edit, or an address starting with https://`];
        }
        if (banner.buttonText.trim() && !banner.linkUrl.trim()) return [`${name}: add a link for the button to open.`];
        return [];
      });
      if (problems.length > 0) errors.banners = problems[0];
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
  if (isPromoBlock(type)) {
    input.banners = form.banners.filter((banner) => banner.imageUrl).map((banner) => ({
      title: orNull(banner.title),
      subtitle: orNull(banner.subtitle),
      imageUrl: banner.imageUrl,
      mobileImageUrl: banner.mobileImageUrl,
      linkUrl: orNull(banner.linkUrl),
      buttonText: orNull(banner.buttonText),
      isActive: banner.isActive,
    }));
  }
  if (isVideoBlock(type)) {
    input.videos = form.videos.map((video) => ({
      title: orNull(video.title),
      videoUrl: video.videoUrl,
      posterUrl: video.posterUrl,
      linkUrl: orNull(video.linkUrl),
      isActive: video.isActive,
    }));
  }

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
    case "STORE_MAP":
      return section.title || "Map and address";
    case "PROMO_BANNERS": {
      const count = section.banners?.length ?? 0;
      return `${section.title || "Side-by-side banners"} · ${count} ${count === 1 ? "banner" : "banners"}`;
    }
    case "VIDEO_SHOWCASE":
    case "VIDEO_BANNER": {
      const count = section.videos?.length ?? 0;
      return `${section.title || (section.type === "VIDEO_BANNER" ? "Banner video" : "Trending videos")} · ${count} ${count === 1 ? "video" : "videos"}`;
    }
  }
}
