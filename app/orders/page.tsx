"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  ChevronRight,
  RefreshCw,
  ShoppingBag,
  Package,
  FileDown,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatusBadge from "@/components/ui/StatusBadge";
import { api } from "@/lib/api-client";
import { Order } from "@/types/order";
import { useAutoRefresh } from "@/hooks/autoRefresh";

/* ── Status groups (statuts réels backend) ── */
const PREPARATION = ["PENDING", "PARTIAL_VALIDATION", "VALIDATED", "PAYMENT_PENDING", "ACCEPTED", "RESERVED", "PENDING_PATIENT"];
const EN_LIVRAISON = ["IN_PICKUP", "IN_TRANSIT", "IN_DELIVERY"];
const TERMINE = ["DELIVERED", "COMPLETED"];
const ANNULE = ["CANCELLED", "REJECTED"];

/* Statuts où au moins 1 pharmacie a validé → facture disponible */
const PHARMACY_VALIDATED = ["PARTIAL_VALIDATION", "VALIDATED", "IN_PICKUP", "IN_TRANSIT", "DELIVERED", "COMPLETED", "ACCEPTED", "IN_DELIVERY"];
const hasPharmacyValidated = (status: string) => PHARMACY_VALIDATED.includes(status?.toUpperCase());

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
// Retire le segment /v1 terminal pour reconstituer la base brute (ex: https://host/api)
const getInvoicePdfUrl = (orderId: string) => `${API_BASE}/get-invoice-order-patient/${orderId}/pdf/`;

type FilterType = "all" | "preparation" | "en_livraison" | "completed" | "cancelled";

/* ── Mini timeline (3 steps) ── */
const getStep = (status: string): number => {
  const s = status?.toUpperCase();
  if (PREPARATION.includes(s)) return 0;
  if (EN_LIVRAISON.includes(s)) return 1;
  if (TERMINE.includes(s)) return 2;
  return -1; // annulée
};

