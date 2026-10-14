"use client";

import { useRef, useState } from "react";
import { LuImagePlus, LuLoaderCircle } from "react-icons/lu";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { checkImageFiles, MAX_IMAGE_MB, uploadImages, type UploadedImage } from "../api/uploads.api";

// Click to choose pictures, or drag them onto the box. Uploads straight away.
export function ImageDropzone({
  onUploaded,
  multiple = true,
  label = "Drag pictures here, or click to choose",
  compact = false,
}: {
  onUploaded: (images: UploadedImage[]) => void;
  multiple?: boolean;
  label?: string;
  compact?: boolean;
}) {
  const ui = useAdminUi();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [hovering, setHovering] = useState(false);

  async function handle(fileList: FileList | null) {
    const files = Array.from(fileList ?? []).slice(0, multiple ? undefined : 1);
    if (files.length === 0) return;
    const problem = checkImageFiles(files);
    if (problem) {
      ui.error(new Error(problem));
      return;
    }
    setBusy(true);
    try {
      onUploaded(await uploadImages(files));
    } catch (error) {
      ui.error(error);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !busy && inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (!busy) inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setHovering(true);
      }}
      onDragLeave={() => setHovering(false)}
      onDrop={(event) => {
        event.preventDefault();
        setHovering(false);
        void handle(event.dataTransfer.files);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed text-center transition ${
        compact ? "px-4 py-6" : "px-4 py-10"
      } ${hovering ? "border-gold bg-cream" : "border-line bg-cream/40 hover:border-gold"}`}
    >
      {busy ? (
        <LuLoaderCircle className="h-7 w-7 animate-spin text-gold" />
      ) : (
        <LuImagePlus className="h-7 w-7 text-gold" />
      )}
      <p className="text-sm font-medium">{busy ? "Uploading…" : label}</p>
      <p className="text-xs text-muted">JPG, PNG or WebP · up to {MAX_IMAGE_MB} MB each</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={(event) => void handle(event.target.files)}
      />
    </div>
  );
}
