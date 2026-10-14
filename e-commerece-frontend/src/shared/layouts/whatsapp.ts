// A WhatsApp chat link from the number the owner typed in Settings (e.g. "+61 491 570 006").
export function whatsappLink(number: string | null | undefined): string | null {
  const digits = (number ?? "").replace(/\D/g, "");
  return digits.length >= 6 ? `https://wa.me/${digits}` : null;
}
