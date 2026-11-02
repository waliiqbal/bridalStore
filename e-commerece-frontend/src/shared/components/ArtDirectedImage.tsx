import Image, { getImageProps } from "next/image";
import type { CSSProperties } from "react";
import { focusPosition, focusStyle, imageSrc } from "@/shared/lib/image-focus";

// One picture for phones and a different one for larger screens, where the browser downloads
// only the one it needs. (Two plain <Image> tags hidden with CSS would download both.)
// Fills its parent, which must be `relative` and have a size. Set `eager` for the picture at
// the top of a page: it starts loading first, because it is usually the largest thing on screen.
// Each address may carry the position the owner chose (see image-focus.ts); it is applied here.
export function ArtDirectedImage({
  desktopSrc,
  mobileSrc,
  alt = "",
  sizes = "100vw",
  eager = false,
  className = "",
  // Screens at least this wide (px) get the desktop picture. Use 640 or 768 (see globals.css).
  breakpoint = 768,
}: {
  desktopSrc: string;
  mobileSrc?: string | null;
  alt?: string;
  sizes?: string;
  eager?: boolean;
  className?: string;
  breakpoint?: 640 | 768;
}) {
  const loading = eager ? ({ loading: "eager", fetchPriority: "high" } as const) : {};
  const desktop = imageSrc(desktopSrc);

  if (!mobileSrc) {
    return (
      <Image
        src={desktop}
        alt={alt}
        fill
        sizes={sizes}
        className={className}
        style={focusStyle(desktopSrc)}
        {...loading}
      />
    );
  }

  const positions = {
    "--focus-mobile": focusPosition(mobileSrc),
    "--focus-desktop": focusPosition(desktopSrc),
  } as CSSProperties;
  const common = {
    alt,
    sizes,
    fill: true,
    className: `${className} art-focus art-focus-${breakpoint}`,
    style: positions,
    ...loading,
  } as const;
  const {
    props: { srcSet: desktopSet },
  } = getImageProps({ ...common, src: desktop });
  const { props: mobile } = getImageProps({ ...common, src: imageSrc(mobileSrc) });

  return (
    <picture>
      <source media={`(min-width: ${breakpoint}px)`} srcSet={desktopSet} sizes={sizes} />
      {/* next/image can't draw a <picture>, so this is the plain <img> it would have drawn */}
      <img {...mobile} alt={alt} />
    </picture>
  );
}
