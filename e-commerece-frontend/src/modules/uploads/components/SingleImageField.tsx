"use client";

import { useState } from "react";
import { Button } from "@/shared/admin/Button";
import { CENTRE, imageSrc, parseFocus, withFocus } from "@/shared/lib/image-focus";
import type { ImagePreset } from "../lib/image-presets";
import { FocusFrame } from "./FocusFrame";
import { ImageDropzone } from "./ImageDropzone";

// One picture (e.g. a banner): an upload box that says the best size, and once a picture is chosen,
// a preview in the same shape as the box on the website. Drag the picture inside the preview to choose
// which part of it is shown (like moving a Facebook cover photo). The choice is saved with the picture.
export function SingleImageField({
  value,
  onChange,
  alt = "",
  preset,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  alt?: string;
  preset?: ImagePreset;
}) {
  // Width of the picture as it was uploaded (read once it has loaded), to warn about small ones
  const [loadedWidth, setLoadedWidth] = useState<{ url: string; width: number } | null>(null);

  const clean = value ? imageSrc(value) : null;
  const minWidth = preset ? Number(/\d+/.exec(preset.size)?.[0] ?? 0) : 0;
  const tooSmall = clean !== null && loadedWidth?.url === clean && minWidth > 0 && loadedWidth.width < minWidth * 0.6;

  if (!value || !clean) {
    return (
      <div>
        <ImageDropzone
          multiple={false}
          compact
          label="Drag a picture here, or click to choose"
          hint={preset ? `Best size: ${preset.size}` : undefined}
          onUploaded={(images) => onChange(images[0]?.url ?? null)}
        />
        {preset?.note && <p className="mt-2 text-xs text-muted">{preset.note}</p>}
      </div>
    );
  }

  const aspect = preset?.aspect;
  const saved = parseFocus(value);
  const moved = saved.x !== CENTRE.x || saved.y !== CENTRE.y;

  return (
    <div className="space-y-3">
      {aspect !== undefined ? (
        <FocusFrame
          value={value}
          kind="image"
          aspect={aspect}
          alt={alt}
          onChange={onChange}
          onSize={(width) => setLoadedWidth({ url: clean, width })}
        />
      ) : (
        <div className="relative h-24 w-24 overflow-hidden rounded-sm border border-line bg-cream">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={clean}
            alt={alt}
            className="h-full w-full object-cover"
            onLoad={(event) => setLoadedWidth({ url: clean, width: event.currentTarget.naturalWidth })}
          />
        </div>
      )}

      {preset && (
        <div className="space-y-1 text-xs text-muted">
          {aspect !== undefined && (
            <p className="font-medium text-foreground">
              Drag the picture to choose which part is shown. Anything outside the box is cut off on your website.
            </p>
          )}
          <p>Best size: {preset.size}</p>
          {tooSmall && (
            <p className="text-amber-700">
              This picture is small ({loadedWidth?.width} px wide), so it may look blurry. A bigger one will look
              sharper.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {aspect !== undefined && moved && (
          <Button variant="secondary" size="sm" onClick={() => onChange(withFocus(clean, CENTRE))}>
            Reset position
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={() => onChange(null)}>
          Remove picture
        </Button>
      </div>
    </div>
  );
}
