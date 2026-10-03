import { Placeholder } from "@/shared/components/Placeholder";
import { SectionHeading } from "@/shared/components/SectionHeading";

const styles = ["Minimalist", "Classic", "Printed", "Heavy Embroidered"];

export function CuratedCollections() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-16">
      <SectionHeading title="Curated Collections" subtitle="Find the style that speaks to you" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {styles.map((s, i) => (
          <a key={s} href="#" className="group block text-center">
            <Placeholder
              index={i + 2}
              className="aspect-[3/4] w-full transition group-hover:opacity-90"
            />
            <p className="mt-3 text-sm uppercase tracking-widest">{s}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
