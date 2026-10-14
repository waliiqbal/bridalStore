import { storefrontFetch } from "@/infrastructure/http/storefront-api";
import type { EnquiryOptions } from "../types/enquiries";

// Server-side only (the public /enquiry page). The choices rarely change, so keep them for an hour.
export const getEnquiryOptions = () =>
  storefrontFetch<EnquiryOptions>("/enquiries/options", { tags: ["enquiry-options"], revalidate: 3600 });
