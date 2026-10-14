// Matches the backend's admin redirect responses exactly.
export interface AdminRedirect {
  id: string;
  fromPath: string;
  toPath: string;
  // 301 = permanent
  statusCode: number;
  createdAt: string;
}

export interface RedirectListQuery {
  q?: string;
  page?: number;
  pageSize?: number;
}
