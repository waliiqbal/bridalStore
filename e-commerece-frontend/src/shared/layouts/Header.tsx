import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa6";
import { LuHeart } from "react-icons/lu";
import { brand } from "@/config/brand";
import { CurrencySwitcher } from "@/modules/currency/components/CurrencySwitcher";
import { resolveCurrency } from "@/modules/currency/server";
import { getMenu, getSettings } from "@/modules/shop/api/shop.api";
import { Logo } from "@/shared/components/Logo";
import { AccountLink } from "./AccountLink";
import { CartButton } from "./CartButton";
import { HeaderSearch } from "./HeaderSearch";
import { MegaMenu } from "./MegaMenu";
import { MobileAccountLink } from "./MobileAccountLink";
import { MobileMenu } from "./MobileMenu";
import { SearchButton } from "./SearchButton";
import { WishlistLink } from "./WishlistLink";
import { whatsappLink } from "./whatsapp";

// The top of every page: the owner's message, logo, menu, currency and WhatsApp.
// Everything comes from the admin (Settings and Menus). If the shop can't be reached, the
// header still shows the logo instead of breaking the page.
export async function Header({ currency }: { currency: string }) {
  const [settings, menu, selected] = await Promise.all([
    getSettings().catch(() => null),
    getMenu("main").catch(() => null),
    resolveCurrency(currency),
  ]);
  const items = menu?.items ?? [];
  const storeName = settings?.storeName ?? brand.name;
  const chat = whatsappLink(settings?.whatsappNumber);

  return (
    <header className="sticky top-0 z-40 w-full bg-white">
      {settings?.announcementBar && (
        <p className="bg-black px-4 py-2 text-center text-xs text-white sm:text-sm">
          {settings.announcementBar}
        </p>
      )}

      <div className="relative border-b border-line">
        {/* Logo always centred. Left: menu button (phones). Right: search bar (wide screens) and icons */}
        <div className="mx-auto grid max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4 lg:gap-8 lg:px-6 lg:py-4">
          <div className="flex items-center">
            <MobileMenu
              items={items}
              footer={
                <div className="space-y-4">
                  <MobileAccountLink />
                  <Link href="/wishlist" className="flex items-center gap-2 text-[15px] hover:text-gold">
                    <LuHeart className="h-5 w-5" />
                    My wishlist
                  </Link>
                  {selected.currencies.length > 1 && (
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted">Show prices in</span>
                      <CurrencySwitcher currencies={selected.currencies} current={selected.code} />
                    </div>
                  )}
                </div>
              }
            />
          </div>

          {/* The name matches the words in the logo, which screen-reader software needs */}
          <Link href="/" aria-label={storeName} className="shrink-0">
            <Logo preload />
          </Link>

          <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-2 xl:gap-3">
            {/* The full search bar needs a wide screen; smaller screens get the magnifying glass */}
            <div className="hidden min-w-0 flex-1 justify-end xl:flex">
              <div className="w-full max-w-72">
                <HeaderSearch />
              </div>
            </div>
            {/* On phones the currency is in the slide-out menu, to leave room for the icons */}
            <div className="hidden sm:block">
              <CurrencySwitcher currencies={selected.currencies} current={selected.code} compact />
            </div>
            <div className="xl:hidden">
              <SearchButton />
            </div>
            {chat && (
              <a
                href={chat}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat with us on WhatsApp"
                className="hidden h-10 w-10 items-center justify-center text-[#25D366] transition hover:scale-110 sm:flex"
              >
                <FaWhatsapp className="h-7 w-7" />
              </a>
            )}
            <AccountLink />
            <WishlistLink />
            <CartButton />
          </div>
        </div>
        <MegaMenu items={items} />
      </div>
    </header>
  );
}
