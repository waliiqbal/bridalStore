import type { ReactNode } from "react";

// The centred box around the sign-in, register and password pages.
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 pb-20 pt-10 sm:pt-16">
      <h1 className="text-center font-serif text-3xl font-bold sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-3 text-center text-muted">{subtitle}</p>}
      <div className="mt-8 rounded-sm border border-line bg-white p-5 sm:p-7">{children}</div>
      {footer && <p className="mt-6 text-center text-sm text-muted">{footer}</p>}
    </div>
  );
}
