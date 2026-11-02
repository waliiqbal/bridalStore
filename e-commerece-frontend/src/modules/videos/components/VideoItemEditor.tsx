"use client";

import { useState } from "react";
import { LinkField } from "@/modules/pages/components/LinkField";
import type { LinkGroup } from "@/modules/pages/lib/link-options";
import { newVideoKey, type VideoFormItem } from "@/modules/pages/lib/sections";
import { SingleImageField } from "@/modules/uploads/components/SingleImageField";
import { IMAGE_PRESETS } from "@/modules/uploads/lib/image-presets";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { Field, Input, Toggle } from "@/shared/admin/Form";
import { Modal } from "@/shared/admin/Modal";
import { ProductLinkField, productSlug } from "./ProductLinkField";
import { VideoField } from "./VideoField";

// Add or change one video of a block. Nothing is saved yet: the video joins the block's list, and is
// saved with the block (the "Save block" button).
export function VideoItemEditor({
  video,
  tall,
  linkGroups,
  onClose,
  onDone,
}: {
  // null = adding a new video
  video: VideoFormItem | null;
  // true = a Trending videos block (tall videos), false = a Banner video block (wide videos)
  tall: boolean;
  linkGroups: LinkGroup[];
  onClose: () => void;
  onDone: (video: VideoFormItem) => void;
}) {
  const ui = useAdminUi();
  const [videoUrl, setVideoUrl] = useState<string | null>(video?.videoUrl ?? null);
  const [posterUrl, setPosterUrl] = useState<string | null>(video?.posterUrl ?? null);
  const [title, setTitle] = useState(video?.title ?? "");
  const [linkUrl, setLinkUrl] = useState(video?.linkUrl ?? "");
  const [isActive, setIsActive] = useState(video?.isActive ?? true);

  // The shape of the video and its cover on the website depends on the block
  const preset = tall ? IMAGE_PRESETS.showcaseVideo : IMAGE_PRESETS.videoCover;

  function done() {
    if (!videoUrl) {
      ui.error(new Error("Please choose a video."));
      return;
    }
    onDone({
      key: video?.key ?? newVideoKey(),
      videoUrl,
      posterUrl,
      title: title.trim(),
      linkUrl: linkUrl.trim(),
      isActive,
    });
  }

  return (
    <Modal
      open
      title={video ? "Edit video" : "Add video"}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={done}>{video ? "Done" : "Add video"}</Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field
          label="Video"
          required
          hint="An MP4 file under 50 MB. It plays by itself without sound; customers can turn the sound on."
        >
          <VideoField value={videoUrl} onChange={setVideoUrl} preset={preset} />
        </Field>
        <Field
          label="Cover picture (optional)"
          hint="Shown while the video loads. If empty, the first moment of the video is used."
        >
          <SingleImageField value={posterUrl} onChange={setPosterUrl} alt={title} preset={preset} />
        </Field>
        <Field
          label="Name (optional)"
          htmlFor="v-title"
          hint={
            tall
              ? "Written at the bottom of the video card, like “Black silk Anarkali”."
              : "Only for you, to recognise the video in the list."
          }
        >
          <Input
            id="v-title"
            value={title}
            maxLength={150}
            placeholder="e.g. Eid collection reel"
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <Field
          label="Product this video opens (optional)"
          hint="Customers who tap the video go straight to this product's page."
        >
          <ProductLinkField value={linkUrl} onChange={setLinkUrl} />
        </Field>
        {!productSlug(linkUrl) && (
          <LinkField
            id="v-link"
            label="Or open a category, collection or page (optional)"
            value={linkUrl}
            onChange={setLinkUrl}
            groups={linkGroups}
            hint="Leave both empty if the video should not open anything."
          />
        )}
        <Toggle
          checked={isActive}
          onChange={setIsActive}
          label="Show this video on the website"
          hint="Turn off to hide it without deleting it."
        />
      </div>
    </Modal>
  );
}
