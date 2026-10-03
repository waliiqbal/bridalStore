import { Placeholder } from "@/shared/components/Placeholder";
import { SectionHeading } from "@/shared/components/SectionHeading";

const events = ["Mehendi", "Cocktail", "Engagement", "Trousseau"];

export function BrideGroomSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-16">
      <SectionHeading title="Bride & Groom" subtitle="Outfits for every wedding celebration" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {events.map((e, i) => (
          <a key={e} href="#" className="group relative block overflow-hidden">
            <Placeholder
              index={i + 4}
              className="aspect-[3/4] w-full transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/40 to-transparent pb-5 text-white">
              <span className="font-serif text-xl">{e}</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
