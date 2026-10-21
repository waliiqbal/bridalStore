import type { ReactNode } from "react";

// The red message box under a form ("Wrong password", "Please check these..."). One look
// everywhere; screen readers announce it as soon as it appears.
export function FormError({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p
      role="alert"
      className={`rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 ${className}`.trim()}
    >
      {children}
    </p>
  );
}
