import type { IconType } from "react-icons";

export type ServiceItem = {
  icon: IconType;
  title: string;
  text: string;
  cta: string;
  href?: string;
};

type Props = { items: ServiceItem[] };

export function ServiceBanner({ items }: Props) {
  return (
    <section className="px-2 pt-14 lg:px-4">
      <div className="grid divide-y divide-[#6b1a1a]/20 bg-gradient-to-br from-[#f4e8f0] via-[#eddcdc] to-[#e3d6f2] md:grid-cols-2 md:divide-x md:divide-y-0">
        {items.map(({ icon: Icon, title, text, cta, href = "#" }) => (
          <div
            key={title}
            className="flex flex-col items-center gap-3 px-6 py-10 text-center text-[#6b1a1a] md:py-14"
          >
            <Icon className="h-14 w-14 stroke-[1]" />
            <h3 className="mt-4 font-serif text-2xl sm:text-3xl">{title}</h3>
            <p className="text-sm sm:text-base">{text}</p>
            <a
              href={href}
              className="mt-2 bg-white px-8 py-3 text-sm uppercase text-black transition hover:bg-neutral-100 sm:text-base"
            >
              {cta}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
