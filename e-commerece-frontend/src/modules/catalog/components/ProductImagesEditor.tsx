"use client";

import Image from "next/image";
import { LuTrash2 } from "react-icons/lu";
import { ImageDropzone } from "@/modules/uploads/components/ImageDropzone";
import { ReorderList } from "@/shared/admin/ReorderList";

export interface ImageDraft {
  url: string;
  altText: string;
  colour: string;
}

export function ProductImagesEditor({
  images,
  colours,
  onChange,
}: {
  images: ImageDraft[];
  // Colours from the product's variants, offered when tagging a photo
  colours: string[];
  onChange: (images: ImageDraft[]) => void;
}) {
  const listId = "product-image-colours";

  function update(url: string, patch: Partial<ImageDraft>) {
    onChange(images.map((image) => (image.url === url ? { ...image, ...patch } : image)));
  }

  return (
    <div className="space-y-4">
      {images.length > 0 && (
        <>
          <p className="text-sm text-muted">
            The first photo is the main one shown in the shop. Drag photos (or use the arrows) to change the order.
          </p>
          <datalist id={listId}>
            {colours.map((colour) => (
              <option key={colour} value={colour} />
            ))}
          </datalist>
          <ReorderList
            items={images}
            getKey={(image) => image.url}
            onReorder={onChange}
            direction="horizontal"
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            itemClassName="rounded-sm border border-line bg-white p-2"
            renderItem={(image, { controls, index }) => (
              <div className="space-y-2">
                <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-cream">
                  <Image
                    src={image.url}
                    alt={image.altText || "Product photo"}
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 20vw, 45vw"
                    className="object-cover"
                  />
                  {index === 0 && (
                    <span className="absolute left-2 top-2 rounded-full bg-black px-2.5 py-0.5 text-[11px] font-medium text-white">
                      Main photo
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label="Remove this photo"
                    onClick={() => onChange(images.filter((candidate) => candidate.url !== image.url))}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-600 shadow hover:bg-white"
                  >
                    <LuTrash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex justify-center">{controls}</div>
                <input
                  list={listId}
                  value={image.colour}
                  onChange={(event) => update(image.url, { colour: event.target.value })}
                  placeholder="Colour (optional)"
                  aria-label="Colour shown in this photo"
                  className="h-9 w-full rounded-sm border border-line px-2 text-sm outline-none focus:border-gold"
                />
                <input
                  value={image.altText}
                  onChange={(event) => update(image.url, { altText: event.target.value })}
                  placeholder="Describe the photo"
                  aria-label="Photo description"
                  className="h-9 w-full rounded-sm border border-line px-2 text-sm outline-none focus:border-gold"
                />
              </div>
            )}
          />
        </>
      )}

      <ImageDropzone
        compact={images.length > 0}
        label={images.length > 0 ? "Add more photos" : "Drag photos here, or click to choose"}
        onUploaded={(uploaded) => {
          const known = new Set(images.map((image) => image.url));
          const added = uploaded
            .filter((file) => !known.has(file.url))
            .map((file) => ({ url: file.url, altText: "", colour: "" }));
          onChange([...images, ...added]);
        }}
      />
    </div>
  );
}
