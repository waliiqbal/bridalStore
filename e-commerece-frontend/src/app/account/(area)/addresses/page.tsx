import type { Metadata } from "next";
import { AddressManager } from "@/modules/account/components/AddressManager";
import { accountGet } from "@/modules/account/server";
import type { Address } from "@/modules/account/types/account";

export const metadata: Metadata = { title: "My addresses" };

export default async function AddressesPage() {
  const addresses = await accountGet<Address[]>("/account/addresses", "/account/addresses");
  return <AddressManager addresses={addresses} />;
}
