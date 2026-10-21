import Image, { getImageProps } from "next/image";

// One picture for phones and a different one for larger screens, where the browser downloads
// only the one it needs. (Two plain <Image> tags hidden with CSS would download both.)
// Fills its parent, which must be `relative` and have a size. Set `eager` for the picture at
// the top of a page: it starts loading first, because it is usually the largest thing on screen.
export function ArtDirectedImage({
  desktopSrc,
  mobileSrc,
  alt = "",
  sizes = "100vw",
  eager = false,
  className = "",
  // Screens at least this wide (px) get the desktop picture
  breakpoint = 768,
}: {
  desktopSrc: string;
  mobileSrc?: string | null;
  alt?: string;
  sizes?: string;
  eager?: boolean;
  className?: string;
  breakpoint?: number;
}) {
  const loading = eager ? ({ loading: "eager", fetchPriority: "high" } as const) : {};

  if (!mobileSrc) {
    return <Image src={desktopSrc} alt={alt} fill sizes={sizes} className={className} {...loading} />;
  }

  const common = { alt, sizes, fill: true, className, ...loading } as const;
  const {
    props: { srcSet: desktopSet },
  } = getImageProps({ ...common, src: desktopSrc });
  const { props: mobile } = getImageProps({ ...common, src: mobileSrc });

  return (
    <picture>
      <source media={`(min-width: ${breakpoint}px)`} srcSet={desktopSet} sizes={sizes} />
      {/* next/image can't draw a <picture>, so this is the plain <img> it would have drawn */}
      <img {...mobile} alt={alt} />
    </picture>
  );
}
