import { Placeholder } from "@/shared/components/Placeholder";

type Props = {
  eyebrow: string;
  title: string;
  text: string;
  cta: string;
  index?: number;
  reverse?: boolean;
};

export function FeatureBanner({ eyebrow, title, text, cta, index = 0, reverse }: Props) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-16">
      <div
        className={`grid items-center bg-cream md:grid-cols-2 ${
          reverse ? "md:[&>*:first-child]:order-2" : ""
        }`}
      >
        <Placeholder
          index={index}
          className="aspect-[4/3] w-full md:aspect-auto md:h-full md:min-h-[420px]"
        />
        <div className="p-8 text-center md:p-16">
          <p className="text-xs uppercase tracking-[0.35em] text-gold">{eyebrow}</p>
          <h2 className="mt-3 font-serif text-3xl md:text-4xl">{title}</h2>
          <p className="mx-auto mt-4 max-w-sm text-sm text-muted">{text}</p>
          <a
            href="#"
            className="mt-8 inline-block border border-foreground px-8 py-3 text-xs uppercase tracking-[0.25em] transition hover:bg-foreground hover:text-white"
          >
            {cta}
          </a>
        </div>
      </div>
    </section>
  );
}
