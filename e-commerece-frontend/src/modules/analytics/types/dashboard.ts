import type { OrderStatus } from "@/modules/account/types/account";
import type { Money } from "@/shared/lib/money";

// Must match the backend's GET /api/admin/dashboard.

export interface SalesPeriod {
  orders: number;
  // Paid orders only, in AUD (refunded and cancelled orders are left out)
  sales: Money;
}

export interface DashboardData {
  today: SalesPeriod;
  week: SalesPeriod;
  month: SalesPeriod;
  toDo: { toSend: number; needsAttention: number; reviewsWaiting: number; newEnquiries: number };
  recentOrders: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    statusLabel: string;
    shipFullName: string;
    total: Money;
    at: string;
  }[];
  lowStock: {
    // "Running low" means this many or fewer left
    limit: number;
    total: number;
    items: {
      id: string;
      sku: string;
      size: string | null;
      colour: string | null;
      stock: number;
      product: { id: string; name: string; slug: string };
    }[];
  };
  topProducts: { id: string; name: string; slug: string; salesCount: number }[];
}
