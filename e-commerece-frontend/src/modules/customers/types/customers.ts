import type { OrderStatus } from "@/modules/account/types/account";
import type { Money } from "@/shared/lib/money";

// Must match the backend's admin customer responses (modules/customers).

export interface AdminCustomer {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  isActive: boolean;
  marketingOptIn: boolean;
  createdAt: string;
  // false = only ever checked out as a guest (no password)
  hasAccount: boolean;
  orderCount: number;
  // What they have paid in total (AUD, before refunds and cancelled orders are left out)
  totalSpent: Money;
}

export interface AdminCustomerDetail extends AdminCustomer {
  updatedAt: string;
  addresses: {
    id: string;
    fullName: string;
    phone: string | null;
    line1: string;
    line2: string | null;
    city: string;
    state: string | null;
    postcode: string;
    countryCode: string;
    isDefault: boolean;
  }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    statusLabel: string;
    total: Money;
    totalAud: Money;
    createdAt: string;
  }[];
}
