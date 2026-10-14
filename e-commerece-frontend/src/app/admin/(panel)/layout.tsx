import { redirect } from "next/navigation";
import { AdminUiProvider } from "@/shared/admin/AdminUiProvider";
import { AdminShell } from "@/shared/layouts/admin/AdminShell";
import { getAdminSession } from "@/modules/auth/api/admin-session";
import { ADMIN_LOGIN_PATH } from "@/modules/auth/constants";
import { LogoutButton } from "@/modules/auth/components/LogoutButton";

// Every page inside (panel) is protected: the backend must confirm the session.
// (proxy.ts only checks that a cookie exists; this checks that it is valid.)
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminSession();
  if (!admin) redirect(`${ADMIN_LOGIN_PATH}?expired=1`);

  return (
    <AdminUiProvider>
      <AdminShell user={{ name: admin.name, role: admin.role }} userActions={<LogoutButton />}>
        {children}
      </AdminShell>
    </AdminUiProvider>
  );
}
