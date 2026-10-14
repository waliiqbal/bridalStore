"use client";

import Image from "next/image";
import { Button } from "@/shared/admin/Button";
import { ImageDropzone } from "./ImageDropzone";

// One picture (e.g. a category photo): shows it with Replace / Remove, or an upload box.
export function SingleImageField({
  value,
  onChange,
  alt = "",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  alt?: string;
}) {
  if (!value) {
    return (
      <ImageDropzone
        multiple={false}
        compact
        label="Drag a picture here, or click to choose"
        onUploaded={(images) => onChange(images[0]?.url ?? null)}
      />
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-sm border border-line bg-cream">
        <Image src={value} alt={alt} fill unoptimized sizes="96px" className="object-cover" />
      </div>
      <Button variant="secondary" size="sm" onClick={() => onChange(null)}>
        Remove picture
      </Button>
    </div>
  );
}
