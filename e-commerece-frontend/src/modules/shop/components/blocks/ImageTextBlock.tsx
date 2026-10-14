import Image from "next/image";
import { MenuLink } from "@/shared/layouts/MenuLink";
import type { PublicSection } from "../../types/page";

// A picture on one side and the owner's words on the other.
export function ImageTextBlock({ section }: { section: PublicSection }) {
  if (!section.imageUrl) return null;
  const imageRight = section.settings?.imageSide === "right";

  return (
    <section className="mx-auto w-full max-w-[1600px] px-4 lg:px-6">
      <div className="grid items-center gap-8 bg-cream md:grid-cols-2 md:gap-0">
        <div className={`relative aspect-[4/5] md:aspect-auto md:min-h-[34rem] ${imageRight ? "md:order-2" : ""}`}>
          <Image
            src={section.imageUrl}
            alt={section.title ?? ""}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="px-6 pb-10 md:px-14 md:py-12 lg:px-20">
          {section.title && <h2 className="font-serif text-3xl font-bold leading-tight sm:text-4xl">{section.title}</h2>}
          {section.body && <div className="richtext mt-4 max-w-lg" dangerouslySetInnerHTML={{ __html: section.body }} />}
          {section.buttonText && section.linkUrl && (
            <MenuLink
              href={section.linkUrl}
              className="mt-7 inline-block bg-black px-8 py-3.5 text-sm font-medium uppercase tracking-wider text-white transition hover:bg-gold"
            >
              {section.buttonText}
            </MenuLink>
          )}
        </div>
      </div>
    </section>
  );
}
