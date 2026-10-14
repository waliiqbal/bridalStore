"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuMenu, LuX } from "react-icons/lu";
import { LogoMark } from "@/shared/components/Logo";
import { brand } from "@/config/brand";
import { adminNav } from "./admin-nav";

interface AdminShellProps {
  user: { name: string; role: string };
  // Sign-out button etc., passed in so this layout stays presentation-only
  userActions: ReactNode;
  children: ReactNode;
}

export function AdminShell({ user, userActions, children }: AdminShellProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const sidebar = (
    <nav aria-label="Admin menu" className="flex h-full flex-col overflow-y-auto px-4 py-5">
      <Link
        href="/admin/dashboard"
        onClick={() => setOpen(false)}
        className="mb-6 flex items-center gap-3 px-2"
      >
        <LogoMark className="h-8 w-10 text-gold" />
        <span className="leading-none">
          <span className="block font-serif text-lg font-bold tracking-[0.25em]">{brand.logoName}</span>
          <span className="mt-1 block text-[10px] tracking-[0.3em] text-muted">ADMIN</span>
        </span>
      </Link>

      <div className="space-y-6">
        {adminNav.map((group, i) => (
          <div key={group.title ?? i}>
            {group.title && (
              <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-widest text-muted">
                {group.title}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map(({ label, href, icon: Icon, ready }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                const base = "flex h-11 items-center gap-3 rounded-sm px-3 text-[15px]";
                if (!ready) {
                  return (
                    <li key={href}>
                      <span
                        aria-disabled="true"
                        className={`${base} cursor-not-allowed text-muted/60`}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="flex-1">{label}</span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] uppercase tracking-wide">
                          Soon
                        </span>
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`${base} ${
                        active ? "bg-black text-white" : "hover:bg-white hover:text-gold"
                      }`}
                    >
                      <Icon className={`h-5 w-5 shrink-0 ${active ? "text-gold" : ""}`} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-white">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-line bg-cream lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-cream shadow-xl">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center"
            >
              <LuX className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-line bg-white px-4 lg:px-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-sm border border-line lg:hidden"
          >
            <LuMenu className="h-5 w-5" />
          </button>
          <p className="hidden text-sm text-muted lg:block">{brand.name}</p>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="max-w-[10rem] truncate text-sm font-medium">{user.name}</p>
              <p className="text-xs capitalize text-muted">{user.role.toLowerCase()}</p>
            </div>
            {userActions}
          </div>
        </header>

        <main className="flex-1 bg-white px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
