"use client";

import { Button } from "@/shared/admin/Button";
import { useAdminQuery } from "@/shared/admin/hooks";
import { Notice, PageHeader, Spinner } from "@/shared/admin/Layout";
import { getSettings } from "../api/settings.api";
import { SettingsForm } from "./SettingsForm";

export function SettingsEditor() {
  const settings = useAdminQuery(() => getSettings(), []);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your store's contact details, top message, WhatsApp, social links and tracking. Changes appear on your website within a minute."
      />

      {settings.error && (
        <div className="space-y-3">
          <Notice tone="error">{settings.error}</Notice>
          <Button variant="secondary" onClick={settings.reload}>
            Try again
          </Button>
        </div>
      )}
      {!settings.error && !settings.data && <Spinner />}
      {!settings.error && settings.data && (
        // A new key after each save loads the saved values into the form
        <SettingsForm key={settings.data.updatedAt} settings={settings.data} onSaved={settings.reload} />
      )}
    </>
  );
}
