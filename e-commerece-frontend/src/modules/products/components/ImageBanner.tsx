import { Placeholder } from "@/shared/components/Placeholder";

type Props = {
  heading: string;
  title: string;
  text: string;
  cta: string;
  href?: string;
  index?: number;
};

export function ImageBanner({ heading, title, text, cta, href = "#", index = 0 }: Props) {
  return (
    <section className="px-2 pt-10 lg:px-4">
      <div className="relative overflow-hidden">
        <Placeholder index={index} className="h-[260px] w-full sm:h-[320px]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 sm:gap-3 px-4 text-center text-white">
          <p className="font-serif text-xl sm:text-3xl">{heading}</p>
          <h2 className="font-serif text-xl sm:mt-2 sm:text-3xl">{title}</h2>
          <p className="text-sm sm:text-base">{text}</p>
          <a
            href={href}
            className="mt-1 w-full max-w-[540px] rounded bg-white py-3 text-sm uppercase text-black transition hover:bg-neutral-100 sm:text-base"
          >
            {cta}
          </a>
        </div>
      </div>
    </section>
  );
}
