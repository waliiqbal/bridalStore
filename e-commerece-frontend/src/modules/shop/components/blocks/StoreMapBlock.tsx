import { LuMapPin } from "react-icons/lu";
import { getSettings } from "../../api/shop.api";
import { directionsUrl, hasMapPosition } from "../../lib/store-map";
import type { PublicSection } from "../../types/page";
import { StoreMap } from "../StoreMap";

// The "Map and address" block. Nothing is stored in the block: the address and map position are
// the shop's Settings, so they are changed in one place. Shows nothing until the owner has filled them in.
export async function StoreMapBlock({ section }: { section: PublicSection }) {
  const settings = await getSettings().catch(() => null);
  if (!settings) return null;
  const directions = directionsUrl(settings);
  if (!settings.storeAddress && !hasMapPosition(settings)) return null;

  return (
    <section className="mx-auto w-full max-w-5xl px-4 lg:px-6">
      {section.title && (
        <h2 className="mb-5 text-center font-serif text-2xl font-bold sm:text-3xl">{section.title}</h2>
      )}
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] md:items-stretch">
        <div className="flex flex-col justify-center gap-5 bg-cream p-6">
          <p className="font-condensed text-xl font-semibold uppercase tracking-wide">{settings.storeName}</p>
          {settings.storeAddress && (
            <p className="flex items-start gap-3">
              <LuMapPin className="mt-1 h-5 w-5 shrink-0 text-gold" aria-hidden />
              <span>{settings.storeAddress}</span>
            </p>
          )}
          {directions && (
            <a
              href={directions}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block self-start bg-black px-7 py-3.5 text-sm font-medium uppercase tracking-wider text-white transition hover:bg-gold"
            >
              Get directions
            </a>
          )}
        </div>
        {hasMapPosition(settings) && (
          <StoreMap
            latitude={settings.mapLatitude}
            longitude={settings.mapLongitude}
            className="h-72 w-full md:h-full md:min-h-80"
          />
        )}
      </div>
    </section>
  );
}
