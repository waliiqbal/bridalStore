import Image from "next/image";
import { brand } from "@/config/brand";
import logo from "../../../public/brand/malikah-logo.png";

// The client's logo (gold crown + "Malikah"), made transparent with navy letters so it shows
// on light backgrounds. The original on navy is public/brand/malikah-logo-navy.png.
const SIZES = {
  sm: "h-9 w-auto",
  md: "h-12 w-auto sm:h-16",
  lg: "h-16 w-auto sm:h-20",
} as const;

export function Logo({ size = "md", preload = false }: { size?: keyof typeof SIZES; preload?: boolean }) {
  return (
    <Image
      src={logo}
      alt={brand.name}
      preload={preload}
      sizes="(min-width: 640px) 200px, 150px"
      className={SIZES[size]}
    />
  );
}
