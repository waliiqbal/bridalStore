import { Carousel } from "@/shared/components/Carousel";
import { Placeholder } from "@/shared/components/Placeholder";

const banners = [
  { title: "The Festive Edit", text: "Handcrafted festive wear for every celebration", cta: "Shop Festive" },
  { title: "Bride & Groom", text: "Wedding outfits designed to be remembered", cta: "Explore Bridal" },
  { title: "New Arrivals", text: "Fresh styles added every day", cta: "Shop New In" },
];

export function HeroCarousel() {
  return (
    <Carousel
      slides={banners.map((b, i) => (
        <div key={b.title} className="relative">
          <Placeholder index={i} className="h-[420px] w-full md:h-[600px]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 px-4 text-center text-white">
            <p className="mb-3 text-xs uppercase tracking-[0.4em]">New Season</p>
            <h1 className="font-serif text-4xl md:text-6xl">{b.title}</h1>
            <p className="mt-4 max-w-md text-sm md:text-base">{b.text}</p>
            <a
              href="#"
              className="mt-8 border border-white px-8 py-3 text-xs uppercase tracking-[0.25em] transition hover:bg-white hover:text-foreground"
            >
              {b.cta}
            </a>
          </div>
        </div>
      ))}
    />
  );
}
