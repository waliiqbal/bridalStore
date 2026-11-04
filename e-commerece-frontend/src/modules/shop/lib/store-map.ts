import type { StoreSettings } from "../types/shop";

export type StorePlace = Pick<StoreSettings, "storeAddress" | "mapLatitude" | "mapLongitude">;

// The map needs both coordinates (Settings → Shop address and map)
export function hasMapPosition(place: StorePlace): place is StorePlace & { mapLatitude: number; mapLongitude: number } {
  return place.mapLatitude !== null && place.mapLongitude !== null;
}

// Google's own embedded map; it needs no key
export const mapEmbedUrl = (latitude: number, longitude: number) =>
  `https://www.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`;

// Opens Google Maps (the app on phones) pointing at the shop. Falls back to the address when there are no coordinates.
export function directionsUrl(place: StorePlace): string | null {
  const query = hasMapPosition(place) ? `${place.mapLatitude},${place.mapLongitude}` : place.storeAddress;
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}
