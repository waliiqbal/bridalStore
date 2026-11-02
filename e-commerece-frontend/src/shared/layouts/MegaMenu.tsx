import Image from "next/image";
import { focusStyle, imageSrc } from "@/shared/lib/image-focus";
import { LuChevronDown } from "react-icons/lu";
import type { PublicMenuItem } from "@/modules/shop/types/shop";
import { highlightClass, MenuLink } from "./MenuLink";

// The row of menu items under the logo. An item with things inside opens a wide panel when you
// hover it or tab to it: each thing inside is a picture tile with its name underneath, and group
// titles split the tiles into labelled sections. The pictures come from the categories themselves.
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
  const style = `flex items-center gap-1 px-3 py-3.5 font-condensed text-[17px] font-medium uppercase hover:text-gold group-focus-within:text-gold ${highlightClass(item.highlight)}`;
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

// Closed panels are display:none, so their pictures are not downloaded until someone opens the menu.
function Panel({ item }: { item: PublicMenuItem }) {
  const groups = item.children.filter((child) => child.type === "HEADING");
  const links = item.children.filter((child) => child.type !== "HEADING");

  return (
    <div className="absolute inset-x-0 top-full z-30 hidden max-h-[75vh] overflow-y-auto border-b border-line bg-white shadow-lg group-focus-within:block group-hover:block">
      <div className="mx-auto max-w-[1400px] space-y-8 px-8 py-8">
        {links.length > 0 && <Tiles items={links} />}
        {groups.map((group) => (
          <section key={group.id}>
            <p className="mb-4 font-condensed text-lg font-semibold uppercase tracking-wide">{group.label}</p>
            <Tiles items={group.children} />
          </section>
        ))}
      </div>
    </div>
  );
}

function Tiles({ items }: { items: PublicMenuItem[] }) {
  return (
    <ul className="grid grid-cols-4 gap-x-4 gap-y-6 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item) => (
        <li key={item.id}>
          <Tile item={item} />
        </li>
      ))}
    </ul>
  );
}

function Tile({ item }: { item: PublicMenuItem }) {
  const body = (
    <>
      <span className="relative block aspect-[3/4] overflow-hidden bg-cream">
        {item.imageUrl && (
          <Image
            src={imageSrc(item.imageUrl)}
            alt=""
            fill
            sizes="(min-width: 1280px) 200px, 180px"
            style={focusStyle(item.imageUrl)}
            className="object-cover transition duration-500 group-hover/tile:scale-105"
          />
        )}
      </span>
      <span className={`mt-2 block text-center text-[15px] group-hover/tile:text-gold ${highlightClass(item.highlight)}`}>
        {item.label}
      </span>
    </>
  );
  return item.href ? (
    <MenuLink href={item.href} className="group/tile block">
      {body}
    </MenuLink>
  ) : (
    <span className="block cursor-default">{body}</span>
  );
}
