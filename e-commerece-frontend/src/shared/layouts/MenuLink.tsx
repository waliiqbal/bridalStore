import Link from "next/link";
import type { ReactNode } from "react";

// A link from the owner's menus: pages on this site use <Link>, other websites open in a new tab.
export function MenuLink({
  href,
  className,
  children,
  onClick,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className} onClick={onClick} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

// The little colour hint the owner can give a menu item (e.g. a red "Sale")
export function highlightClass(highlight: string | null): string {
  switch (highlight) {
    case "red":
      return "font-medium text-[#d92d27]";
    case "gold":
      return "font-medium text-gold";
    case "dark":
      return "bg-[#1f1f2e] px-2 py-1 text-white";
    default:
      return "";
  }
}
