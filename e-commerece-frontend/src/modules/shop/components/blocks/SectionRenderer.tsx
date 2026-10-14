import type { PublicSection } from "../../types/page";
import { FaqBlock } from "../FaqBlock";
import { HeroSlider } from "./HeroSlider";
import { ImageTextBlock } from "./ImageTextBlock";
import { ProductsBlock } from "./ProductsBlock";
import { TilesBlock } from "./TilesBlock";

const align = (value: unknown): "left" | "center" | "right" =>
  value === "center" || value === "right" ? value : "left";

// Turns one of the owner's blocks into what the visitor sees.
export function SectionRenderer({ section }: { section: PublicSection }) {
  switch (section.type) {
    case "HERO_BANNER":
      return section.imageUrl ? (
        <HeroSlider
          slides={[
            {
              id: section.id,
              title: section.title,
              subtitle: section.subtitle,
              imageUrl: section.imageUrl,
              mobileImageUrl: typeof section.settings?.mobileImageUrl === "string" ? section.settings.mobileImageUrl : null,
              linkUrl: section.linkUrl,
              buttonText: section.buttonText,
              align: align(section.settings?.textAlign),
              tone: section.settings?.textTone === "dark" ? "dark" : "light",
            },
          ]}
        />
      ) : null;
    case "COLLECTION_TILES":
      return <TilesBlock section={section} />;
    case "PRODUCT_CAROUSEL":
    case "COLLECTION_GRID":
      return <ProductsBlock section={section} />;
    case "IMAGE_WITH_TEXT":
      return <ImageTextBlock section={section} />;
    case "RICH_TEXT":
      return section.body ? (
        <section className="mx-auto w-full max-w-3xl px-4 lg:px-6">
          {section.title && <h2 className="mb-3 text-center font-serif text-2xl font-bold sm:text-3xl">{section.title}</h2>}
          <div className="richtext" dangerouslySetInnerHTML={{ __html: section.body }} />
        </section>
      ) : null;
    case "FAQ":
      return (
        <div className="px-4 lg:px-6">
          <FaqBlock title={section.title} subtitle={section.subtitle} faqs={section.faqs ?? []} />
        </div>
      );
  }
}
