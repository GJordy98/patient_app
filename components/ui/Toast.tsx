"use client";

import { useEffect } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const TOAST_CONFIG = {
  success: { bg: "bg-[#22C55E]", Icon: CheckCircle },
  error:   { bg: "bg-[#EF4444]", Icon: XCircle },
  info:    { bg: "bg-[#3B82F6]", Icon: Info },
};

export default function Toast({ toast, onDismiss }: ToastProps) {
  const { bg, Icon } = TOAST_CONFIG[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`animate-slide-in-right flex items-center gap-3 ${bg} text-white px-4 py-3 rounded-xl shadow-lg min-w-[280px] max-w-sm`}
    >
      <Icon size={18} className="shrink-0" />
      <p className="text-[14px] font-medium flex-1">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 opacity-75 hover:opacity-100 transition-opacity"
      >
        <X size={16} />
      </button>
    </div>
  );
}
