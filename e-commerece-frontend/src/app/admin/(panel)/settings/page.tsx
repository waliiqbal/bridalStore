import type { Metadata } from "next";
import { SettingsEditor } from "@/modules/settings/components/SettingsEditor";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <SettingsEditor />;
}
