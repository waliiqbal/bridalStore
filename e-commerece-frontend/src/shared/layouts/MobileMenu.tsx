"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LuChevronDown, LuMenu, LuX } from "react-icons/lu";
import type { PublicMenuItem } from "@/modules/shop/types/shop";
import { Logo } from "@/shared/components/Logo";
import { highlightClass, MenuLink } from "./MenuLink";

// The menu on phones: a button that opens a slide-in panel, with items that fold open.
export function MobileMenu({ items, footer }: { items: PublicMenuItem[]; footer?: ReactNode }) {
  const [open, setOpen] = useState(false);

  // Close when the visitor goes to another page (links in `footer` don't close it themselves)
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  // Keep the page behind the panel from scrolling
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex h-10 w-10 items-center justify-center lg:hidden"
      >
        <LuMenu className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-black/50"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <Logo size="sm" />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="p-2">
                <LuX className="h-5 w-5" />
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto py-2">
              {items.map((item) => (
                <Row key={item.id} item={item} depth={0} close={() => setOpen(false)} />
              ))}
            </ul>
            {footer && <div className="border-t border-line px-4 py-4">{footer}</div>}
          </div>
        </div>
      )}
    </>
  );
}

function Row({ item, depth, close }: { item: PublicMenuItem; depth: number; close: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = item.children.length > 0;
  const indent = { paddingLeft: `${1 + depth * 1.1}rem` };
  const text = `text-[15px] ${depth === 0 ? "uppercase tracking-wide" : ""} ${highlightClass(item.highlight)}`;

  return (
    <li>
      <div className="flex items-center border-b border-line/60">
        {item.href ? (
          <MenuLink href={item.href} onClick={close} className={`flex-1 py-3.5 pr-2 ${text}`}>
            <span style={indent}>{item.label}</span>
          </MenuLink>
        ) : (
          <span className={`flex-1 py-3.5 pr-2 font-medium ${text}`} style={indent}>
            {item.label}
          </span>
        )}
        {hasChildren && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Hide" : "Show"} ${item.label}`}
            className="flex h-12 w-12 shrink-0 items-center justify-center"
          >
            <LuChevronDown className={`h-5 w-5 transition ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <ul className="bg-cream/50">
          {item.children.map((child) => (
            <Row key={child.id} item={child} depth={depth + 1} close={close} />
          ))}
        </ul>
      )}
    </li>
  );
}
