"use client";

import { useState, type ReactNode } from "react";

// One top menu item with its picture panel. The panel opens by hover or focus (pure CSS), but the
// header stays on screen when a shopper goes to another page, so the panel would stay open under
// the mouse. Clicking a link inside closes it; it opens again after the mouse leaves and returns.
export function MenuItemShell({ top, panel }: { top: ReactNode; panel: ReactNode }) {
  const [closed, setClosed] = useState(false);

  return (
    <li
      className="group"
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a")) setClosed(true);
      }}
      onMouseLeave={() => setClosed(false)}
    >
      {top}
      {!closed && panel}
    </li>
  );
}
