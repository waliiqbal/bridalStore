import type { Metadata } from "next";
import { AccountNav } from "@/modules/account/components/AccountNav";
import { SessionHint } from "@/modules/account/components/SessionHint";
import { requireCustomer } from "@/modules/account/server";

// Everything under /account except the emailed password links needs a signed-in shopper.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AccountAreaLayout({ children }: { children: React.ReactNode }) {
  const customer = await requireCustomer("/account/orders");
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ");

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-20 pt-8 lg:px-6">
      <SessionHint />
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-bold sm:text-4xl">My account</h1>
        <p className="mt-1 text-sm text-muted">
          {name ? `${name} · ` : ""}
          {customer.email}
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-[13rem_1fr] md:gap-10">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
