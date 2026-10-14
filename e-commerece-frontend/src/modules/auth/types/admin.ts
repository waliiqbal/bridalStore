// Matches the backend's AdminProfile (GET /api/admin/auth/me)
export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: "OWNER" | "STAFF";
  lastLoginAt: string | null;
}
