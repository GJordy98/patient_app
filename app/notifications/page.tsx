"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api-client";
import { AppNotification } from "@/types/common";
import { Order } from "@/types/order";
import {
  Bell, BellOff, RefreshCw, ShoppingBag,
  CreditCard, Megaphone, CheckCheck, Loader2,
  CheckCircle, ChevronRight, Package,
} from "lucide-react";

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffMin < 1440) return `Il y a ${Math.floor(diffMin / 60)} h`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
};

const getIcon = (notif: AppNotification) => {
  const typeUp = notif.type?.toUpperCase() ?? "";
  if (typeUp.includes("ORDER") || notif.order_id) return <ShoppingBag size={18} />;
  if (typeUp === "PAYMENT") return <CreditCard size={18} />;
  return <Megaphone size={18} />;
};

function fmtAmount(v: string | number | undefined) {
  if (v === undefined || v === null) return "—";
  const n = parseFloat(String(v));
  return isNaN(n) ? "—" : `${Math.round(n).toLocaleString("fr-FR")} FCFA`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  /* Commandes validées par la pharmacie, en attente de confirmation du patient */
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getNotifications();
      setNotifications(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPendingOrders = useCallback(async () => {
    try {
      setOrdersLoading(true);
      // ACCEPTED = pharmacie a validé, patient doit confirmer
      const [acc, res] = await Promise.allSettled([
        api.getMyOrders("ACCEPTED"),
        api.getMyOrders("RESERVED"),
      ]);
      const accepted = acc.status === "fulfilled"
        ? (Array.isArray(acc.value) ? acc.value : (acc.value as { results?: Order[] }).results ?? [])
        : [];
      const reserved = res.status === "fulfilled"
        ? (Array.isArray(res.value) ? res.value : (res.value as { results?: Order[] }).results ?? [])
        : [];
      // Dédupliquer par ID
      const seen = new Set<string>();
      const merged: Order[] = [];
      for (const o of [...accepted, ...reserved]) {
        if (!seen.has(o.id)) { seen.add(o.id); merged.push(o); }
      }
      merged.sort((a, b) =>
        new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()
      );
      setPendingOrders(merged);
    } catch {
      // silent
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    loadPendingOrders();
  }, [loadNotifications, loadPendingOrders]);

  const handleMarkRead = async (id: string) => {
    if (markingId) return;
    try {
      setMarkingId(id);
      await api.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      // silent
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    await Promise.all(unread.map((n) => api.markNotificationAsRead(n.id)));
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <DashboardLayout title="Notifications">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── En-tête ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] flex items-center justify-center">
              <Bell size={20} className="text-[#22C55E]" />
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-[#1E293B]">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-[12px] text-[#22C55E] font-semibold">
                  {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-[#22C55E] hover:bg-[#F0FDF4] rounded-xl transition-colors"
              >
                <CheckCheck size={15} />
                Tout marquer lu
              </button>
            )}
            <button
              onClick={() => { loadNotifications(); loadPendingOrders(); }}
              disabled={loading}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#F0FDF4] text-[#94A3B8] hover:text-[#22C55E] transition-colors disabled:opacity-50"
              title="Actualiser"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            COMMANDES EN ATTENTE DE CONFIRMATION
        ══════════════════════════════════════════ */}
        {(ordersLoading || pendingOrders.length > 0) && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package size={15} className="text-[#22C55E]" />
              <p className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider">
                {ordersLoading
                  ? "Chargement…"
                  : `${pendingOrders.length} commande${pendingOrders.length > 1 ? "s" : ""} en attente de confirmation`}
              </p>
            </div>

            {ordersLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-[#F0FDF4] rounded-xl p-4 animate-pulse h-16" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {pendingOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-[#F0FDF4] border border-[#22C55E]/20 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                  >
                    {/* ID + montant */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#22C55E]/15 flex items-center justify-center shrink-0">
                        <ShoppingBag size={16} className="text-[#22C55E]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-[#1E293B] font-mono">
                          #{String(order.id).slice(-8).toUpperCase()}
                        </p>
                        <p className="text-[12px] text-[#22C55E] font-semibold">
                          {fmtAmount(order.total_amount)}
                        </p>
                      </div>
                    </div>

                    {/* Lien Détail uniquement */}
                    <Link
                      href={`/orders/${order.id}`}
                      className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold border border-[#22C55E] text-[#22C55E] rounded-xl hover:bg-[#22C55E] hover:text-white transition-all shrink-0"
                    >
                      Détail
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            LISTE DES NOTIFICATIONS
        ══════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <Loader2 size={32} className="text-[#22C55E] animate-spin" />
              <p className="text-[13px] text-[#94A3B8]">Chargement des notifications…</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#F8FAFC] flex items-center justify-center">
                <BellOff size={28} className="text-gray-200" />
              </div>
              <p className="text-[15px] font-semibold text-[#94A3B8]">Aucune notification</p>
              <p className="text-[13px] text-[#94A3B8]">Vos notifications apparaîtront ici</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F8FAFC]">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`px-5 py-4 flex items-start gap-4 transition-colors ${
                    !notif.is_read
                      ? "bg-[#F0FDF4] border-l-[3px] border-l-[#22C55E]"
                      : "hover:bg-[#F8FAFC]"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      !notif.is_read
                        ? "bg-[#22C55E]/15 text-[#22C55E]"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {getIcon(notif)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[14px] font-bold text-[#1E293B] line-clamp-1">
                        {notif.title}
                      </h3>
                      <span className="text-[11px] text-[#94A3B8] whitespace-nowrap shrink-0">
                        {formatDate(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#64748B] mt-0.5 line-clamp-3">
                      {notif.message}
                    </p>
                    {/* Lien vers la commande si disponible */}
                    {notif.order_id && (
                      <Link
                        href={`/orders/${notif.order_id}`}
                        className="inline-flex items-center gap-1 mt-2 text-[12px] font-semibold text-[#22C55E] hover:underline"
                      >
                        Voir la commande <ChevronRight size={12} />
                      </Link>
                    )}
                  </div>

                  {!notif.is_read && (
                    <button
                      onClick={() => handleMarkRead(notif.id)}
                      disabled={markingId === notif.id}
                      className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[#22C55E] hover:bg-[#22C55E]/10 transition-colors disabled:opacity-50"
                      title="Marquer comme lu"
                    >
                      {markingId === notif.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <CheckCircle size={16} />
                      }
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
