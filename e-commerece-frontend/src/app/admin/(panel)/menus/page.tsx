import type { Metadata } from "next";
import { MenusManager } from "@/modules/menus/components/MenusManager";

export const metadata: Metadata = { title: "Menus" };

export default function MenusPage() {
  return <MenusManager />;
}
