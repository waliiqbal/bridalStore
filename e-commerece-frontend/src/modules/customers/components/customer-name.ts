import type { AdminCustomer } from "../types/customers";

// "Ayesha Khan", or the email when the customer never gave a name (guest checkout)
export const customerName = (c: Pick<AdminCustomer, "firstName" | "lastName" | "email">) =>
  [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email;
