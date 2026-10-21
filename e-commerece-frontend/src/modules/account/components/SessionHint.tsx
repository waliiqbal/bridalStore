"use client";

import { useEffect } from "react";
import { sessionHint } from "../hint";
import { useShopper } from "./ShopperProvider";

// Placed on pages the server has already confirmed are signed in: makes sure the browser's note
// (see hint.ts) is there, so the header shows the signed-in icon and the saved hearts.
export function SessionHint() {
  const { customer, refresh } = useShopper();
  useEffect(() => {
    if (customer) return;
    sessionHint.set();
    void refresh();
  }, [customer, refresh]);
  return null;
}
