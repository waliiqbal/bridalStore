import { brand } from "@/config/brand";
import { Placeholder } from "@/shared/components/Placeholder";
import { SectionHeading } from "@/shared/components/SectionHeading";

export function InstagramFeed() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-16">
      <SectionHeading title="Follow Us" subtitle={`@${brand.handle} on Instagram`} />
      <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <a key={i} href="#" className="group overflow-hidden">
            <Placeholder
              index={i}
              className="aspect-square w-full transition duration-500 group-hover:scale-110"
            />
          </a>
        ))}
      </div>
    </section>
  );
}
