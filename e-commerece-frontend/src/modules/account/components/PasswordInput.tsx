"use client";

import { useState, type InputHTMLAttributes } from "react";
import { LuEye, LuEyeOff } from "react-icons/lu";
import { Input } from "@/shared/admin/Form";

// A password box with an eye button to show what was typed (helpful on a phone).
export function PasswordInput({
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className={`pr-12 ${className}`} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-foreground"
      >
        {visible ? <LuEyeOff className="h-5 w-5" /> : <LuEye className="h-5 w-5" />}
      </button>
    </div>
  );
}
