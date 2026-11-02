"use client";

import { LuArrowLeftRight, LuPlus, LuTrash2 } from "react-icons/lu";
import { LinkField } from "@/modules/pages/components/LinkField";
import type { LinkGroup } from "@/modules/pages/lib/link-options";
import { newBlankBanner, type BannerFormItem } from "@/modules/pages/lib/sections";
import { SingleImageField } from "@/modules/uploads/components/SingleImageField";
import { IMAGE_PRESETS } from "@/modules/uploads/lib/image-presets";
import { Button } from "@/shared/admin/Button";
import { Field, Input, Toggle } from "@/shared/admin/Form";

const SLOT_NAMES = ["Left banner", "Right banner", "Second row, left", "Second row, right"];
// The first two places are always shown; a third and fourth can be added
const MIN_SLOTS = 2;

// The banners of a "Side-by-side banners" block, as places laid out the way they appear on the website:
// each one has its picture (with preview and size advice), text and link right here.
// A place left empty is simply not shown. The list is saved with the block.
export function BannerListField({
  banners,
  onChange,
  max,
  linkGroups,
}: {
  // At least two entries (the form fills the first two places with empty ones)
  banners: BannerFormItem[];
  onChange: (banners: BannerFormItem[]) => void;
  max: number;
  linkGroups: LinkGroup[];
}) {
  const change = (index: number, patch: Partial<BannerFormItem>) =>
    onChange(banners.map((banner, i) => (i === index ? { ...banner, ...patch } : banner)));

  const swapFirstTwo = () => onChange([banners[1], banners[0], ...banners.slice(2)]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {banners.map((banner, index) => {
          const id = `pb-${banner.key}`;
          return (
            <section
              key={banner.key}
              aria-label={SLOT_NAMES[index] ?? `Banner ${index + 1}`}
              className="space-y-4 rounded-sm border border-line bg-white p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{SLOT_NAMES[index] ?? `Banner ${index + 1}`}</h3>
                {index < MIN_SLOTS ? (
                  <button
                    type="button"
                    onClick={() => change(index, newBlankBanner())}
                    className="text-xs text-muted underline hover:text-gold"
                  >
                    Clear
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onChange(banners.filter((_, i) => i !== index))}
                    className="flex items-center gap-1 text-xs text-red-600 hover:underline"
                  >
                    <LuTrash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                )}
              </div>

              <Field label="Picture">
                <SingleImageField
                  value={banner.imageUrl || null}
                  onChange={(url) => change(index, { imageUrl: url ?? "" })}
                  alt={banner.title}
                  preset={IMAGE_PRESETS.promoBanner}
                />
              </Field>
              <Field
                label="Phone picture (optional)"
                hint="If empty, the main picture is used on phones too (its sides get cut off)."
              >
                <SingleImageField
                  value={banner.mobileImageUrl}
                  onChange={(url) => change(index, { mobileImageUrl: url })}
                  alt={banner.title}
                  preset={IMAGE_PRESETS.promoBannerPhone}
                />
              </Field>
              <Field label="Headline (optional)" htmlFor={`${id}-title`}>
                <Input
                  id={`${id}-title`}
                  value={banner.title}
                  maxLength={150}
                  placeholder="e.g. Free alterations"
                  onChange={(event) => change(index, { title: event.target.value })}
                />
              </Field>
              <Field label="Smaller line (optional)" htmlFor={`${id}-subtitle`}>
                <Input
                  id={`${id}-subtitle`}
                  value={banner.subtitle}
                  maxLength={300}
                  placeholder="e.g. On every bridal outfit"
                  onChange={(event) => change(index, { subtitle: event.target.value })}
                />
              </Field>
              <Field label="Button text (optional)" htmlFor={`${id}-button`}>
                <Input
                  id={`${id}-button`}
                  value={banner.buttonText}
                  maxLength={60}
                  placeholder="e.g. Learn more"
                  onChange={(event) => change(index, { buttonText: event.target.value })}
                />
              </Field>
              <LinkField
                id={`${id}-link`}
                label="Where the banner goes"
                value={banner.linkUrl}
                onChange={(value) => change(index, { linkUrl: value })}
                groups={linkGroups}
              />
              <Toggle
                checked={banner.isActive}
                onChange={(value) => change(index, { isActive: value })}
                label="Show this banner on the website"
                hint="Turn off to hide it without deleting it."
              />
            </section>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {banners.length >= 2 && (
          <Button variant="secondary" size="sm" onClick={swapFirstTwo}>
            <LuArrowLeftRight className="h-4 w-4" />
            Swap left and right
          </Button>
        )}
        {banners.length < max && (
          <Button variant="secondary" size="sm" onClick={() => onChange([...banners, newBlankBanner()])}>
            <LuPlus className="h-4 w-4" />
            Add another banner
          </Button>
        )}
      </div>
      <p className="text-xs text-muted">
        A place with no picture is not shown. If only one banner has a picture, it is shown full width.
      </p>
    </div>
  );
}
