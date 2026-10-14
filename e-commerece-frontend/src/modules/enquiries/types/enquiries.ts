// Matches the backend's enquiry responses exactly (GET/POST /api/enquiries, /api/admin/enquiries).

export interface EnquiryChoice {
  code: string;
  label: string;
}

// GET /api/enquiries/options: what the form offers
export interface EnquiryOptions {
  budgets: EnquiryChoice[];
  outfitTypes: EnquiryChoice[];
}

// What the customer sends
export interface EnquiryInput {
  name: string;
  phone: string;
  email?: string;
  budget?: string;
  // YYYY-MM-DD
  eventDate?: string;
  outfitTypes?: string[];
  message?: string;
  // From the QR link (?source=window)
  source?: string;
  // Hidden robot trap: always empty from a real person
  website?: string;
}

export type EnquiryStatus = "NEW" | "CONTACTED" | "BOOKED" | "CLOSED";

export interface AdminEnquiry {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  budget: string | null;
  // ISO date-time at midnight UTC; show only the date
  eventDate: string | null;
  outfitTypes: string[];
  message: string | null;
  source: string;
  status: EnquiryStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export type EnquiryCounts = Record<EnquiryStatus | "ALL", number>;

export interface EnquiryListQuery {
  status?: EnquiryStatus;
  q?: string;
  sort?: "newest" | "event";
  page?: number;
  pageSize?: number;
}
