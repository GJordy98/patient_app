"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Bell, ShoppingBag, Truck, CheckCircle, Clock } from "lucide-react";
import { api } from "@/lib/api-client";

interface Notification {
  id: string;
  title?: string;
  message: string;
  is_read: boolean;
  created_at: string;
  type?: string;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const getIcon = (type?: string) => {
  switch (type?.toUpperCase()) {
    case "ORDER": return <ShoppingBag size={16} className="text-green-600" />;
    case "DELIVERY": return <Truck size={16} className="text-blue-600" />;
    case "VALIDATED": return <CheckCircle size={16} className="text-green-600" />;
    default: return <Bell size={16} className="text-[#94A3B8]" />;
  }
};

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!api.isAuthenticated()) return;
    try {
      setLoading(true);
      const data = await api.getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-50 lg:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <aside className="fixed top-0 right-0 h-full w-full max-w-[360px] bg-white border-l border-[#E2E8F0] z-50 animate-slide-in-right flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-[#22C55E]" />
            <h2 className="text-[16px] font-semibold text-[#1E293B]">Notifications</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F8FAFC] transition-colors"
          >
            <X size={18} className="text-[#94A3B8]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center">
              <Bell size={48} className="text-[#E2E8F0] mb-4" />
              <p className="text-[14px] text-[#94A3B8]">Aucune notification pour l&apos;instant</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#E2E8F0]">
              {notifications.map((notif) => (
                <li
                  key={notif.id}
                  className={`flex items-start gap-3 px-5 py-4 transition-colors ${
                    !notif.is_read ? "bg-[#F0FDF4]" : "bg-white hover:bg-[#F8FAFC]"
                  }`}
                >
                  <div className="mt-0.5 w-8 h-8 rounded-full bg-[#F8FAFC] flex items-center justify-center shrink-0">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {notif.title && (
                      <p className="text-[13px] font-semibold text-[#1E293B] truncate">{notif.title}</p>
                    )}
                    <p className="text-[13px] text-[#94A3B8] leading-snug">{notif.message}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock size={11} className="text-[#94A3B8]" />
                      <span className="text-[11px] text-[#94A3B8]">{formatTime(notif.created_at)}</span>
                    </div>
                  </div>
                  {!notif.is_read && (
                    <span className="w-2 h-2 bg-[#22C55E] rounded-full mt-2 shrink-0" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
