import Link from "next/link";

// The heading above a block: title, a smaller line, and an optional "View all" link on the right.
export function SectionHeader({
  title,
  subtitle,
  viewAllHref,
  viewAllLabel,
  center = false,
}: {
  title: string | null;
  subtitle?: string | null;
  viewAllHref?: string | null;
  viewAllLabel?: string | null;
  center?: boolean;
}) {
  if (!title && !subtitle) return null;
  return (
    <div className={`mb-6 flex gap-4 ${center ? "flex-col items-center text-center" : "items-end justify-between"}`}>
      <div>
        {title && <h2 className="font-serif text-2xl font-bold sm:text-3xl">{title}</h2>}
        {subtitle && <p className="mt-1.5 text-sm text-muted sm:text-base">{subtitle}</p>}
      </div>
      {viewAllHref && viewAllLabel && (
        <Link href={viewAllHref} className="shrink-0 text-sm font-medium uppercase tracking-wider underline-offset-4 hover:text-gold hover:underline">
          {viewAllLabel}
        </Link>
      )}
    </div>
  );
}
