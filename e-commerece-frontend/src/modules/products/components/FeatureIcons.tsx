import {
  LuGlobe,
  LuRotateCcw,
  LuRuler,
  LuScissors,
  LuShirt,
  LuStar,
  LuTruck,
} from "react-icons/lu";

const features = [
  { icon: LuTruck, label: "24-Hour Dispatch" },
  { icon: LuRotateCcw, label: "Easy Returns" },
  { icon: LuGlobe, label: "Free Shipping* Over $200" },
  { icon: LuScissors, label: "Express Tailoring" },
  { icon: LuRuler, label: "Made-to-Measure Fit" },
  { icon: LuShirt, label: "New Styles Daily" },
];

export function FeatureIcons() {
  return (
    <section className="pt-4">
      <div className="mx-2 flex flex-col items-start justify-between gap-3 rounded-lg bg-black px-6 py-4 text-white sm:flex-row sm:items-center lg:mx-3 lg:px-8">
        <p className="flex items-center gap-3 text-sm sm:text-base">
          <LuStar className="h-5 w-5 shrink-0 fill-white" />
          Scroll down to explore styles picked around your interests
        </p>
        <a
          href="#"
          className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black transition hover:bg-neutral-200"
        >
          See Your Picks
        </a>
      </div>

      <div className="mx-auto grid max-w-[1600px] grid-cols-2 gap-6 px-4 py-8 lg:px-6 sm:grid-cols-3 lg:grid-cols-6">
        {features.map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-3 text-center">
            <Icon className="h-10 w-10 stroke-[1]" />
            <span className="text-sm sm:text-base">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
