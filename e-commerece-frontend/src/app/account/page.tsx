import { redirect } from "next/navigation";
import { ACCOUNT_HOME_PATH } from "@/modules/account/constants";

export default function AccountPage() {
  redirect(ACCOUNT_HOME_PATH);
}
