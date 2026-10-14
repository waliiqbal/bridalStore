import { FaFacebookF, FaInstagram, FaTiktok, FaWhatsapp } from "react-icons/fa6";
import { LuMail, LuPhone } from "react-icons/lu";
import { brand } from "@/config/brand";
import { getMenu, getSettings } from "@/modules/shop/api/shop.api";
import type { PublicMenuItem } from "@/modules/shop/types/shop";
import { Logo } from "@/shared/components/Logo";
import { MenuLink } from "./MenuLink";
import { whatsappLink } from "./whatsapp";

// The bottom of every page: contact details and social links from Settings, and the link
// columns from the owner's Footer menu (each group title becomes a column).
export async function Footer() {
  const [settings, menu] = await Promise.all([
    getSettings().catch(() => null),
    getMenu("footer").catch(() => null),
  ]);
  const items = menu?.items ?? [];

  const columns = items.filter((item) => item.children.length > 0);
  const loose = items.filter((item) => item.children.length === 0 && item.href);
  const storeName = settings?.storeName ?? brand.name;
  const chat = whatsappLink(settings?.whatsappNumber);
  const socials = [
    { label: "Instagram", href: settings?.instagramUrl, icon: FaInstagram },
    { label: "Facebook", href: settings?.facebookUrl, icon: FaFacebookF },
    { label: "TikTok", href: settings?.tiktokUrl, icon: FaTiktok },
  ].filter((social): social is { label: string; href: string; icon: typeof FaInstagram } => !!social.href);

  return (
    <footer className="mt-auto border-t border-line bg-cream">
      <div className="mx-auto grid max-w-[1600px] gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(auto-fit,minmax(9rem,1fr))] lg:px-6">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted">{brand.tagline}</p>

          <ul className="mt-5 space-y-2 text-sm">
            {settings?.contactEmail && (
              <li>
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="flex items-center gap-2 hover:text-gold"
                >
                  <LuMail className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="break-all">{settings.contactEmail}</span>
                </a>
              </li>
            )}
            {settings?.contactPhone && (
              <li>
                <a
                  href={`tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`}
                  className="flex items-center gap-2 hover:text-gold"
                >
                  <LuPhone className="h-4 w-4 shrink-0" aria-hidden />
                  {settings.contactPhone}
                </a>
              </li>
            )}
            {chat && (
              <li>
                <a
                  href={chat}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-gold"
                >
                  <FaWhatsapp className="h-4 w-4 shrink-0" aria-hidden />
                  Chat on WhatsApp
                </a>
              </li>
            )}
          </ul>

          {socials.length > 0 && (
            <ul className="mt-5 flex gap-3">
              {socials.map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center border border-line bg-white hover:border-gold hover:text-gold"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {columns.map((column) => (
          <FooterColumn key={column.id} title={column.label} links={column.children} />
        ))}
        {loose.length > 0 && <FooterColumn title="More" links={loose} />}
      </div>

      <div className="border-t border-line px-4 py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} {storeName}. All rights reserved.
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: PublicMenuItem[] }) {
  return (
    <div>
      <h2 className="mb-4 text-sm font-medium uppercase tracking-widest">{title}</h2>
      <ul className="space-y-2.5 text-sm">
        {links
          .filter((link) => link.href)
          .map((link) => (
            <li key={link.id}>
              <MenuLink href={link.href!} className="hover:text-gold">
                {link.label}
              </MenuLink>
            </li>
          ))}
      </ul>
    </div>
  );
}
