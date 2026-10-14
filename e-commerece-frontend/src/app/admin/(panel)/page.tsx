import { redirect } from "next/navigation";
import { ADMIN_HOME_PATH } from "@/modules/auth/constants";

export default function AdminIndexPage() {
  redirect(ADMIN_HOME_PATH);
}
