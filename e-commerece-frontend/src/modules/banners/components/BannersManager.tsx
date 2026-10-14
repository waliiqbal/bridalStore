"use client";

import { useState } from "react";
import Image from "next/image";
import { LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";
import { useLinkGroups } from "@/modules/pages/hooks/use-link-groups";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { useAdminQuery } from "@/shared/admin/hooks";
import { Badge, EmptyState, Notice, PageHeader, Spinner } from "@/shared/admin/Layout";
import { ReorderList } from "@/shared/admin/ReorderList";
import { deleteBanner, listBanners, reorderBanners } from "../api/banners.api";
import { bannerStatus, formatWhen, placementLabel } from "../lib/banner-form";
import type { AdminBanner } from "../types/banners";
import { BannerEditor } from "./BannerEditor";

export function BannersManager() {
  const ui = useAdminUi();
  const banners = useAdminQuery(() => listBanners(), []);
  const links = useLinkGroups();
  // `null` = closed, `"new"` = adding, otherwise the banner being edited
  const [editing, setEditing] = useState<AdminBanner | "new" | null>(null);

  // Banners are grouped by where they appear
  const groups = new Map<string, AdminBanner[]>();
  for (const banner of banners.data ?? [])
    groups.set(banner.placement, [...(groups.get(banner.placement) ?? []), banner]);

  async function reorder(next: AdminBanner[]) {
    try {
      await reorderBanners(next.map((banner) => banner.id));
      banners.reload();
    } catch (error) {
      ui.error(error);
    }
  }

  async function remove(banner: AdminBanner) {
    const ok = await ui.confirm({
      title: "Delete this banner?",
      message: "It will disappear from your website. Its picture stays in your image library.",
      confirmLabel: "Delete banner",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteBanner(banner.id);
      ui.success("Banner deleted.");
      banners.reload();
    } catch (error) {
      ui.error(error);
    }
  }

  const failure = banners.error ?? links.error;

  return (
    <>
      <PageHeader
        title="Banners"
        description="Promotional pictures for your website, like an Eid sale. Set dates and they appear and disappear by themselves."
        actions={
          <Button onClick={() => setEditing("new")}>
            <LuPlus className="h-4 w-4" />
            Add banner
          </Button>
        }
      />

      {failure && (
        <div className="space-y-3">
          <Notice tone="error">{failure}</Notice>
          <Button
            variant="secondary"
            onClick={() => {
              banners.reload();
              links.reload();
            }}
          >
            Try again
          </Button>
        </div>
      )}
      {!failure && !banners.data && <Spinner />}

      {!failure && banners.data && banners.data.length === 0 && (
        <EmptyState
          title="No banners yet"
          description="Add a picture with a headline and a button. Choose where it appears and when."
          action={<Button onClick={() => setEditing("new")}>Add banner</Button>}
        />
      )}

      {!failure && banners.data && banners.data.length > 0 && (
        <div className="space-y-8">
          {[...groups.entries()].map(([placement, list]) => (
            <section key={placement}>
              <h2 className="mb-3 font-serif text-xl font-bold">{placementLabel(placement)}</h2>
              <ReorderList
                items={list}
                getKey={(banner) => banner.id}
                onReorder={reorder}
                className="space-y-3"
                itemClassName="rounded-sm border border-line bg-white"
                renderItem={(banner, { controls }) => {
                  const status = bannerStatus(banner);
                  return (
                    <div className="flex flex-wrap items-center gap-3 p-3">
                      {controls}
                      <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-sm bg-cream">
                        <Image
                          src={banner.imageUrl}
                          alt=""
                          fill
                          unoptimized
                          sizes="112px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1 basis-48">
                        <p className="truncate font-medium">{banner.title || "No headline"}</p>
                        <p className="truncate text-sm text-muted">
                          {banner.startsAt || banner.endsAt
                            ? `${banner.startsAt ? formatWhen(banner.startsAt) : "Now"} → ${banner.endsAt ? formatWhen(banner.endsAt) : "no end date"}`
                            : "Shows all the time"}
                        </p>
                      </div>
                      <Badge tone={status.tone}>{status.label}</Badge>
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => setEditing(banner)}>
                          <LuPencil className="h-4 w-4" />
                          Edit
                        </Button>
                        <button
                          type="button"
                          onClick={() => remove(banner)}
                          aria-label={`Delete banner ${banner.title ?? ""}`}
                          className="flex h-9 w-9 items-center justify-center rounded-sm text-red-600 hover:bg-red-50"
                        >
                          <LuTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                }}
              />
            </section>
          ))}
        </div>
      )}

      {editing && (
        <BannerEditor
          // A fresh editor each time it opens
          key={editing === "new" ? "new" : editing.id}
          banner={editing === "new" ? null : editing}
          linkGroups={links.groups}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            banners.reload();
          }}
        />
      )}
    </>
  );
}
