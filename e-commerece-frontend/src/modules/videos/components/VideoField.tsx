"use client";

import { useRef, useState } from "react";
import { LuUpload } from "react-icons/lu";
import { FocusFrame } from "@/modules/uploads/components/FocusFrame";
import { checkVideoFile, MAX_VIDEO_MB, uploadVideo } from "@/modules/uploads/api/uploads.api";
import type { ImagePreset } from "@/modules/uploads/lib/image-presets";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { CENTRE, imageSrc, parseFocus, withFocus } from "@/shared/lib/image-focus";

// One video: a button to choose an MP4 file, and once it is uploaded a preview in the same shape as
// the video box on the website. Drag the video to choose which part is shown, like a cover photo.
export function VideoField({
  value,
  onChange,
  preset,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  // The shape and size of the video on the website
  preset: ImagePreset & { aspect: number };
}) {
  const ui = useAdminUi();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function choose(file: File | undefined) {
    if (!file) return;
    const problem = checkVideoFile(file);
    if (problem) {
      ui.error(new Error(problem));
      return;
    }
    setUploading(true);
    try {
      onChange((await uploadVideo(file)).url);
    } catch (error) {
      ui.error(error);
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  const saved = parseFocus(value);
  const moved = saved.x !== CENTRE.x || saved.y !== CENTRE.y;

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept="video/mp4,video/webm"
        className="sr-only"
        onChange={(event) => void choose(event.target.files?.[0])}
      />
      {value ? (
        <div className="space-y-3">
          <FocusFrame value={value} kind="video" aspect={preset.aspect} onChange={onChange} />
          <div className="space-y-1 text-xs text-muted">
            <p className="font-medium text-foreground">
              Drag the video to choose which part is shown. Anything outside the box is cut off on your website.
            </p>
            <p>
              Best size: {preset.size}, an MP4 under {MAX_VIDEO_MB} MB. {preset.note}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {moved && (
              <Button variant="secondary" size="sm" onClick={() => onChange(withFocus(imageSrc(value), CENTRE))}>
                Reset position
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => onChange(null)}>
              Remove video
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => input.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-sm border border-dashed border-line bg-cream/50 px-4 py-8 text-sm text-muted hover:border-gold disabled:opacity-60"
          >
            <LuUpload className="h-6 w-6" />
            {uploading ? "Uploading… please wait, this can take a minute" : "Click to choose a video (MP4)"}
            {!uploading && (
              <span className="text-sm font-semibold text-gold">
                Best size: {preset.size} · MP4 up to {MAX_VIDEO_MB} MB
              </span>
            )}
          </button>
          {preset.note && <p className="mt-2 text-xs text-muted">{preset.note}</p>}
        </div>
      )}
    </div>
  );
}
