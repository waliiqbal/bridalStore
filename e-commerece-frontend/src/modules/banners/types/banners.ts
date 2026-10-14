// These match the backend's admin banner responses exactly.
export interface AdminBanner {
  id: string;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  buttonText: string | null;
  // Where it appears on the website, e.g. "home_hero"
  placement: string;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BannerInput {
  title?: string | null;
  subtitle?: string | null;
  imageUrl?: string;
  mobileImageUrl?: string | null;
  linkUrl?: string | null;
  buttonText?: string | null;
  placement?: string;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}
