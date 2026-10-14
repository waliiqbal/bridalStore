"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LuLogOut } from "react-icons/lu";
import { logoutAdmin } from "../api/admin-auth.api";
import { ADMIN_LOGIN_PATH } from "../constants";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      await logoutAdmin();
    } finally {
      // Even if the call fails, leave: the login page re-checks the session
      router.replace(ADMIN_LOGIN_PATH);
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex h-10 items-center gap-2 rounded-sm border border-line px-3 text-sm hover:border-gold hover:text-gold disabled:opacity-60"
    >
      <LuLogOut className="h-4 w-4" />
      <span className="hidden sm:inline">{busy ? "Signing out…" : "Sign out"}</span>
    </button>
  );
}
