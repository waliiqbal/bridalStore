// Matches the backend's admin settings response (GET /api/admin/settings).
export interface AdminSettings {
  id: number;
  storeName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  whatsappNumber: string | null;
  announcementBar: string | null;
  // A decimal, sent as text by the API ("10")
  gstRatePercent: string;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  metaPixelId: string | null;
  googleAnalyticsId: string | null;
  removeGstForExports: boolean;
  sendOrderEmails: boolean;
  sendShippingEmails: boolean;
  emailFooterNote: string | null;
  autoApproveReviews: boolean;
  updatedAt: string;
}

// Body for PATCH /api/admin/settings
export interface SettingsInput {
  storeName?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  whatsappNumber?: string | null;
  announcementBar?: string | null;
  gstRatePercent?: number;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
  metaPixelId?: string | null;
  googleAnalyticsId?: string | null;
  removeGstForExports?: boolean;
  sendOrderEmails?: boolean;
  sendShippingEmails?: boolean;
  emailFooterNote?: string | null;
  autoApproveReviews?: boolean;
}
