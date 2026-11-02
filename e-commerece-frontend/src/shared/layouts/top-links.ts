// The small links on the left of the header (and at the bottom of the phone menu).
// They point at pages built in the admin under Pages (About us, Contact us, Shipping and delivery).
export const TOP_LINKS = [
  { label: "Home", href: "/" },
  { label: "About us", href: "/pages/about" },
  { label: "Contact us", href: "/pages/contact-us" },
  { label: "Shipping & delivery", href: "/pages/shipping-delivery" },
  // Opens the "Find your outfit" form; those enquiries reach the admin's Enquiries screen,
  // marked "Book an appointment" (source "appointment")
  { label: "Book an appointment", href: "/enquiry?source=appointment" },
] as const;