function MiniTimeline({ status }: { status: string }) {
  const step = getStep(status);
  if (step === -1) return null;
  const steps = [
    { label: "Validée", Icon: CheckCircle },
    { label: "En route", Icon: Truck },
    { label: "Livré", Icon: Package },
  ];
  return (
    <div className="flex items-center gap-1 mt-3">
      {steps.map(({ label, Icon }, i) => (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${i < step
                  ? "bg-[#22C55E]"
                  : i === step
                    ? "bg-[#22C55E] ring-2 ring-[#22C55E]/30"
                    : "bg-[#E2E8F0]"
                }`}
            >
              <Icon size={12} className={i <= step ? "text-white" : "text-[#94A3B8]"} />
            </div>
            <span className={`text-[10px] mt-0.5 font-medium ${i <= step ? "text-[#1E293B]" : "text-[#94A3B8]"}`}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 rounded-full mb-3 ${i < step ? "bg-[#22C55E]" : "bg-[#E2E8F0]"}`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ── Order card ── */
function OrderCard({ order }: { order: Order }) {
  const date = order.created_at
    ? new Date(order.created_at).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    : "—";
  const total =
    order.total_amount !== undefined
      ? `${Number(order.total_amount).toLocaleString("fr-FR")} FCFA`
      : "—";

  const showInvoiceBtn = hasPharmacyValidated(order.status);

  const handleDownloadInvoice = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = getInvoicePdfUrl(order.id);
    const link = document.createElement("a");
    link.href = url;
    link.download = `facture-commande-${String(order.id).slice(-8).toUpperCase()}.pdf`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Link
      href={`/orders/${order.id}`}
      className="block bg-white rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-md hover:border-[#22C55E]/30 transition-all duration-200 p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] flex items-center justify-center shrink-0">
            <ShoppingBag size={18} className="text-[#22C55E]" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[#1E293B]">
              Commande #{String(order.id).slice(-8).toUpperCase()}
            </p>
            <p className="text-[12px] text-[#94A3B8]">{date}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <StatusBadge status={order.status} />
          <span className="text-[13px] font-semibold text-[#1E293B]">{total}</span>
        </div>
      </div>

      <MiniTimeline status={order.status} />

      <div className="flex items-center justify-between mt-3">
        {showInvoiceBtn ? (
          <button
            onClick={handleDownloadInvoice}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F0FDF4] border border-[#22C55E]/30 text-[#16A34A] text-[12px] font-semibold hover:bg-[#22C55E] hover:text-white transition-all duration-200"
            title="Télécharger votre facture"
          >
            <FileDown size={13} />
            Télécharger votre facture
          </button>
        ) : (
          <span />
        )}
        <span className="text-[12px] text-[#22C55E] font-medium flex items-center gap-1">
          Voir les détails <ChevronRight size={14} />
        </span>
      </div>
    </Link>
  );
}

/* ── Skeleton loader ── */
function OrderSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="skeleton w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-48 rounded" />
          <div className="skeleton h-3 w-24 rounded" />
        </div>
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
      <div className="skeleton h-8 w-full rounded-lg" />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════ */
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  /* ── Fetch orders ── */
  const fetchOrders = useCallback(async () => {
    if (!api.isAuthenticated()) return;
    try {
      const data = await api.getMyOrders();
      const list = Array.isArray(data) ? data : (data as { results?: Order[] }).results ?? [];
      list.sort(
        (a, b) =>
          new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()
      );
      setOrders(list);
      setLastRefresh(new Date());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Initial load ── */
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /* ── AUTO-REFRESH : toutes les 15 secondes ── */
  useAutoRefresh(fetchOrders, 10_000);

  /* ── Filter counts ── */
  const counts = useMemo(() => ({
    all: orders.length,
    preparation: orders.filter((o) => PREPARATION.includes(o.status?.toUpperCase())).length,
    en_livraison: orders.filter((o) => EN_LIVRAISON.includes(o.status?.toUpperCase())).length,
    completed: orders.filter((o) => TERMINE.includes(o.status?.toUpperCase())).length,
    cancelled: orders.filter((o) => ANNULE.includes(o.status?.toUpperCase())).length,
  }), [orders]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "preparation": return orders.filter((o) => PREPARATION.includes(o.status?.toUpperCase()));
      case "en_livraison": return orders.filter((o) => EN_LIVRAISON.includes(o.status?.toUpperCase()));
      case "completed": return orders.filter((o) => TERMINE.includes(o.status?.toUpperCase()));
      case "cancelled": return orders.filter((o) => ANNULE.includes(o.status?.toUpperCase()));
      default: return orders;
    }
  }, [orders, filter]);

  const TABS: { key: FilterType; label: string; Icon: React.ElementType }[] = [
    { key: "all", label: "Toutes", Icon: ClipboardList },
    { key: "preparation", label: "En préparation", Icon: Clock },
    { key: "en_livraison", label: "En livraison", Icon: Truck },
    { key: "completed", label: "Terminées", Icon: CheckCircle },
    { key: "cancelled", label: "Annulées", Icon: XCircle },
  ];

  return (
    <DashboardLayout title="Mes commandes">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-bold text-[#1E293B]">Mes commandes</h1>
          <p className="text-[13px] text-[#94A3B8] mt-0.5">
            Mise à jour auto •{" "}
            {lastRefresh.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-3 py-2 border border-[#E2E8F0] rounded-lg text-[13px] font-medium text-[#94A3B8] hover:border-[#22C55E] hover:text-[#22C55E] transition-all"
        >
          <RefreshCw size={14} />
          Actualiser
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all duration-200 ${filter === key
                ? "bg-[#22C55E] text-white shadow-sm"
                : "bg-white border border-[#E2E8F0] text-[#94A3B8] hover:border-[#22C55E]/40 hover:text-[#1E293B]"
              }`}
          >
            <Icon size={14} />
            {label}
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${filter === key ? "bg-white/20 text-white" : "bg-[#F8FAFC] text-[#94A3B8]"
                }`}
            >
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <OrderSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardList size={56} className="text-[#E2E8F0] mb-4" />
          <p className="text-[16px] font-semibold text-[#1E293B] mb-1">Aucune commande</p>
          <p className="text-[13px] text-[#94A3B8] mb-6">
            {filter === "all"
              ? "Vous n'avez pas encore passé de commande."
              : "Aucune commande dans cette catégorie."}
          </p>
          <Link
            href="/"
            className="flex items-center gap-2 bg-[#22C55E] hover:bg-[#16A34A] text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            <ShoppingBag size={16} />
            Rechercher des médicaments
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
