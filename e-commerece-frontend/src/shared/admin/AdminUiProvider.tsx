"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { LuCircleAlert, LuCircleCheck } from "react-icons/lu";
import { ApiError } from "@/infrastructure/http/api-client";
import { ADMIN_LOGIN_PATH } from "@/modules/auth/constants";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface AdminUi {
  success: (message: string) => void;
  // Shows an error message; an expired session sends you to the sign-in page instead
  error: (error: unknown) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

const AdminUiContext = createContext<AdminUi | null>(null);

export function useAdminUi(): AdminUi {
  const ui = useContext(AdminUiContext);
  if (!ui) throw new Error("useAdminUi must be used inside <AdminUiProvider>");
  return ui;
}

export function AdminUiProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<{
    options: ConfirmOptions;
    resolve: (answer: boolean) => void;
  } | null>(null);
  const nextId = useRef(0);

  const push = useCallback((type: Toast["type"], message: string) => {
    const id = ++nextId.current;
    setToasts((list) => [...list, { id, type, message }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), type === "error" ? 8000 : 4000);
  }, []);

  const ui = useMemo<AdminUi>(
    () => ({
      success: (message) => push("success", message),
      error: (error) => {
        if (error instanceof ApiError && error.status === 401) {
          router.replace(`${ADMIN_LOGIN_PATH}?expired=1`);
          return;
        }
        push("error", error instanceof Error ? error.message : "Something went wrong. Please try again.");
      },
      confirm: (options) =>
        new Promise<boolean>((resolve) => setPending({ options, resolve })),
    }),
    [push, router],
  );

  function answer(value: boolean) {
    pending?.resolve(value);
    setPending(null);
  }

  return (
    <AdminUiContext.Provider value={ui}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex max-w-md items-start gap-2 rounded-sm px-4 py-3 text-sm text-white shadow-lg ${
              toast.type === "success" ? "bg-emerald-700" : "bg-red-700"
            }`}
          >
            {toast.type === "success" ? (
              <LuCircleCheck className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      <Modal
        open={pending !== null}
        title={pending?.options.title ?? ""}
        size="sm"
        onClose={() => answer(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => answer(false)}>
              Cancel
            </Button>
            <Button variant={pending?.options.danger ? "danger" : "primary"} onClick={() => answer(true)}>
              {pending?.options.confirmLabel ?? "Confirm"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{pending?.options.message}</p>
      </Modal>
    </AdminUiContext.Provider>
  );
}
