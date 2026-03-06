"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api-client";
import {
    ArrowLeft,
    AlertTriangle,
    Camera,
    CheckCircle,
    Loader2,
    X,
    FileImage,
    Package,
    ShieldAlert,
} from "lucide-react";
import type { Order } from "@/types/order";

const REASONS = [
    "Colis ouvert / endommagé",
    "Médicaments manquants",
    "Produits erronés",
    "Colis trempé / mouillé",
    "Emballage cassé",
    "Autre problème",
];

export default function DisputePage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [order, setOrder] = useState<Order | null>(null);
    const [loadingOrder, setLoadingOrder] = useState(true);

    const [selectedReason, setSelectedReason] = useState("");
    const [customReason, setCustomReason] = useState("");
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");

    const fileInputRef = useRef<HTMLInputElement>(null);

    /* ── Charger les données de la commande ── */
    useEffect(() => {
        if (!id) return;
        api.getOrderById(id).then((data) => {
            setOrder(data);
            setLoadingOrder(false);
        }).catch(() => setLoadingOrder(false));
    }, [id]);

    /* ── Gestion de la photo ── */
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        if (!file) return;
        setPhoto(file);
        const reader = new FileReader();
        reader.onloadend = () => setPhotoPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const removePhoto = () => {
        setPhoto(null);
        setPhotoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    /* ── Soumission ── */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const finalReason = selectedReason === "Autre problème" ? customReason.trim() : selectedReason;
        if (!finalReason) {
            setError("Veuillez décrire le problème.");
            return;
        }

        setSubmitting(true);
        try {
            // order.id est récupéré depuis le backend, jamais affiché dans le formulaire
            await api.reportDispute(id, finalReason, photo ?? undefined);
            setSubmitted(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Erreur lors de l'envoi. Veuillez réessayer.");
        } finally {
            setSubmitting(false);
        }
    };

    /* ── Écran succès ── */
    if (submitted) {
        return (
            <DashboardLayout title="Litige envoyé">
                <div className="max-w-md mx-auto py-16 text-center px-4">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                        <CheckCircle size={48} className="text-green-600" />
                    </div>
                    <h2 className="text-[22px] font-black text-[#1E293B] mb-3">Litige enregistré !</h2>
                    <p className="text-[14px] text-[#64748B] mb-8 leading-relaxed">
                        Votre signalement a bien été transmis à notre équipe. Nous analyserons votre dossier
                        et vous contacterons dans les plus brefs délais.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => router.push(`/orders/${id}`)}
                            className="w-full py-3 bg-[#22C55E] text-white font-bold rounded-xl hover:bg-[#16A34A] transition-colors"
                        >
                            Voir ma commande
                        </button>
                        <button
                            onClick={() => router.push("/orders")}
                            className="w-full py-3 bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] font-semibold rounded-xl hover:bg-[#F1F5F9] transition-colors"
                        >
                            Retour à mes commandes
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Signaler un litige">
            <div className="max-w-lg mx-auto pb-10">

                {/* Navigation */}
                <button
                    onClick={() => router.push(`/orders/${id}`)}
                    className="flex items-center gap-2 text-[#94A3B8] hover:text-[#1E293B] mb-6 transition-colors"
                >
                    <ArrowLeft size={18} />
                    <span className="text-[14px] font-bold">Retour à la commande</span>
                </button>

                {/* En-tête */}
                <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 mb-6 text-white shadow-lg shadow-orange-200">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                            <ShieldAlert size={28} className="text-white" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-[20px] font-black">Signaler un litige</h1>
                            <p className="text-[13px] text-white/80 mt-0.5">
                                Colis défectueux, ouvert ou incomplet ? Signalez-le ici.
                            </p>
                        </div>
                    </div>
                    {!loadingOrder && order && (
                        <div className="mt-4 bg-white/10 rounded-xl px-4 py-2.5 flex items-center gap-2">
                            <Package size={14} className="text-white/70 shrink-0" />
                            <span className="text-[12px] text-white/90 font-semibold truncate">
                                Commande #{String(order.id).slice(-8).toUpperCase()}
                            </span>
                        </div>
                    )}
                </div>

                {/* Formulaire */}
                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Choix du type de problème */}
                    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle size={16} className="text-orange-500" />
                            <h2 className="text-[15px] font-bold text-[#1E293B]">
                                Nature du problème <span className="text-red-500">*</span>
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5">
                            {REASONS.map((reason) => (
                                <button
                                    key={reason}
                                    type="button"
                                    onClick={() => { setSelectedReason(reason); setCustomReason(""); }}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-[13px] font-semibold transition-all ${selectedReason === reason
                                            ? "border-orange-400 bg-orange-50 text-orange-700"
                                            : "border-[#E2E8F0] text-[#64748B] hover:border-orange-300 hover:bg-orange-50/50"
                                        }`}
                                >
                                    <span
                                        className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${selectedReason === reason ? "border-orange-500 bg-orange-500" : "border-[#CBD5E1]"
                                            }`}
                                    >
                                        {selectedReason === reason && (
                                            <span className="w-1.5 h-1.5 bg-white rounded-full" />
                                        )}
                                    </span>
                                    {reason}
                                </button>
                            ))}
                        </div>

                        {/* Champ texte si "Autre" */}
                        {selectedReason === "Autre problème" && (
                            <textarea
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                                placeholder="Décrivez le problème en détail…"
                                rows={4}
                                className="mt-3 w-full px-4 py-3 border border-orange-300 rounded-xl text-[13px] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 resize-none transition-all"
                            />
                        )}
                    </div>

                    {/* Upload photo */}
                    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Camera size={16} className="text-[#94A3B8]" />
                            <h2 className="text-[15px] font-bold text-[#1E293B]">Photo du colis</h2>
                            <span className="text-[11px] text-[#94A3B8] font-medium">(optionnel mais recommandé)</span>
                        </div>

                        {photoPreview ? (
                            <div className="relative rounded-xl overflow-hidden border border-[#E2E8F0]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={photoPreview}
                                    alt="Aperçu du colis"
                                    className="w-full h-48 object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={removePhoto}
                                    className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                                >
                                    <X size={14} />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-2">
                                    <p className="text-white text-[11px] font-medium truncate">{photo?.name}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="relative">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={handlePhotoChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="border-2 border-dashed border-[#E2E8F0] hover:border-orange-300 rounded-xl p-8 text-center transition-colors group">
                                    <div className="w-12 h-12 bg-[#F8FAFC] group-hover:bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-colors">
                                        <FileImage size={24} className="text-[#94A3B8] group-hover:text-orange-400 transition-colors" />
                                    </div>
                                    <p className="text-[13px] font-semibold text-[#64748B]">
                                        Cliquez ou glissez une photo ici
                                    </p>
                                    <p className="text-[11px] text-[#94A3B8] mt-1">
                                        JPG, PNG, PDF • Max 10 Mo
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Erreur */}
                    {error && (
                        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-[13px] text-red-600">{error}</p>
                        </div>
                    )}

                    {/* Note légale */}
                    <p className="text-[11px] text-[#94A3B8] text-center leading-relaxed px-2">
                        Ce signalement sera examiné par notre équipe. Des preuves photographiques
                        accélèrent le traitement de votre dossier.
                    </p>

                    {/* Bouton d'envoi */}
                    <button
                        type="submit"
                        disabled={submitting || !selectedReason || (selectedReason === "Autre problème" && !customReason.trim())}
                        className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-[#E2E8F0] disabled:cursor-not-allowed text-white disabled:text-[#94A3B8] font-bold rounded-xl transition-all shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 text-[15px]"
                    >
                        {submitting ? (
                            <><Loader2 size={18} className="animate-spin" /> Envoi en cours…</>
                        ) : (
                            <><ShieldAlert size={18} /> Soumettre le litige</>
                        )}
                    </button>
                </form>
            </div>
        </DashboardLayout>
    );
}
