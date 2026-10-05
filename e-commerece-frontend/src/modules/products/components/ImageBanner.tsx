import { Placeholder } from "@/shared/components/Placeholder";

type Props = {
  heading?: string;
  title: string;
  text: string;
  cta: string;
  href?: string;
  index?: number;
  /** Where the text sits on the image */
  align?: "center" | "left" | "right";
  /** "light" = white overlay text and button, "dark" = dark text and black button */
  tone?: "light" | "dark";
  className?: string;
  imageClassName?: string;
};

const alignClass = {
  center: "w-full",
  left: "w-1/2",
  right: "ml-auto w-1/2",
} as const;

export function ImageBanner({
  heading,
  title,
  text,
  cta,
  href = "#",
  index = 0,
  align = "center",
  tone = "light",
  className = "px-2 pt-10 lg:px-4",
  imageClassName = "h-[260px] w-full sm:h-[320px]",
}: Props) {
  const dark = tone === "dark";

  return (
    <section className={className}>
      <div className="relative overflow-hidden">
        <Placeholder index={index} className={imageClassName} />
        <div
          className={`absolute inset-0 flex items-center px-4 ${dark ? "text-black" : "bg-black/40 text-white"}`}
        >
          <div className={`flex flex-col items-center gap-2 text-center sm:gap-3 ${alignClass[align]}`}>
            {heading && <p className="font-serif text-xl sm:text-3xl">{heading}</p>}
            <h2 className="font-serif text-xl sm:text-3xl">{title}</h2>
            <p className="text-sm sm:text-base">{text}</p>
            <a
              href={href}
              className={`mt-1 w-full max-w-[540px] py-3 text-sm uppercase transition sm:text-base ${
                dark
                  ? "max-w-[200px] bg-black text-white hover:bg-neutral-800"
                  : "rounded bg-white text-black hover:bg-neutral-100"
              }`}
            >
              {cta}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
