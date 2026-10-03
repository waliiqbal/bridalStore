import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa6";
import {
  LuChevronDown,
  LuGlobe,
  LuHeart,
  LuMapPin,
  LuSearch,
  LuShoppingBag,
  LuUser,
  LuVideo,
} from "react-icons/lu";
import { Logo } from "@/shared/components/Logo";
import { categoryNav, primaryNav } from "@/modules/products/data/nav";

const variantClass = {
  red: "rounded-sm bg-[#d92d27] px-2 py-1 text-white",
  dark: "rounded-sm bg-[#1f1f2e] px-2 py-1 text-white",
  gold: "text-gold",
} as const;

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full bg-white">
      <div className="flex items-center justify-center gap-2 bg-black px-4 py-2 text-xs text-white sm:text-sm">
        <LuVideo className="h-4 w-4 shrink-0" />
        <p className="truncate">Seamless Video Shopping Experience</p>
      </div>

      <div className="mx-auto grid max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 lg:px-6">
        <nav className="hidden min-w-0 items-center gap-3 text-sm xl:flex 2xl:gap-4">
          {primaryNav.map((item, i) => (
            <Link
              key={item}
              href="#"
              className={`uppercase ${
                i === 0 ? "bg-black px-2.5 py-1.5 text-white" : "hover:text-gold"
              }`}
            >
              {item}
            </Link>
          ))}
          <Link href="#" className="flex items-center gap-1.5 font-medium hover:text-gold">
            <LuMapPin className="h-5 w-5" /> Find Store
          </Link>
          <Link href="#" className="hidden items-center gap-1.5 hover:text-gold 2xl:flex">
            <LuGlobe className="h-5 w-5" /> NRI Shopping
          </Link>
        </nav>

        <Link href="/" aria-label="Home" className="col-start-2 xl:col-start-2">
          <Logo />
        </Link>

        <div className="col-start-3 flex min-w-0 items-center justify-end gap-3 lg:gap-4">
          <form className="hidden w-full max-w-[240px] overflow-hidden rounded-sm lg:flex">
            <input
              type="search"
              placeholder="Search for products"
              className="h-11 w-full min-w-0 bg-[#f1f1f1] px-4 text-sm outline-none placeholder:text-neutral-500"
            />
            <button
              type="submit"
              aria-label="Search"
              className="flex h-11 w-11 shrink-0 items-center justify-center bg-black text-white"
            >
              <LuSearch className="h-5 w-5" />
            </button>
          </form>

          <button className="hidden items-center gap-1 xl:flex" aria-label="Currency">
            <span className="h-2.5 w-6 bg-[#d92d27]" />
            <LuChevronDown className="h-3.5 w-3.5" />
          </button>
          <a href="#" aria-label="WhatsApp" className="hidden sm:block">
            <FaWhatsapp className="h-6 w-6" />
          </a>
          <Link href="/login" aria-label="Account">
            <LuUser className="h-6 w-6" />
          </Link>
          <Link href="/wishlist" aria-label="Wishlist" className="relative">
            <LuHeart className="h-6 w-6" />
            <span className="absolute -right-2 -top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#d99a6c] text-[10px] text-white">
              0
            </span>
          </Link>
          <Link href="/cart" aria-label="Bag">
            <LuShoppingBag className="h-6 w-6" />
          </Link>
        </div>
      </div>

      <nav className="border-y border-neutral-200 bg-white shadow-sm">
        <ul className="no-scrollbar mx-auto flex max-w-[1600px] items-center gap-5 overflow-x-auto px-4 py-2.5 text-[13px] lg:justify-between lg:px-6">
          {categoryNav.map((c) => (
            <li key={c.label} className="shrink-0">
              <Link
                href="#"
                className={`block whitespace-nowrap uppercase ${
                  c.variant ? variantClass[c.variant] : "hover:text-gold"
                }`}
              >
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
