"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Truck,
  Package,
  Pill,
  Banknote,
  MapPin,
  Clock,
  Loader2,
  QrCode,
  RefreshCw,
  ShoppingBag,
  AlertCircle,
  AlertTriangle,
  Receipt,
  Store,
  Hash,
  ShieldAlert,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatusBadge from "@/components/ui/StatusBadge";
import { api } from "@/lib/api-client";
import type { InvoiceResponse } from "@/lib/api-client";
import { Order, OrderItem } from "@/types/order";
import Barcode from "react-barcode";

const TrackingMap = dynamic(() => import("@/components/orders/TrackingMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] bg-[#F8FAFC] rounded-xl flex items-center justify-center">
      <Loader2 size={24} className="text-[#22C55E] animate-spin" />
    </div>
  ),
});

/* ── TIMELINE : Mapping des statuts réels du backend ── */
const STEPS = [
  { key: "preparation", label: "Préparation", Icon: Package },
  { key: "collecte", label: "Collecte", Icon: ShoppingBag },
  { key: "livraison", label: "En livraison", Icon: Truck },
  { key: "livre", label: "Livré", Icon: CheckCircle },
];

function getStepIndex(status: string): number {
  const s = status?.toUpperCase();
  if (["PENDING", "ACCEPTED", "RESERVED", "PARTIAL_VALIDATION", "PENDING_PATIENT"].includes(s)) return 0;
  if (["IN_PICKUP"].includes(s)) return 1;
  if (["IN_DELIVERY"].includes(s)) return 2;
  if (["DELIVERED", "COMPLETED"].includes(s)) return 3;
  return 0;
}

