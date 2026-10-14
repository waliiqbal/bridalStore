import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { LuLoaderCircle } from "react-icons/lu";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-black text-white hover:bg-gold",
  secondary: "border border-line bg-white hover:border-gold hover:text-gold",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "hover:bg-cream",
};

export function buttonClass(variant: ButtonVariant = "primary", size: "md" | "sm" = "md") {
  const sizing = size === "sm" ? "h-9 px-3 text-sm" : "h-11 px-5 text-sm";
  return `inline-flex ${sizing} shrink-0 items-center justify-center gap-2 rounded-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "md" | "sm";
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${buttonClass(variant, size)} ${className}`}
      {...props}
    >
      {loading && <LuLoaderCircle className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: ButtonVariant;
  size?: "md" | "sm";
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${buttonClass(variant, size)} ${className}`} {...props}>
      {children}
    </Link>
  );
}
