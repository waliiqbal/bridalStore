import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa6";
import { brand } from "@/config/brand";
import { CurrencySwitcher } from "@/modules/currency/components/CurrencySwitcher";
import { getSelectedCurrency } from "@/modules/currency/server";
import { getMenu, getSettings } from "@/modules/shop/api/shop.api";
import { Logo } from "@/shared/components/Logo";
import { MegaMenu } from "./MegaMenu";
import { MobileMenu } from "./MobileMenu";
import { whatsappLink } from "./whatsapp";

// The top of every page: the owner's message, logo, menu, currency and WhatsApp.
// Everything comes from the admin (Settings and Menus). If the shop can't be reached, the
// header still shows the logo instead of breaking the page.
export async function Header() {
  const [settings, menu, selected] = await Promise.all([
    getSettings().catch(() => null),
    getMenu("main").catch(() => null),
    getSelectedCurrency(),
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
        <div className="mx-auto grid max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4 lg:px-6">
          <div className="flex items-center">
            <MobileMenu items={items} />
          </div>

          <Link href="/" aria-label={`${storeName}: home`}>
            <Logo />
          </Link>

          <div className="flex items-center justify-end gap-3 lg:gap-5">
            <CurrencySwitcher currencies={selected.currencies} current={selected.code} />
            {chat && (
              <a
                href={chat}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat with us on WhatsApp"
                className="hidden hover:text-gold sm:block"
              >
                <FaWhatsapp className="h-6 w-6" />
              </a>
            )}
          </div>
        </div>
        <MegaMenu items={items} />
      </div>
    </header>
  );
}
