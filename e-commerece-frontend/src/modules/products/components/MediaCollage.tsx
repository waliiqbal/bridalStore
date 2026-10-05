import { Placeholder } from "@/shared/components/Placeholder";
import { SectionHeading } from "@/shared/components/SectionHeading";

export type CollageItem = {
  /** Path to a video in /public (e.g. "/videos/saree.mp4"). Plays instead of the image. */
  videoSrc?: string;
};

type Props = {
  heading: string;
  /** Exactly 4: [tall left, wide top-right, small bottom-left, small bottom-right] */
  items: [CollageItem, CollageItem, CollageItem, CollageItem];
  lines: string[];
  title: string;
  cta: string;
  text: string;
  href?: string;
  index?: number;
};

// grid placement for each of the 4 tiles
const tiles = [
  "col-span-2 row-span-2",
  "col-span-2",
  "col-span-1",
  "col-span-1",
] as const;

export function MediaCollage({ heading, items, lines, title, cta, text, href = "#", index = 0 }: Props) {
  return (
    <section className="px-2 pt-14 lg:px-4">
      <SectionHeading title={heading} />

      <div className="grid items-center gap-6 bg-[#fdf4f1] p-4 lg:grid-cols-[1.5fr_1fr] lg:p-10">
        <div className="grid h-[380px] grid-cols-4 grid-rows-2 gap-3 sm:h-[520px] lg:h-[580px]">
          {items.map((item, i) => (
            <div key={i} className={`overflow-hidden ${tiles[i]}`}>
              {item.videoSrc ? (
                <video
                  src={item.videoSrc}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <Placeholder index={i + index} className="h-full w-full" />
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4 text-center text-[#6b1a1a]">
          <div className="font-serif uppercase leading-tight">
            {lines.map((line) => (
              <p key={line} className="text-xl sm:text-2xl">{line}</p>
            ))}
            <h3 className="mt-1 text-3xl font-bold sm:text-5xl">{title}</h3>
          </div>
          <a
            href={href}
            className="bg-black px-8 py-3 text-sm uppercase text-white transition hover:bg-neutral-800 sm:text-base"
          >
            {cta}
          </a>
          <p className="text-sm text-foreground sm:text-base">{text}</p>
        </div>
      </div>
    </section>
  );
}
