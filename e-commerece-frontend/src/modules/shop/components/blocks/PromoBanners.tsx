import { ArtDirectedImage } from "@/shared/components/ArtDirectedImage";
import { MenuLink } from "@/shared/layouts/MenuLink";
import type { PublicPromoBanner } from "../../types/page";

// The "Side-by-side banners" block: promotion banners the owner chose for this block.
// Side by side on larger screens (two per row), stacked on phones. A single banner is full width.
export function PromoBanners({ banners }: { banners: PublicPromoBanner[] }) {
  if (banners.length === 0) return null;
  const single = banners.length === 1;

  return (
    <section aria-label="Promotions" className="mx-auto w-full max-w-[1600px] px-4 lg:px-6">
      <ul className={`grid gap-3 sm:gap-5 ${single ? "" : "md:grid-cols-2"}`}>
        {banners.map((banner) => {
          const body = (
            <>
              <ArtDirectedImage
                desktopSrc={banner.imageUrl}
                mobileSrc={banner.mobileImageUrl}
                alt={banner.title ?? ""}
                sizes={single ? "100vw" : "(min-width: 768px) 50vw, 100vw"}
                breakpoint={640}
                className="object-cover transition duration-700 group-hover:scale-105"
              />
              <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/15 to-transparent" />
              <span className="absolute inset-0 flex flex-col justify-center p-6 text-white sm:p-10">
                {banner.title && <span className="font-serif text-3xl font-bold sm:text-4xl">{banner.title}</span>}
                {banner.subtitle && <span className="mt-2 max-w-xs text-sm sm:text-base">{banner.subtitle}</span>}
                {banner.buttonText && (
                  <span className="mt-5 inline-block self-start border-b border-white pb-0.5 text-sm font-medium uppercase tracking-wider">
                    {banner.buttonText}
                  </span>
                )}
              </span>
            </>
          );
          const frame = `group relative block aspect-[16/9] overflow-hidden bg-cream ${
            single ? "sm:aspect-[2/1] lg:aspect-[8/3]" : "sm:aspect-[2/1]"
          }`;
          return (
            <li key={banner.id}>
              {banner.linkUrl ? (
                <MenuLink href={banner.linkUrl} className={frame}>
                  {body}
                </MenuLink>
              ) : (
                <div className={frame}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
