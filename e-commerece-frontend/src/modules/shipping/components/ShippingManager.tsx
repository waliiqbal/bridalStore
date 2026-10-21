"use client";

import { useState } from "react";
import { LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { useAdminQuery } from "@/shared/admin/hooks";
import { Badge, Card, EmptyState, Notice, PageHeader, Spinner } from "@/shared/admin/Layout";
import { countryName } from "@/shared/lib/countries";
import { formatMoney } from "@/shared/lib/money";
import { deleteRate, deleteZone, listZones } from "../api/shipping.admin.api";
import type { ShippingRate, ShippingZone } from "../types/shipping";
import { RateModal } from "./RateModal";
import { ZoneModal } from "./ZoneModal";

const PREVIEW_COUNTRIES = 8;

// Where you ship and what it costs: zones (groups of countries), each with its own shipping options.
export function ShippingManager() {
  const ui = useAdminUi();
  const zones = useAdminQuery(listZones, []);
  const data = zones.data;
  // `null` = closed, "new" = adding a zone, otherwise the zone being changed
  const [zoneEditor, setZoneEditor] = useState<ShippingZone | "new" | null>(null);
  const [rateEditor, setRateEditor] = useState<{ zone: ShippingZone; rate: ShippingRate | null } | null>(
    null,
  );

  const hasFallback = !!data?.some((z) => z.isFallback);
  const refresh = () => {
    setZoneEditor(null);
    setRateEditor(null);
    zones.reload();
  };

  async function removeZone(zone: ShippingZone) {
    const ok = await ui.confirm({
      title: `Delete the zone “${zone.name}”?`,
      message:
        "Customers in these countries will no longer be able to choose shipping until they are in another zone.",
      confirmLabel: "Delete zone",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteZone(zone.id);
      ui.success("Zone deleted.");
      zones.reload();
    } catch (error) {
      ui.error(error);
    }
  }

  async function removeRate(zone: ShippingZone, rate: ShippingRate) {
    const ok = await ui.confirm({
      title: `Delete “${rate.name}”?`,
      message: `It will no longer be offered to customers in ${zone.name}.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteRate(zone.id, rate.id);
      ui.success("Shipping option deleted.");
      zones.reload();
    } catch (error) {
      ui.error(error);
    }
  }

  return (
    <>
      <PageHeader
        title="Shipping"
        description="Where you ship and what it costs. Make a zone for each group of countries, then add its shipping options. Prices are in Australian dollars; customers in other currencies see them converted."
        actions={
          <Button onClick={() => setZoneEditor("new")}>
            <LuPlus className="h-4 w-4" />
            Add a zone
          </Button>
        }
      />

      {zones.error && (
        <div className="space-y-3">
          <Notice tone="error">{zones.error}</Notice>
          <Button variant="secondary" onClick={zones.reload}>
            Try again
          </Button>
        </div>
      )}
      {!zones.error && !data && <Spinner />}

      {!zones.error && data && data.length === 0 && (
        <EmptyState
          title="No shipping zones yet"
          description="Without a zone, customers can't check out. Start with one for Australia and one for the rest of the world."
          action={<Button onClick={() => setZoneEditor("new")}>Add a zone</Button>}
        />
      )}

      {!zones.error && data && data.length > 0 && (
        <div className={`space-y-6 ${zones.loading ? "opacity-60 transition" : "transition"}`}>
          {!hasFallback && (
            <Notice tone="warning">
              No zone covers “every other country”. Customers outside your listed countries won&apos;t be able
              to order. Add a “Rest of the world” zone if you ship worldwide.
            </Notice>
          )}
          {data.map((zone) => (
            <Card
              key={zone.id}
              title={zone.name}
              actions={
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => setZoneEditor(zone)}>
                    <LuPencil className="h-4 w-4" />
                    Change zone
                  </Button>
                  <button
                    type="button"
                    onClick={() => removeZone(zone)}
                    aria-label={`Delete zone ${zone.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-sm text-red-600 hover:bg-red-50"
                  >
                    <LuTrash2 className="h-4 w-4" />
                  </button>
                </div>
              }
            >
              <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                {zone.isFallback ? (
                  <Badge tone="gold">Every other country</Badge>
                ) : (
                  <>
                    {zone.countryCodes.slice(0, PREVIEW_COUNTRIES).map((code) => (
                      <Badge key={code} tone="neutral">
                        {countryName(code)}
                      </Badge>
                    ))}
                    {zone.countryCodes.length > PREVIEW_COUNTRIES && (
                      <span className="text-muted">+{zone.countryCodes.length - PREVIEW_COUNTRIES} more</span>
                    )}
                  </>
                )}
                <Badge tone={zone.chargesGst ? "green" : "neutral"}>
                  {zone.chargesGst ? "GST applies" : "No GST"}
                </Badge>
              </div>

              {zone.rates.length === 0 ? (
                <p className="rounded-sm border border-dashed border-line bg-cream/50 px-4 py-6 text-center text-sm text-muted">
                  No shipping options yet, so customers can&apos;t order to this zone.
                </p>
              ) : (
                <ul className="divide-y divide-line rounded-sm border border-line">
                  {zone.rates.map((rate) => (
                    <li key={rate.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 sm:p-4">
                      <div className="min-w-0 flex-1 basis-56">
                        <p className="flex flex-wrap items-center gap-2 font-medium">
                          {rate.name}
                          {!rate.isActive && <Badge tone="amber">Switched off</Badge>}
                        </p>
                        <p className="text-sm text-muted">
                          {formatMoney(rate.priceMoney)}
                          {rate.freeOver && ` · free over ${formatMoney(rate.freeOver)}`}
                          {rate.estimatedDays && ` · ${rate.estimatedDays}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => setRateEditor({ zone, rate })}>
                          <LuPencil className="h-4 w-4" />
                          Change
                        </Button>
                        <button
                          type="button"
                          onClick={() => removeRate(zone, rate)}
                          aria-label={`Delete ${rate.name} in ${zone.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-sm text-red-600 hover:bg-red-50"
                        >
                          <LuTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                size="sm"
                variant="secondary"
                className="mt-4"
                onClick={() => setRateEditor({ zone, rate: null })}
              >
                <LuPlus className="h-4 w-4" />
                Add a shipping option
              </Button>
            </Card>
          ))}
        </div>
      )}

      {zoneEditor && (
        <ZoneModal
          key={zoneEditor === "new" ? "new" : zoneEditor.id}
          zone={zoneEditor === "new" ? null : zoneEditor}
          hasFallback={hasFallback}
          onClose={() => setZoneEditor(null)}
          onSaved={refresh}
        />
      )}
      {rateEditor && (
        <RateModal
          key={`${rateEditor.zone.id}-${rateEditor.rate?.id ?? "new"}`}
          zone={rateEditor.zone}
          rate={rateEditor.rate}
          onClose={() => setRateEditor(null)}
          onSaved={refresh}
        />
      )}
    </>
  );
}