function Timeline({ status }: { status: string }) {
  const current = getStepIndex(status);
  const cancelled = status?.toUpperCase() === "CANCELLED";

  if (cancelled) {
    return (
      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
        <XCircle size={18} className="text-[#EF4444]" />
        <span className="text-[14px] font-medium text-[#EF4444]">Commande annulée</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-[#F8FAFC] rounded-xl px-4 py-5 border border-[#E2E8F0]">
      {STEPS.map(({ label, Icon }, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1.5 relative">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${done ? "bg-[#22C55E]" : active ? "bg-[#22C55E] ring-4 ring-[#22C55E]/20" : "bg-[#E2E8F0]"
                  }`}
              >
                <Icon size={18} className={done || active ? "text-white" : "text-[#94A3B8]"} />
              </div>
              <span
                className={`text-[10px] font-bold text-center leading-tight max-w-[65px] ${done || active ? "text-[#1E293B]" : "text-[#94A3B8]"
                  }`}
              >
                {label}
              </span>
              {active && (
                <span className="absolute -bottom-4 text-[9px] text-[#22C55E] font-black uppercase tracking-tighter">
                  Actuel
                </span>
              )}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-1 rounded-full mx-1 mb-6 transition-colors duration-700 ${i < current ? "bg-[#22C55E]" : "bg-[#E2E8F0]"
                  }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ── BADGE STATUT FACTURE ── */
function InvoiceStatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase();
  if (s === "PAID")
    return (
      <span className="text-[10px] font-black text-[#22C55E] bg-[#F0FDF4] border border-[#22C55E]/20 px-2 py-0.5 rounded-full flex items-center gap-1">
        <CheckCircle size={10} /> Payé
      </span>
    );
  if (s === "UNPAID")
    return (
      <span className="text-[10px] font-black text-[#F59E0B] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
        <Clock size={10} /> En attente
      </span>
    );
  return (
    <span className="text-[10px] font-bold text-[#94A3B8] bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-0.5 rounded-full">
      {status}
    </span>
  );
}

/* ── SECTION FACTURES ── */
function InvoicesSection({
  invoices,
  onValidate,
  onReject,
  validating,
  rejecting,
  isPendingValidation,
  confirmed,
}: {
  invoices: InvoiceResponse[];
  onValidate: () => void;
  onReject: () => void;
  validating: boolean;
  rejecting: boolean;
  isPendingValidation: boolean;
  confirmed: boolean;
}) {
  const toNum = (v: unknown) => parseFloat(String(v || 0)) || 0;
  const fmtFCFA = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

  if (invoices.length === 0) return null;

  return (
    <div className="space-y-4">
      {invoices.map((invoice, idx) => {
        const itemsTotal = invoice.items.reduce((sum, item) => sum + toNum(item.line_total), 0);

        return (
          <div
            key={invoice.invoice_number || idx}
            className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden"
          >
            {/* En-tête facture */}
            <div className="px-5 py-4 border-b border-[#E2E8F0] bg-gradient-to-r from-[#F0FDF4] to-[#F8FAFC]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center shadow-sm">
                    <Store size={16} className="text-[#22C55E]" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-black text-[#1E293B] leading-tight">
                      {invoice.officine_name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Hash size={10} className="text-[#94A3B8]" />
                      <span className="text-[10px] font-mono text-[#94A3B8]">
                        {invoice.invoice_number}
                      </span>
                    </div>
                  </div>
                </div>
                <InvoiceStatusBadge status={invoice.status} />
              </div>
            </div>

            {/* Liste des articles */}
            <div className="p-5 space-y-4">
              {invoice.items.length > 0 ? (
                <div className="divide-y divide-[#F8FAFC]">
                  {invoice.items.map((item) => {
                    const qty = toNum(item.quantity);
                    const unitP = toNum(item.unit_price);
                    const lineT = toNum(item.line_total);
                    const isReserved = item.status?.toUpperCase() === "RESERVED";

                    return (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-xl bg-[#F0FDF4] flex items-center justify-center shrink-0 mt-0.5">
                            <Pill size={14} className="text-[#22C55E]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-[#1E293B] leading-snug line-clamp-2">
                              {item.product.name}
                            </p>
                            {item.product.dci && (
                              <p className="text-[10px] text-[#64748B] mt-0.5 font-medium">
                                {item.product.dci}
                              </p>
                            )}
                            {item.product.galenic && (
                              <p className="text-[10px] text-[#94A3B8]">
                                {item.product.galenic}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-[11px] text-[#64748B] bg-[#F8FAFC] px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                                Qté : {qty}
                              </span>
                              {unitP > 0 && (
                                <span className="text-[11px] text-[#64748B]">
                                  × {fmtFCFA(unitP)}
                                </span>
                              )}
                              {isReserved && (
                                <span className="text-[9px] font-black text-[#22C55E] bg-[#F0FDF4] border border-[#22C55E]/20 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                  Disponible
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {lineT > 0 && (
                          <span className="text-[14px] font-black text-[#1E293B] shrink-0">
                            {fmtFCFA(lineT)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-[#F8FAFC] rounded-xl p-4 flex items-center gap-3">
                  <Loader2 size={16} className="text-[#94A3B8] animate-spin shrink-0" />
                  <p className="text-[13px] text-[#64748B]">
                    La pharmacie prépare votre sélection de médicaments…
                  </p>
                </div>
              )}

              {/* Résumé financier */}
              <div className="bg-[#F8FAFC] rounded-xl px-4 py-3 space-y-2 border border-[#E2E8F0]">
                {itemsTotal > 0 && (
                  <div className="flex justify-between text-[13px] text-[#64748B]">
                    <span>Sous-total ({invoice.items.length} article{invoice.items.length > 1 ? "s" : ""})</span>
                    <span className="font-semibold text-[#1E293B]">{fmtFCFA(itemsTotal)}</span>
                  </div>
                )}
                {toNum(invoice.total_amount) > 0 && (
                  <div className="pt-2 border-t border-[#E2E8F0] flex justify-between items-center">
                    <span className="text-[14px] font-bold text-[#1E293B]">Total facture</span>
                    <span className="text-[20px] font-black text-[#22C55E]">
                      {fmtFCFA(toNum(invoice.total_amount))}
                    </span>
                  </div>
                )}
              </div>

              {/* Boutons de validation (seulement si en attente & pas encore confirmé) */}
              {isPendingValidation && !confirmed && (
                <div className="flex flex-col gap-2.5 pt-1">
                  <button
                    onClick={onValidate}
                    disabled={validating || rejecting}
                    className="w-full bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-60 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {validating ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                    Confirmer la commande
                  </button>
                  <button
                    onClick={onReject}
                    disabled={rejecting || validating}
                    className="w-full border border-[#EF4444] text-[#EF4444] hover:bg-red-50 disabled:opacity-60 font-semibold py-3 rounded-xl text-[13px] transition-colors flex items-center justify-center gap-2"
                  >
                    {rejecting ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                    Annuler la commande
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── PRODUITS VALIDÉS (fallback si pas de factures) ── */
function PharmacyValidatedProducts({ order, onValidate, onReject, validating, rejecting }: any) {
  const toNum = (v: unknown) => parseFloat(String(v || 0)) || 0;
  const fmtFCFA = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

  const hasItems = Array.isArray(order.items) && order.items.length > 0;
  const deliveryFeeNum = toNum(order.delivery_fee);
  const totalAmountNum = toNum(order.total_amount);

  const itemsTotal = hasItems
    ? order.items.reduce((sum: number, item: any) => {
      return sum + (toNum(item.total_price) || toNum(item.unit_price) * toNum(item.quantity));
    }, 0)
    : 0;

  const totalDisplay = hasItems
    ? itemsTotal + deliveryFeeNum
    : Math.max(totalAmountNum, deliveryFeeNum);

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] flex items-center justify-center">
            <Pill size={16} className="text-[#22C55E]" />
          </div>
          <h3 className="text-[15px] font-bold text-[#1E293B]">Produits disponibles</h3>
        </div>
        <span className="text-[11px] font-bold text-[#22C55E] bg-[#F0FDF4] px-2.5 py-1 rounded-lg">
          Confirmez votre commande
        </span>
      </div>

      <div className="p-5 space-y-4">
        {hasItems ? (
          <div className="divide-y divide-[#F8FAFC]">
            {order.items.map((item: any, i: number) => {
              const unitP = toNum(item.unit_price);
              const qty = toNum(item.quantity);
              const lineT = toNum(item.total_price) || unitP * qty;
              return (
                <div key={i} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] flex items-center justify-center shrink-0">
                      <Pill size={14} className="text-[#22C55E]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#1E293B] truncate">{item.product_name}</p>
                      <p className="text-[11px] text-[#94A3B8]">
                        {qty > 0 && `Qté : ${qty}`}
                        {unitP > 0 && qty > 0 && ` · ${fmtFCFA(unitP)}`}
                      </p>
                    </div>
                  </div>
                  {lineT > 0 && (
                    <span className="text-[13px] font-bold text-[#1E293B] shrink-0">{fmtFCFA(lineT)}</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#F8FAFC] rounded-xl p-4 flex items-center gap-3">
            <Loader2 size={16} className="text-[#94A3B8] animate-spin shrink-0" />
            <p className="text-[13px] text-[#64748B]">
              La pharmacie prépare votre sélection de médicaments…
            </p>
          </div>
        )}

        {(hasItems || deliveryFeeNum > 0) && (
          <div className="bg-[#F8FAFC] rounded-xl px-4 py-3 space-y-2 border border-[#E2E8F0]">
            {hasItems && itemsTotal > 0 && (
              <div className="flex justify-between text-[13px] text-[#64748B]">
                <span>Médicaments</span>
                <span className="font-semibold text-[#1E293B]">{fmtFCFA(itemsTotal)}</span>
              </div>
            )}
            {deliveryFeeNum > 0 && (
              <div className="flex justify-between text-[13px] text-[#64748B]">
                <div className="flex items-center gap-1.5">
                  <Truck size={12} />
                  <span>Livraison</span>
                </div>
                <span className="font-semibold text-[#1E293B]">{fmtFCFA(deliveryFeeNum)}</span>
              </div>
            )}
            {totalDisplay > 0 && (
              <div className="pt-2 border-t border-[#E2E8F0] flex justify-between items-center">
                <span className="text-[14px] font-bold text-[#1E293B]">Total</span>
                <span className="text-[20px] font-black text-[#22C55E]">{fmtFCFA(totalDisplay)}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <button
            onClick={onValidate}
            disabled={validating || rejecting}
            className="w-full bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-60 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {validating ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            Confirmer la commande
          </button>
          <button
            onClick={onReject}
            disabled={rejecting || validating}
            className="w-full border border-[#EF4444] text-[#EF4444] hover:bg-red-50 disabled:opacity-60 font-semibold py-3 rounded-xl text-[13px] transition-colors flex items-center justify-center gap-2"
          >
            {rejecting ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
            Annuler la commande
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── CODE DE RÉCUPÉRATION ── */
function ReceptionCode({ code }: { code: string }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-[#22C55E] p-5 shadow-sm">
      {/* En-tête */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-[#F0FDF4] flex items-center justify-center">
          <QrCode size={20} className="text-[#22C55E]" />
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-[#1E293B]">Code de récupération</h3>
          <p className="text-[11px] text-[#94A3B8]">À communiquer au livreur lors de la remise</p>
        </div>
      </div>

      {/* Code-barres CODE128 */}
      <div className="bg-white rounded-xl p-4 border border-[#E2E8F0] flex flex-col items-center">
        <Barcode
          value={code}
          format="CODE128"
          width={2.2}
          height={90}
          displayValue={false}
          margin={8}
          background="#ffffff"
          lineColor="#1E293B"
        />
        {/* Code en clair */}
        {/* Code en clair */}
        <div className="mt-3 bg-[#F0FDF4] border border-[#22C55E]/30 rounded-lg px-2 py-0.5 w-1/4 flex flex-col items-center">
          <p className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest mb-0.5">
            Code
          </p>
          <p className="text-[10px] font-mono font-black text-[#22C55E] tracking-[0.15em]">
            {code}
          </p>
        </div>
      </div>

      <p className="text-[11px] text-[#64748B] mt-3 text-center">
        Ne partagez ce code qu&apos;au moment où le livreur vous remet vos médicaments.
      </p>
    </div>
  );
}

/* ── TRACKING CODES ── */
function TrackingCodes({ order }: { order: Order }) {
  if (!order.code_reception && !order.delivery_id) return null;
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <QrCode size={18} className="text-[#22C55E]" />
        <h3 className="text-[15px] font-bold text-[#1E293B]">Sécurisation livraison</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {order.code_reception && (
          <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
            <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1">Code client</p>
            <p className="text-[26px] font-mono font-black text-[#1E293B]">{order.code_reception}</p>
          </div>
        )}
        {order.delivery_id && (
          <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
            <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1">ID Livreur</p>
            <p className="text-[26px] font-mono font-black text-[#22C55E]">{order.delivery_id}</p>
          </div>
        )}
      </div>
    </div>
  );
}


/* ── PAGE PRINCIPALE ── */
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<any>(null);
  const [validating, setValidating] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    try {
      const [data, invData] = await Promise.all([
        api.getOrderById(id),
        api.getInvoiceByOrderId(id),
      ]);
      setOrder(data);
      setInvoices(invData);
    } catch {
      console.error("Erreur fetch");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const handleValidate = async () => {
    setValidating(true);
    try {
      await api.validateByPatient(order!.id);
      setConfirmed(true);
      setFeedback({ type: "success", message: "Commande validée ! Un livreur va être assigné." });
      fetchOrder();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erreur lors de la validation." });
    } finally {
      setValidating(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      await api.rejectInvoice(order!.id);
      router.push("/orders");
    } catch {
      setRejecting(false);
    }
  };

  if (loading)
    return (
      <DashboardLayout title="Chargement...">
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-[#22C55E]" size={40} />
        </div>
      </DashboardLayout>
    );
  if (!order)
    return <DashboardLayout title="Erreur">Commande introuvable.</DashboardLayout>;

  // Debug — à retirer en production
  console.log('[OrderDetail] order.status =', order.status, '| invoices =', invoices.map(i => i.status));

  // Le patient doit encore valider → statuts envoyés par la pharmacie
  const isPendingValidation = [
    "PENDING_PATIENT", "ACCEPTED", "PARTIAL_VALIDATION", "RESERVED",
    "UNPAID",   // statut possible quand la pharmacie a généré la facture
  ].includes(order.status?.toUpperCase());
  // Commande initiée mais pharmacie n'a pas encore répondu
  const isPendingPharmacy = ["PENDING"].includes(order.status?.toUpperCase());
  const isLive = ["IN_PICKUP", "IN_DELIVERY"].includes(order.status?.toUpperCase());
  const isFinished = ["DELIVERED", "COMPLETED"].includes(order.status?.toUpperCase());
  const hasInvoices = invoices.length > 0;

  // Afficher le bouton si :
  // 1) statut de commande connu comme «en attente patient» OU
  // 2) au moins une facture est UNPAID (la pharmacie a préparé, patient pas encore validé)
  const hasUnpaidInvoice = invoices.some(inv => inv.status?.toUpperCase() === "UNPAID");
  const showValidationButtons = !confirmed && (isPendingValidation || hasUnpaidInvoice);

  return (
    <DashboardLayout title={`Commande #${String(order.id).slice(-6).toUpperCase()}`}>
      <div className="max-w-2xl mx-auto pb-10">

        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push("/orders")}
            className="flex items-center gap-2 text-[#94A3B8] hover:text-[#1E293B]"
          >
            <ArrowLeft size={18} /> <span className="text-[14px] font-bold">Retour</span>
          </button>
          <button
            onClick={fetchOrder}
            className="text-[#22C55E] flex items-center gap-1.5 active:rotate-180 transition-transform"
          >
            <RefreshCw size={14} /> <span className="text-[12px] font-bold">Actualiser</span>
          </button>
        </div>

        {feedback && (
          <div
            className={`mb-4 p-4 rounded-xl flex items-center gap-3 text-[14px] font-bold animate-bounce ${feedback.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
              }`}
          >
            {feedback.type === "success" ? <CheckCircle size={18} /> : <XCircle size={18} />}
            {feedback.message}
          </div>
        )}

        <div className="space-y-5">
          {/* Carte En-tête */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-4">
                <div className="w-14 h-14 bg-[#F0FDF4] rounded-2xl flex items-center justify-center text-[#22C55E]">
                  <ShoppingBag size={28} />
                </div>
                <div>
                  <h1 className="text-[18px] font-black text-[#1E293B]">
                    Commande #{String(order.id).slice(-8).toUpperCase()}
                  </h1>
                  <p className="text-[12px] text-[#94A3B8] font-medium flex items-center gap-1 mt-1">
                    <Clock size={14} />
                    {order?.created_at
                      ? new Date(order.created_at!).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                      : "—"}
                  </p>
                </div>
              </div>
              <StatusBadge status={order.status} />
            </div>
            {order.total_amount && (
              <div className="flex justify-between items-center bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
                <span className="text-[14px] font-bold text-[#64748B]">Montant Final</span>
                <span className="text-[20px] font-black text-[#1E293B]">
                  {Number(order.total_amount).toLocaleString()} FCFA
                </span>
              </div>
            )}
          </div>

          {/* Timeline Suivi */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
            <h3 className="text-[14px] font-bold text-[#1E293B] mb-4 flex items-center gap-2">
              <Clock size={16} className="text-[#22C55E]" /> État d'avancement
            </h3>
            <Timeline status={order.status} />
          </div>

          {/* ──────── EN ATTENTE DE LA PHARMACIE ──────── */}
          {isPendingPharmacy && !hasInvoices && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Clock size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-amber-800">En attente de la pharmacie</p>
                <p className="text-[12px] text-amber-600 mt-0.5">
                  La pharmacie prépare votre commande. Vous recevrez une notification dès qu'elle sera prête.
                </p>
              </div>
            </div>
          )}

          {/* ──────── SECTION FACTURES ──────── */}
          {hasInvoices ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Receipt size={16} className="text-[#22C55E]" />
                <h2 className="text-[14px] font-black text-[#1E293B] uppercase tracking-wide">
                  Détails de la commande
                </h2>
                <span className="text-[10px] font-bold text-[#22C55E] bg-[#F0FDF4] px-2 py-0.5 rounded-full">
                  {invoices.length} facture{invoices.length > 1 ? "s" : ""}
                </span>
              </div>

              {/* Affichage des factures — sans les boutons embarqués */}
              <InvoicesSection
                invoices={invoices}
                onValidate={handleValidate}
                onReject={handleReject}
                validating={validating}
                rejecting={rejecting}
                isPendingValidation={false}
                confirmed={confirmed}
              />

              {/* ──── CARTE D'ACTION : valider ou annuler ──── */}
              {showValidationButtons && (
                <div className="bg-white rounded-2xl border-2 border-[#22C55E]/30 shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-[#F0FDF4] to-[#ECFDF5] px-5 py-4 border-b border-[#22C55E]/20">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#22C55E]/10 flex items-center justify-center">
                        <CheckCircle size={16} className="text-[#22C55E]" />
                      </div>
                      <div>
                        <p className="text-[14px] font-black text-[#1E293B]">Confirmez votre commande</p>
                        <p className="text-[11px] text-[#64748B]">
                          En validant, un livreur sera assigné à votre commande.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 flex flex-col gap-3">
                    <button
                      onClick={handleValidate}
                      disabled={validating || rejecting}
                      className="w-full bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-60 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[15px] shadow-sm"
                    >
                      {validating ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <CheckCircle size={18} />
                      )}
                      {validating ? "Validation en cours…" : "✅ Valider et créer la mission"}
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={rejecting || validating}
                      className="w-full border border-[#EF4444] text-[#EF4444] hover:bg-red-50 disabled:opacity-60 font-semibold py-3 rounded-xl text-[13px] transition-colors flex items-center justify-center gap-2"
                    >
                      {rejecting ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                      {rejecting ? "Annulation…" : "Annuler la commande"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Fallback : affichage via order.items si pas de factures du tout */
            isPendingValidation && !confirmed && (
              <PharmacyValidatedProducts
                order={order}
                onValidate={handleValidate}
                onReject={handleReject}
                validating={validating}
                rejecting={rejecting}
              />
            )
          )}

          {/* Code de récupération */}
          {(confirmed || (!isPendingValidation && order.code_reception)) &&
            order.code_reception && <ReceptionCode code={order.code_reception} />}

          {/* Codes & QR Code */}
          <TrackingCodes order={order} />
          {isLive && (
            <div className="bg-white rounded-2xl border border-[#22C55E]/20 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-[#22C55E]">
                <QrCode size={18} />
                <h3 className="text-[15px] font-bold">Votre QR Code de réception</h3>
              </div>
              <div className="flex flex-col items-center gap-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${order.id}`}
                  className="w-40 h-40 border-4 border-[#F8FAFC] rounded-2xl"
                  alt="QR"
                />
                <p className="text-[11px] text-[#94A3B8] text-center max-w-[200px]">
                  À présenter au livreur uniquement au moment de la remise des médicaments.
                </p>
              </div>
            </div>
          )}

          {/* Tracking Map */}
          {(isLive || isFinished) && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b flex justify-between items-center">
                <h3 className="text-[14px] font-bold text-[#1E293B] flex items-center gap-2">
                  <Truck size={16} className="text-[#22C55E]" /> Localisation
                </h3>
                <span className="text-[10px] font-black text-[#22C55E] bg-[#F0FDF4] px-2 py-1 rounded-full uppercase">
                  Live
                </span>
              </div>
              <div className="h-[320px]">
                <TrackingMap
                  pharmacyLat={order.pharmacy_latitude || 3.8667}
                  pharmacyLng={order.pharmacy_longitude || 11.5167}
                  patientLat={order.patient_latitude || 3.8700}
                  patientLng={order.patient_longitude || 11.5200}
                  status={order.status}
                />
              </div>
            </div>
          )}

          {/* Bouton litige — visible si livré ou en cours de livraison */}
          {(isFinished || isLive) && (
            <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <ShieldAlert size={20} className="text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-[#1E293B]">Un problème avec votre colis ?</p>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">
                    Signalez un colis ouvert, endommagé ou incomplet.
                  </p>
                </div>
              </div>
              <div className="px-5 pb-4">
                <Link
                  href={`/orders/${order.id}/dispute`}
                  className="flex items-center justify-center gap-2 w-full py-3 border-2 border-orange-400 text-orange-600 hover:bg-orange-50 font-bold rounded-xl text-[13px] transition-all"
                >
                  <AlertTriangle size={15} />
                  Signaler un litige
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}