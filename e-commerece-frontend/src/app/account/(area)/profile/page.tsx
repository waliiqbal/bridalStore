import type { Metadata } from "next";
import { PasswordForm, ProfileForm } from "@/modules/account/components/ProfileForms";
import { requireCustomer } from "@/modules/account/server";

export const metadata: Metadata = { title: "My details" };

export default async function ProfilePage() {
  const customer = await requireCustomer("/account/profile");
  return (
    <div className="space-y-6">
      <ProfileForm customer={customer} />
      <PasswordForm />
    </div>
  );
}
