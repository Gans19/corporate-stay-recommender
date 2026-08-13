import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { MOTION } from "../motion";

type ToastType = "success" | "info" | "warning" | "error";
interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

// Minimalist Monochrome: no colored status icons. Type is conveyed by a
// plain-text label prefix instead of color/iconography.
const LABEL: Record<ToastType, string> = {
  success: "Done",
  info: "Note",
  warning: "Warning",
  error: "Error",
};

const ToastCtx = createContext<(type: ToastType, message: string) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const notify = useCallback(
    (type: ToastType, message: string) => {
      const id = nextId.current++;
      setToasts((t) => [...t, { id, type, message }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss]
  );

  return (
    <ToastCtx.Provider value={notify}>
      {children}
      <div className="toast-region" role="region" aria-live="polite" aria-label="Notifications">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className={`toast toast-${t.type}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: MOTION.instant, ease: MOTION.ease }}
              layout
            >
              <span className="toast-icon">{LABEL[t.type]}</span>
              <span className="toast-msg">{t.message}</span>
              <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                <X size={14} strokeWidth={2} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
