import { mapEmbedUrl } from "../lib/store-map";

// A map with a pin on the shop. Size it with className (e.g. "h-64 w-full"). It loads only when scrolled near.
export function StoreMap({
  latitude,
  longitude,
  className = "",
}: {
  latitude: number;
  longitude: number;
  className?: string;
}) {
  return (
    <iframe
      title="Map showing where the shop is"
      src={mapEmbedUrl(latitude, longitude)}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className={`block border-0 ${className}`}
    />
  );
}
