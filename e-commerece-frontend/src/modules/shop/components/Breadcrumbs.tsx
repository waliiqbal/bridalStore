import Link from "next/link";
import { LuChevronRight } from "react-icons/lu";

export interface Crumb {
  name: string;
  // Missing on the page you are on
  href?: string;
}

export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="py-4 text-xs text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {trail.map((crumb, index) => (
          <li key={`${crumb.name}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && <LuChevronRight className="h-3 w-3" aria-hidden />}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-gold">
                {crumb.name}
              </Link>
            ) : (
              <span aria-current="page" className="text-foreground">
                {crumb.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
