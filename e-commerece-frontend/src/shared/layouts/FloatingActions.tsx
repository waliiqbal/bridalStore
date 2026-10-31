import { FaWhatsapp } from "react-icons/fa6";
import { getSettings } from "@/modules/shop/api/shop.api";
import { whatsappLink } from "./whatsapp";

// The round WhatsApp chat button in the corner. Shown only when the owner has entered a number.
export async function FloatingActions() {
  const settings = await getSettings().catch(() => null);
  const chat = whatsappLink(settings?.whatsappNumber);
  if (!chat) return null;

  return (
    <a
      href={`${chat}?text=${encodeURIComponent("Hello! I have a question.")}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-4 z-30 flex print:hidden h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg transition hover:scale-105"
    >
      <FaWhatsapp className="h-8 w-8" />
    </a>
  );
}
