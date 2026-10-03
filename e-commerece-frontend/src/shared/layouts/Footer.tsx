import {
  FaCcAmex,
  FaCcDinersClub,
  FaCcMastercard,
  FaCcPaypal,
  FaCcVisa,
  FaFacebookF,
  FaInstagram,
  FaPinterest,
  FaWhatsapp,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import { LuPackage, LuRotateCcw, LuRuler, LuSmile } from "react-icons/lu";
import { brand } from "@/config/brand";
import {
  footerColumns,
  footerLinkGroups,
  shipCountries,
} from "@/modules/products/data/nav";
import { FloatingActions } from "./FloatingActions";

const payments = [FaCcPaypal, FaCcMastercard, FaCcVisa, FaCcAmex, FaCcDinersClub];
const socials = [FaInstagram, FaFacebookF, FaWhatsapp, FaYoutube, FaPinterest, FaXTwitter];

const perks = [
  { icon: LuSmile, lines: ["24x7", "Customer Support"] },
  { icon: LuPackage, lines: ["Free Shipping*"] },
  { icon: LuRotateCcw, lines: ["Easy Returns*"] },
  { icon: LuRuler, lines: ["Custom", "Fitting"] },
];

export function Footer() {
  return (
    <footer className="mt-14 bg-[#f7f7f7] text-neutral-800">
      <div className="mx-auto max-w-[1900px] px-4 lg:px-10">
        <div className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-5">
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-sm font-medium uppercase">{col.title}</h4>
              <ul className="space-y-2 text-sm">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="hover:text-gold">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="mb-4 text-sm font-medium uppercase">Safe &amp; Secure Payment</h4>
            <div className="flex gap-1.5 text-3xl text-neutral-800">
              {payments.map((Icon, i) => (
                <Icon key={i} />
              ))}
            </div>

            <h4 className="mb-3 mt-8 text-sm font-medium uppercase">Follow Us</h4>
            <div className="flex gap-4 text-xl">
              {socials.map((Icon, i) => (
                <a key={i} href="#" aria-label="Social link">
                  <Icon />
                </a>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="border-r border-neutral-300 pr-4">
                <h4 className="mb-3 text-sm font-medium uppercase">Get in touch</h4>
                <p className="text-sm">{brand.phone}</p>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-medium uppercase">Email us on</h4>
                <p className="break-all text-sm">{brand.email}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t border-neutral-200 py-6">
          {footerLinkGroups.map((g) => (
            <div key={g.title}>
              <h5 className="mb-1 text-sm font-medium uppercase">{g.title}</h5>
              <ul className="flex flex-wrap text-[13px]">
                {g.links.map((l) => (
                  <li
                    key={l}
                    className="border-l border-neutral-300 px-2.5 first:border-l-0 first:pl-0"
                  >
                    <a href="#" className="hover:text-gold">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 py-6 lg:grid-cols-4">
          {perks.map(({ icon: Icon, lines }) => (
            <div key={lines.join()} className="flex items-center gap-4">
              <Icon className="h-7 w-7 shrink-0 stroke-1" />
              <p className="text-base leading-tight">
                {lines.map((line) => (
                  <span key={line} className="block">{line}</span>
                ))}
              </p>
            </div>
          ))}
        </div>

        <p className="pb-6 text-sm">
          <span className="font-medium">We Ship Across the World</span>
          <span className="ml-3 text-neutral-600">{shipCountries.join(", ")}</span>
        </p>
      </div>

      <div className="border-t border-neutral-200 py-4 text-center text-sm text-neutral-500">
        © {new Date().getFullYear()} {brand.name}. All rights reserved.
      </div>

      <FloatingActions />
    </footer>
  );
}
