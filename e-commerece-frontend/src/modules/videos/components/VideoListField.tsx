"use client";

import { useState } from "react";
import { LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";
import type { LinkGroup } from "@/modules/pages/lib/link-options";
import type { VideoFormItem } from "@/modules/pages/lib/sections";
import { Button } from "@/shared/admin/Button";
import { Badge } from "@/shared/admin/Layout";
import { ReorderList } from "@/shared/admin/ReorderList";
import { imageSrc } from "@/shared/lib/image-focus";
import { VideoItemEditor } from "./VideoItemEditor";

// The videos of one block: add, change, delete and put in order. The list is saved with the block.
export function VideoListField({
  videos,
  onChange,
  max,
  tall,
  linkGroups,
}: {
  videos: VideoFormItem[];
  onChange: (videos: VideoFormItem[]) => void;
  max: number;
  tall: boolean;
  linkGroups: LinkGroup[];
}) {
  // `null` = closed, `"new"` = adding, otherwise the video being edited
  const [editing, setEditing] = useState<VideoFormItem | "new" | null>(null);

  function done(video: VideoFormItem) {
    onChange(
      editing === "new" ? [...videos, video] : videos.map((existing) => (existing.key === video.key ? video : existing)),
    );
    setEditing(null);
  }

  return (
    <div className="space-y-3">
      {videos.length > 0 && (
        <ReorderList
          items={videos}
          getKey={(video) => video.key}
          onReorder={onChange}
          className="space-y-2"
          itemClassName="rounded-sm border border-line bg-white"
          renderItem={(video, { controls }) => (
            <div className="flex flex-wrap items-center gap-3 p-2.5">
              {controls}
              <video
                src={imageSrc(video.videoUrl)}
                poster={video.posterUrl ? imageSrc(video.posterUrl) : undefined}
                muted
                preload="metadata"
                className={`shrink-0 rounded-sm bg-black object-cover ${tall ? "aspect-[9/16] w-12" : "aspect-video w-24"}`}
              />
              <p className="min-w-0 flex-1 basis-32 truncate text-sm font-medium">{video.title || "No name"}</p>
              {!video.isActive && <Badge tone="neutral">Switched off</Badge>}
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => setEditing(video)}>
                  <LuPencil className="h-4 w-4" />
                  Edit
                </Button>
                <button
                  type="button"
                  onClick={() => onChange(videos.filter((existing) => existing.key !== video.key))}
                  aria-label={`Remove video ${video.title}`}
                  className="flex h-9 w-9 items-center justify-center rounded-sm text-red-600 hover:bg-red-50"
                >
                  <LuTrash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        />
      )}
      {videos.length < max ? (
        <Button variant="secondary" onClick={() => setEditing("new")}>
          <LuPlus className="h-4 w-4" />
          Add video
        </Button>
      ) : (
        <p className="text-sm text-muted">This block is full ({max} videos).</p>
      )}
      <p className="text-xs text-muted">
        {tall ? "Tall videos, like reels (1080 × 1920)." : "Wide videos, like a banner."} Drag or use the arrows to set
        the order. Your changes are saved when you press the save button below.
      </p>

      {editing && (
        <VideoItemEditor
          // A fresh editor each time it opens
          key={editing === "new" ? "new" : editing.key}
          video={editing === "new" ? null : editing}
          tall={tall}
          linkGroups={linkGroups}
          onClose={() => setEditing(null)}
          onDone={done}
        />
      )}
    </div>
  );
}
