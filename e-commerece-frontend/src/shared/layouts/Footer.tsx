import Image from "next/image";
import {
  FaCcAmex,
  FaCcApplePay,
  FaCcMastercard,
  FaCcPaypal,
  FaCcVisa,
  FaFacebookF,
  FaInstagram,
  FaPinterestP,
  FaTiktok,
  FaWhatsapp,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import { LuGlobe, LuHeartHandshake, LuLink, LuLock, LuMail, LuPhone } from "react-icons/lu";
import type { IconType } from "react-icons";
import { brand } from "@/config/brand";
import { resolvePromises } from "@/config/footer-defaults";
import { getMenu, getSettings } from "@/modules/shop/api/shop.api";
import type { PublicMenuItem } from "@/modules/shop/types/shop";
import { Logo } from "@/shared/components/Logo";
import { imageSrc } from "@/shared/lib/image-focus";
import { MenuLink } from "./MenuLink";

// The little picture beside each promise, by position
const PROMISE_ICONS: IconType[] = [LuGlobe, LuLock, LuHeartHandshake];

const PAYMENT_ICONS: Record<string, { icon: IconType; label: string }> = {
  visa: { icon: FaCcVisa, label: "Visa" },
  mastercard: { icon: FaCcMastercard, label: "Mastercard" },
  paypal: { icon: FaCcPaypal, label: "PayPal" },
  amex: { icon: FaCcAmex, label: "American Express" },
  applepay: { icon: FaCcApplePay, label: "Apple Pay" },
};

const SOCIAL_SITES: { test: RegExp; icon: IconType; label: string }[] = [
  { test: /instagram\.com/i, icon: FaInstagram, label: "Instagram" },
  { test: /(facebook\.com|fb\.com|fb\.me)/i, icon: FaFacebookF, label: "Facebook" },
  { test: /tiktok\.com/i, icon: FaTiktok, label: "TikTok" },
  { test: /(youtube\.com|youtu\.be)/i, icon: FaYoutube, label: "YouTube" },
  { test: /pinterest\./i, icon: FaPinterestP, label: "Pinterest" },
  { test: /(twitter\.com|x\.com)/i, icon: FaXTwitter, label: "X" },
];

const WHATSAPP_LINK = /(wa\.me|whatsapp\.com)/i;

const heading = "mb-6 font-condensed text-xl font-semibold uppercase tracking-[0.2em]";

type Block =
  | { kind: "text"; item: PublicMenuItem }
  | { kind: "button"; item: PublicMenuItem; href: string }
  | { kind: "contact"; item: PublicMenuItem; href: string }
  | { kind: "socials"; items: { item: PublicMenuItem; href: string }[] }
  | { kind: "links"; items: { item: PublicMenuItem; href: string }[] };

// Turns what the owner put inside a column into things to draw: words, a button, contact lines,
// a row of social icons, or a list of links. Neighbours of the same kind share one block.
function toBlocks(children: PublicMenuItem[]): Block[] {
  const blocks: Block[] = [];
  for (const item of children) {
    if (item.type === "TEXT") {
      blocks.push({ kind: "text", item });
      continue;
    }
    const href = item.href;
    if (!href) continue;
    if (item.highlight === "button") {
      blocks.push({ kind: "button", item, href });
    } else if (/^(mailto:|tel:)/i.test(href) || WHATSAPP_LINK.test(href)) {
      blocks.push({ kind: "contact", item, href });
    } else {
      const kind = SOCIAL_SITES.some((site) => site.test.test(href)) ? "socials" : "links";
      const last = blocks[blocks.length - 1];
      if (last && last.kind === kind) last.items.push({ item, href });
      else blocks.push({ kind, items: [{ item, href }] });
    }
  }
  return blocks;
}

function contactIcon(href: string): IconType {
  if (/^mailto:/i.test(href)) return LuMail;
  if (/^tel:/i.test(href)) return LuPhone;
  return FaWhatsapp;
}

// The bottom of every page. The columns are the owner's Footer menu (Admin → Menus): each group title
// is a column, and what is inside it is shown by kind. The promises above and the payment logos below
// come from Settings.
export async function Footer() {
  const [settings, footerMenu] = await Promise.all([
    getSettings().catch(() => null),
    getMenu("footer").catch(() => null),
  ]);
  const items = footerMenu?.items ?? [];

  const columns = items.filter((item) => item.type === "HEADING" && item.children.length > 0);
  // Links put straight into the menu, outside any column, go into one column without a title
  const loose = items.filter((item) => item.type !== "HEADING" && (item.href || item.type === "TEXT"));

  const storeName = settings?.storeName ?? brand.name;
  const promises = resolvePromises(settings?.footerPromises);
  const paymentIcons = (settings?.footerPaymentIcons ?? []).filter((name) => name in PAYMENT_ICONS);

  return (
    <footer className="mt-auto bg-cream print:hidden">
      {promises.length > 0 && (
        <div className="border-y border-line bg-white">
          <ul className="mx-auto grid max-w-[1600px] gap-6 px-4 py-7 sm:grid-cols-3 lg:px-6">
            {promises.map(({ title, text }, index) => {
              const Icon = PROMISE_ICONS[index] ?? LuGlobe;
              return (
                <li key={`${title}-${index}`} className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cream text-gold">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-condensed text-lg font-semibold uppercase tracking-wide">{title}</span>
                    {text && <span className="block text-sm text-muted">{text}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mx-auto grid max-w-[1600px] gap-x-10 gap-y-14 px-4 py-16 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] lg:gap-x-16 lg:px-6 lg:py-20">
        {columns.map((column) => (
          <Column key={column.id} title={column.label} imageUrl={column.imageUrl} blocks={toBlocks(column.children)} />
        ))}
        {loose.length > 0 && <Column title="" imageUrl={null} blocks={toBlocks(loose)} />}
        {columns.length === 0 && loose.length === 0 && (
          <div>
            <Logo size="lg" />
          </div>
        )}
      </div>

      <div className="bg-black text-white/80">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-3 px-4 py-5 text-sm sm:flex-row lg:px-6">
          <p>
            © {new Date().getFullYear()} {storeName}. All rights reserved.
          </p>
          {paymentIcons.length > 0 && (
            <ul className="flex items-center gap-3 text-3xl text-white/90" aria-label="Payment methods">
              {paymentIcons.map((name) => {
                const { icon: Icon, label } = PAYMENT_ICONS[name];
                return (
                  <li key={name}>
                    <Icon aria-label={label} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}

function Column({ title, imageUrl, blocks }: { title: string; imageUrl: string | null; blocks: Block[] }) {
  return (
    <div>
      {imageUrl ? (
        <>
          <h2 className="sr-only">{title}</h2>
          <Image
            src={imageSrc(imageUrl)}
            alt=""
            width={900}
            height={376}
            sizes="224px"
            className="mb-6 h-auto w-56"
          />
        </>
      ) : (
        title && <h2 className={heading}>{title}</h2>
      )}

      <div className="space-y-5 text-base">
        {blocks.map((block, index) => {
          switch (block.kind) {
            case "text":
              return (
                <p key={index} className="max-w-xs text-foreground/80">
                  {block.item.label}
                </p>
              );
            case "button":
              return (
                <div key={index}>
                  <MenuLink
                    href={block.href}
                    className="inline-block bg-black px-7 py-3.5 text-sm font-medium uppercase tracking-wider text-white transition hover:bg-gold"
                  >
                    {block.item.label}
                  </MenuLink>
                </div>
              );
            case "contact": {
              const Icon = contactIcon(block.href);
              const inner = (
                <>
                  <Icon className="h-5 w-5 shrink-0" aria-hidden />
                  <span className="break-all">{block.item.label}</span>
                </>
              );
              return (
                <div key={index}>
                  {/^(mailto:|tel:)/i.test(block.href) ? (
                    <a href={block.href} className="flex items-center gap-3 hover:text-gold">
                      {inner}
                    </a>
                  ) : (
                    <MenuLink href={block.href} className="flex items-center gap-3 hover:text-gold">
                      {inner}
                    </MenuLink>
                  )}
                </div>
              );
            }
            case "socials":
              return (
                <ul key={index} className="flex flex-wrap gap-3">
                  {block.items.map(({ item, href }) => {
                    const Icon = SOCIAL_SITES.find((site) => site.test.test(href))?.icon ?? LuLink;
                    return (
                      <li key={item.id}>
                        <MenuLink
                          href={href}
                          aria-label={item.label}
                          className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white transition hover:border-gold hover:bg-gold hover:text-white"
                        >
                          <Icon className="h-[18px] w-[18px]" />
                        </MenuLink>
                      </li>
                    );
                  })}
                </ul>
              );
            case "links":
              return (
                <ul key={index} className="space-y-3.5">
                  {block.items.map(({ item, href }) => (
                    <li key={item.id}>
                      <MenuLink href={href} className="text-foreground/80 transition hover:text-gold">
                        {item.label}
                      </MenuLink>
                    </li>
                  ))}
                </ul>
              );
          }
        })}
      </div>
    </div>
  );
}
