import type { EnquiryOptions } from "../types/enquiries";

// Used only when the shop's server can't be reached, so the form still shows its choices.
// Keep in sync with the backend's enquiry-options.ts (the server is the source of truth and
// rejects any code it doesn't know).
export const DEFAULT_ENQUIRY_OPTIONS: EnquiryOptions = {
  budgets: [
    { code: "UNDER_1000", label: "Under $1,000" },
    { code: "1000_2000", label: "$1,000 – $2,000" },
    { code: "2000_3500", label: "$2,000 – $3,500" },
    { code: "3500_5000", label: "$3,500 – $5,000" },
    { code: "OVER_5000", label: "Over $5,000" },
    { code: "NOT_SURE", label: "Not sure yet" },
  ],
  outfitTypes: [
    { code: "LEHENGA", label: "Bridal lehenga" },
    { code: "GHARARA", label: "Gharara" },
    { code: "SHARARA", label: "Sharara" },
    { code: "MAXI", label: "Maxi / gown" },
    { code: "ANARKALI", label: "Anarkali / frock" },
    { code: "SAREE", label: "Saree" },
    { code: "KURTA_SET", label: "Kurta set" },
    { code: "MENSWEAR", label: "Menswear (groom)" },
    { code: "NOT_SURE", label: "Not sure yet" },
  ],
};
