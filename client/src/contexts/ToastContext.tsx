import { createContext, useContext, useMemo, useState } from "react";
import { Toast } from "@/components/ui/Primitives";

interface ToastContextValue { showToast: (message: string) => void; }
const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const value = useMemo(() => ({ showToast: (next: string) => { setMessage(next); window.setTimeout(() => setMessage(null), 3200); } }), []);
  return <ToastContext.Provider value={value}>{children}{message && <Toast message={message} onClose={() => setMessage(null)} />}</ToastContext.Provider>;
}
export function useToast() { const context = useContext(ToastContext); if (!context) throw new Error("useToast must be used inside ToastProvider"); return context; }
