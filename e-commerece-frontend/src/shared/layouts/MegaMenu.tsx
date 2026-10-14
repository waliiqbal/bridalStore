import Image from "next/image";
import { LuChevronDown } from "react-icons/lu";
import type { PublicMenuItem } from "@/modules/shop/types/shop";
import { highlightClass, MenuLink } from "./MenuLink";

// The row of menu items under the logo. An item with things inside opens a wide panel when you
// hover it or tab to it: group titles become columns, and an item's picture becomes a tile.
export function MegaMenu({ items }: { items: PublicMenuItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Main" className="hidden border-t border-line lg:block">
      <ul className="mx-auto flex max-w-[1600px] items-center justify-center gap-1 px-6">
        {items.map((item) => (
          <li key={item.id} className="group">
            <TopItem item={item} />
            {item.children.length > 0 && <Panel item={item} />}
          </li>
        ))}
      </ul>
    </nav>
  );
}

function TopItem({ item }: { item: PublicMenuItem }) {
  const style = `flex items-center gap-1 px-3 py-3.5 text-sm uppercase tracking-wide hover:text-gold group-focus-within:text-gold ${highlightClass(item.highlight)}`;
  const arrow = item.children.length > 0 && <LuChevronDown className="h-3.5 w-3.5" aria-hidden />;
  return item.href ? (
    <MenuLink href={item.href} className={style}>
      {item.label}
      {arrow}
    </MenuLink>
  ) : (
    <span tabIndex={0} className={`${style} cursor-default`}>
      {item.label}
      {arrow}
    </span>
  );
}

function Panel({ item }: { item: PublicMenuItem }) {
  const groups = item.children.filter((child) => child.type === "HEADING");
  const links = item.children.filter((child) => child.type !== "HEADING");

  return (
    <div className="invisible absolute inset-x-0 top-full z-30 border-b border-line bg-white opacity-0 shadow-lg transition duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
      <div className="mx-auto flex max-w-[1200px] justify-center gap-16 px-8 py-8">
        {links.length > 0 && (
          <Column title={item.label} titleHref={item.href}>
            {links.map((link) => (
              <LinkRow key={link.id} item={link} />
            ))}
          </Column>
        )}
        {groups.map((group) => (
          <Column key={group.id} title={group.label}>
            {group.children.map((link) => (
              <LinkRow key={link.id} item={link} />
            ))}
          </Column>
        ))}

        {item.imageUrl && item.href && (
          <MenuLink
            href={item.href}
            className="group/tile relative hidden aspect-[3/4] w-52 shrink-0 overflow-hidden bg-cream xl:block"
          >
            <Image
              src={item.imageUrl}
              alt=""
              fill
              sizes="208px"
              className="object-cover transition duration-500 group-hover/tile:scale-105"
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3 pt-10 font-serif text-lg text-white">
              Shop {item.label}
            </span>
          </MenuLink>
        )}
      </div>
    </div>
  );
}

function Column({
  title,
  titleHref,
  children,
}: {
  title: string;
  titleHref?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-44">
      <p className="mb-3 text-xs font-medium uppercase tracking-widest text-gold">
        {titleHref ? (
          <MenuLink href={titleHref} className="hover:underline">
            {title}
          </MenuLink>
        ) : (
          title
        )}
      </p>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function LinkRow({ item }: { item: PublicMenuItem }) {
  return (
    <li>
      {item.href ? (
        <MenuLink href={item.href} className={`text-sm hover:text-gold ${highlightClass(item.highlight)}`}>
          {item.label}
        </MenuLink>
      ) : (
        <span className="text-sm text-muted">{item.label}</span>
      )}
    </li>
  );
}
