type Props = { title: string; subtitle?: string };

export function SectionHeading({ title, subtitle }: Props) {
  return (
    <div className="mb-8 text-center">
      <h2 className="font-serif text-2xl uppercase tracking-[0.15em] md:text-3xl">
        {title}
      </h2>
      {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
      <div className="mx-auto mt-4 h-px w-16 bg-gold" />
    </div>
  );
}
