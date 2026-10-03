import { Carousel } from "@/shared/components/Carousel";
import { Placeholder } from "@/shared/components/Placeholder";
import { SectionHeading } from "@/shared/components/SectionHeading";

const stories = [
  { name: "Aisha K.", text: "The fit was perfect and the delivery was faster than promised." },
  { name: "Neha R.", text: "Beautiful craftsmanship. I received so many compliments at the wedding." },
  { name: "Sara M.", text: "Easy returns and great support. I will definitely order again." },
];

export function CustomerStories() {
  return (
    <section className="mt-16 bg-cream py-16">
      <div className="mx-auto max-w-3xl px-4">
        <SectionHeading title="Customer Stories" />
        <Carousel
          interval={6000}
          slides={stories.map((s, i) => (
            <div key={s.name} className="flex flex-col items-center px-6 pb-10 text-center">
              <Placeholder index={i} className="h-20 w-20 rounded-full" />
              <p className="mt-6 font-serif text-lg italic">“{s.text}”</p>
              <p className="mt-4 text-xs uppercase tracking-widest text-gold">{s.name}</p>
            </div>
          ))}
        />
      </div>
    </section>
  );
}
