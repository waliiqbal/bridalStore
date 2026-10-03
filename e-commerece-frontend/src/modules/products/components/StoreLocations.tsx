import { SectionHeading } from "@/shared/components/SectionHeading";

const stores = [
  "New Delhi", "Mumbai", "Bengaluru", "Hyderabad", "Kolkata", "Chennai", "Pune",
  "Ahmedabad", "Jaipur", "Chandigarh", "Lucknow", "Dubai", "London",
];

export function StoreLocations() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-16">
      <SectionHeading title="Visit Our Stores" subtitle="Experience the collection in person" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {stores.map((s) => (
          <a
            key={s}
            href="#"
            className="border border-line py-4 text-center text-sm transition hover:border-gold hover:text-gold"
          >
            📍 {s}
          </a>
        ))}
      </div>
    </section>
  );
}
