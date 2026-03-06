"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, PharmacistProduct, PharmacistLot, PharmacistProductPrice } from '@/lib/api-client';
import {
    ArrowLeft, Save, Package, Tag, FlaskConical,
    Calendar, Hash, AlertCircle, CheckCircle, Loader2, Edit3
} from 'lucide-react';

// ─── Status badge ────────────────────────────────────────────────────────────
const LOT_STATUS_LABELS: Record<string, string> = {
    AVAILABLE: 'Disponible',
    EXPIRED: 'Expiré',
    RESERVED: 'Réservé',
    OUT_OF_STOCK: 'Rupture',
};
const LOT_STATUS_COLORS: Record<string, string> = {
    AVAILABLE: 'bg-green-100 text-green-700',
    EXPIRED: 'bg-red-100 text-red-700',
    RESERVED: 'bg-yellow-100 text-yellow-700',
    OUT_OF_STOCK: 'bg-gray-100 text-gray-600',
};

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
    return (
        <div
            className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-medium animate-slide-down ${type === 'success'
                ? 'bg-white border-green-200 text-green-800'
                : 'bg-white border-red-200 text-red-800'
                }`}
        >
            {type === 'success' ? (
                <CheckCircle size={18} className="text-green-500 shrink-0" />
            ) : (
                <AlertCircle size={18} className="text-red-500 shrink-0" />
            )}
            {msg}
        </div>
    );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
            {children}
        </div>
    );
}

const inputCls =
    'w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors';

// ─── Main page ────────────────────────────────────────────────────────────────
export default function EditProductPage() {
    const { id } = useParams();
    const router = useRouter();
    const productId = id as string;

    // ── State ──
    const [product, setProduct] = useState<PharmacistProduct | null>(null);
    const [lots, setLots] = useState<PharmacistLot[]>([]);
    const [prices, setPrices] = useState<PharmacistProductPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Reference data for selects
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [galenics, setGalenics] = useState<{ id: string; name: string }[]>([]);
    const [units, setUnits] = useState<{ id: string; code: string; label: string }[]>([]);

    // Form states
    const [productForm, setProductForm] = useState<Partial<PharmacistProduct>>({});
    const [savingProduct, setSavingProduct] = useState(false);

    const [editingLot, setEditingLot] = useState<string | null>(null);
    const [lotForms, setLotForms] = useState<Record<string, Partial<PharmacistLot>>>({});
    const [savingLot, setSavingLot] = useState<string | null>(null);

    const [editingPrice, setEditingPrice] = useState<string | null>(null);
    const [priceForms, setPriceForms] = useState<Record<string, Partial<PharmacistProductPrice>>>({});
    const [savingPrice, setSavingPrice] = useState<string | null>(null);

    // Toast
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // ── Load ──
    const loadProduct = useCallback(async () => {
        if (!productId) return;
        try {
            setLoading(true);
            setError(null);

            // Load product + reference data in parallel
            const [p, cats, gals, uns] = await Promise.all([
                api.getProduct(productId),
                api.getCategories().catch(() => []),
                api.getGalenics().catch(() => []),
                api.getUnits().catch(() => []),
            ]);

            setCategories(cats as { id: string; name: string }[]);
            setGalenics(gals);
            setUnits(uns);

            setProduct(p);
            setProductForm({
                name: p.name,
                dci: p.dci || '',
                dosage: p.dosage || '',
                category: p.category,
                galenic: p.galenic,
                unit_base: p.unit_base,
                unit_sale: p.unit_sale,
                unit_purchase: p.unit_purchase,
            });

            // Load associated lots
            let fetchedLots: PharmacistLot[] = [];
            try {
                fetchedLots = await api.getProductLots(productId);
            } catch {
                // silently ignore
            }
            setLots(fetchedLots);
            const lotFormInit: Record<string, Partial<PharmacistLot>> = {};
            fetchedLots.forEach(l => {
                lotFormInit[l.id] = {
                    batch_number: l.batch_number,
                    expiration_date: l.expiration_date,
                    quantity: l.quantity,
                    purchase_price: l.purchase_price,
                    status: l.status,
                };
            });
            setLotForms(lotFormInit);

            // Load prices
            const fetchedPrices = await api.getProductPrices(productId);
            setPrices(fetchedPrices);
            const priceFormInit: Record<string, Partial<PharmacistProductPrice>> = {};
            fetchedPrices.forEach(pr => {
                priceFormInit[pr.id] = { sale_price: pr.sale_price, purchase_price: pr.purchase_price };
            });
            setPriceForms(priceFormInit);
        } catch (err) {
            console.error('[EditProductPage] loadProduct error:', err);
            setError(err instanceof Error ? err.message : 'Erreur de chargement du produit.');
        } finally {
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => { loadProduct(); }, [loadProduct]);

    // ── Save product ──
    const handleSaveProduct = async () => {
        if (!product) return;
        setSavingProduct(true);
        try {
            const updated = await api.updateProduct(product.id, productForm);
            setProduct(updated);
            showToast('Produit mis à jour avec succès.');
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.', 'error');
        } finally {
            setSavingProduct(false);
        }
    };

    // ── Save lot ──
    const handleSaveLot = async (lotId: string) => {
        setSavingLot(lotId);
        try {
            const updated = await api.updateLot(lotId, lotForms[lotId]);
            setLots(prev => prev.map(l => l.id === lotId ? { ...l, ...updated } : l));
            setEditingLot(null);
            showToast('Lot mis à jour avec succès.');
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du lot.', 'error');
        } finally {
            setSavingLot(null);
        }
    };

    // ── Save price ──
    const handleSavePrice = async (priceId: string) => {
        setSavingPrice(priceId);
        try {
            const updated = await api.updateProductPrice(priceId, {
                sale_price: Number(priceForms[priceId]?.sale_price ?? 0),
                purchase_price: priceForms[priceId]?.purchase_price !== undefined
                    ? Number(priceForms[priceId].purchase_price)
                    : undefined,
            });
            setPrices(prev => prev.map(p => p.id === priceId ? { ...p, ...updated } : p));
            setEditingPrice(null);
            showToast('Prix mis à jour avec succès.');
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du prix.', 'error');
        } finally {
            setSavingPrice(null);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={48} className="text-primary animate-spin" />
                    <p className="text-gray-500 font-medium">Chargement du produit…</p>
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-10 max-w-md w-full text-center">
                    <AlertCircle size={52} className="text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Produit introuvable</h2>
                    <p className="text-gray-500 mb-6 text-sm">{error || 'Le produit demandé n\'existe pas.'}</p>
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                    >
                        Retour
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {toast && <Toast msg={toast.msg} type={toast.type} />}

            {/* Header bar */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
                <div className="container mx-auto px-4 sm:px-6 max-w-5xl flex items-center justify-between h-16 gap-4">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors"
                    >
                        <ArrowLeft size={18} />
                        <span className="font-medium text-sm">Retour</span>
                    </button>
                    <h1 className="text-base font-bold text-gray-900 truncate flex-1 text-center">
                        Modifier : {product.name}
                    </h1>
                    <div className="w-20" />
                </div>
            </div>

            <main className="container mx-auto px-4 sm:px-6 py-8 max-w-5xl space-y-8">

                {/* ── PRODUCT CARD ── */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Package size={18} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900">Informations produit</h2>
                            <p className="text-xs text-gray-400">Champs de base du médicament</p>
                        </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <Field label="Nom">
                            <input
                                className={inputCls}
                                value={productForm.name ?? ''}
                                onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))}
                            />
                        </Field>
                        <Field label="DCI (Dénomination commune)">
                            <input
                                className={inputCls}
                                value={productForm.dci ?? ''}
                                onChange={e => setProductForm(f => ({ ...f, dci: e.target.value }))}
                            />
                        </Field>
                        <Field label="Dosage">
                            <input
                                className={inputCls}
                                value={productForm.dosage ?? ''}
                                onChange={e => setProductForm(f => ({ ...f, dosage: e.target.value }))}
                            />
                        </Field>

                        {/* Catégorie — select éditable */}
                        <Field label="Catégorie">
                            <select
                                className={inputCls}
                                value={productForm.category ?? ''}
                                onChange={e => setProductForm(f => ({ ...f, category: e.target.value }))}
                            >
                                {productForm.category && !categories.find(c => c.id === productForm.category) && (
                                    <option value={productForm.category}>
                                        {product.category_detail?.name ?? productForm.category}
                                    </option>
                                )}
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </Field>

                        {/* Galénique — select éditable */}
                        <Field label="Galénique">
                            <select
                                className={inputCls}
                                value={productForm.galenic ?? ''}
                                onChange={e => setProductForm(f => ({ ...f, galenic: e.target.value }))}
                            >
                                {productForm.galenic && !galenics.find(g => g.id === productForm.galenic) && (
                                    <option value={productForm.galenic}>
                                        {product.galenic_detail?.name ?? productForm.galenic}
                                    </option>
                                )}
                                {galenics.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </Field>

                        {/* Unité de base */}
                        <Field label="Unité de base">
                            <select
                                className={inputCls}
                                value={productForm.unit_base ?? ''}
                                onChange={e => setProductForm(f => ({ ...f, unit_base: e.target.value }))}
                            >
                                {productForm.unit_base && !units.find(u => u.id === productForm.unit_base) && (
                                    <option value={productForm.unit_base}>
                                        {product.unit_base_detail ? `${product.unit_base_detail.code} — ${product.unit_base_detail.label}` : productForm.unit_base}
                                    </option>
                                )}
                                {units.map(u => (
                                    <option key={u.id} value={u.id}>{u.code} — {u.label}</option>
                                ))}
                            </select>
                        </Field>

                        {/* Unité de vente */}
                        <Field label="Unité de vente">
                            <select
                                className={inputCls}
                                value={productForm.unit_sale ?? ''}
                                onChange={e => setProductForm(f => ({ ...f, unit_sale: e.target.value }))}
                            >
                                {productForm.unit_sale && !units.find(u => u.id === productForm.unit_sale) && (
                                    <option value={productForm.unit_sale}>
                                        {product.unit_sale_detail ? `${product.unit_sale_detail.code} — ${product.unit_sale_detail.label}` : productForm.unit_sale}
                                    </option>
                                )}
                                {units.map(u => (
                                    <option key={u.id} value={u.id}>{u.code} — {u.label}</option>
                                ))}
                            </select>
                        </Field>

                        {/* Unité d'achat */}
                        <Field label="Unité d'achat">
                            <select
                                className={inputCls}
                                value={productForm.unit_purchase ?? ''}
                                onChange={e => setProductForm(f => ({ ...f, unit_purchase: e.target.value }))}
                            >
                                {productForm.unit_purchase && !units.find(u => u.id === productForm.unit_purchase) && (
                                    <option value={productForm.unit_purchase}>
                                        {product.unit_purchase_detail ? `${product.unit_purchase_detail.code} — ${product.unit_purchase_detail.label}` : productForm.unit_purchase}
                                    </option>
                                )}
                                {units.map(u => (
                                    <option key={u.id} value={u.id}>{u.code} — {u.label}</option>
                                ))}
                            </select>
                        </Field>
                    </div>

                    <div className="px-6 pb-5 flex justify-end">
                        <button
                            onClick={handleSaveProduct}
                            disabled={savingProduct}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-colors"
                        >
                            {savingProduct ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {savingProduct ? 'Enregistrement…' : 'Enregistrer le produit'}
                        </button>
                    </div>
                </section>

                {/* ── PRICES CARD ── */}
                {prices.length > 0 && (
                    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                                <Tag size={18} className="text-blue-500" />
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-900">Prix du produit</h2>
                                <p className="text-xs text-gray-400">{prices.length} entrée(s) tarifaire(s)</p>
                            </div>
                        </div>

                        <div className="divide-y divide-gray-50">
                            {prices.map(pr => {
                                const isEditing = editingPrice === pr.id;
                                return (
                                    <div key={pr.id} className="px-6 py-4">
                                        {isEditing ? (
                                            <div className="flex flex-wrap items-end gap-4">
                                                <div className="flex-1 min-w-[140px]">
                                                    <Field label="Prix de vente (FCFA)">
                                                        <input
                                                            type="number"
                                                            className={inputCls}
                                                            value={priceForms[pr.id]?.sale_price ?? ''}
                                                            onChange={e => setPriceForms(f => ({ ...f, [pr.id]: { ...f[pr.id], sale_price: Number(e.target.value) } }))}
                                                        />
                                                    </Field>
                                                </div>
                                                <div className="flex-1 min-w-[140px]">
                                                    <Field label="Prix d'achat (FCFA)">
                                                        <input
                                                            type="number"
                                                            className={inputCls}
                                                            value={priceForms[pr.id]?.purchase_price ?? ''}
                                                            onChange={e => setPriceForms(f => ({ ...f, [pr.id]: { ...f[pr.id], purchase_price: Number(e.target.value) } }))}
                                                        />
                                                    </Field>
                                                </div>
                                                <div className="flex gap-2 pb-0.5">
                                                    <button
                                                        onClick={() => handleSavePrice(pr.id)}
                                                        disabled={savingPrice === pr.id}
                                                        className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
                                                    >
                                                        {savingPrice === pr.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                        Sauvegarder
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingPrice(null)}
                                                        className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                                    >
                                                        Annuler
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex gap-6">
                                                    <div>
                                                        <p className="text-xs text-gray-400 mb-0.5">Prix de vente</p>
                                                        <p className="font-bold text-gray-900">{(pr.sale_price ?? 0).toLocaleString()} <span className="text-xs font-normal text-gray-400">FCFA</span></p>
                                                    </div>
                                                    {pr.purchase_price !== undefined && (
                                                        <div>
                                                            <p className="text-xs text-gray-400 mb-0.5">Prix d&apos;achat</p>
                                                            <p className="font-bold text-gray-900">{pr.purchase_price.toLocaleString()} <span className="text-xs font-normal text-gray-400">FCFA</span></p>
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => setEditingPrice(pr.id)}
                                                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:border-primary hover:text-primary transition-colors"
                                                >
                                                    <Edit3 size={14} /> Modifier
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* ── LOTS CARD ── */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                            <FlaskConical size={18} className="text-violet-500" />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900">Lots associés</h2>
                            <p className="text-xs text-gray-400">{lots.length} lot(s) trouvé(s)</p>
                        </div>
                    </div>

                    {lots.length === 0 ? (
                        <div className="px-6 py-12 text-center text-gray-400">
                            <FlaskConical size={40} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Aucun lot associé à ce produit.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {lots.map(lot => {
                                const isEditing = editingLot === lot.id;
                                return (
                                    <div key={lot.id} className="px-6 py-5">
                                        {/* Lot header */}
                                        <div className="flex items-start justify-between gap-4 mb-4">
                                            <div className="flex items-center gap-3">
                                                <Hash size={14} className="text-gray-400 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm">{lot.batch_number || '—'}</p>
                                                    {lot.supplier_detail && (
                                                        <p className="text-xs text-gray-400">{lot.supplier_detail.name}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${LOT_STATUS_COLORS[lot.status] || 'bg-gray-100 text-gray-600'}`}>
                                                    {LOT_STATUS_LABELS[lot.status] || lot.status}
                                                </span>
                                                {!isEditing && (
                                                    <button
                                                        onClick={() => setEditingLot(lot.id)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:border-primary hover:text-primary transition-colors"
                                                    >
                                                        <Edit3 size={13} /> Modifier
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {isEditing ? (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <Field label="Numéro de lot">
                                                        <input
                                                            className={inputCls}
                                                            value={lotForms[lot.id]?.batch_number ?? ''}
                                                            onChange={e => setLotForms(f => ({ ...f, [lot.id]: { ...f[lot.id], batch_number: e.target.value } }))}
                                                        />
                                                    </Field>
                                                    <Field label="Date d'expiration">
                                                        <input
                                                            type="date"
                                                            className={inputCls}
                                                            value={lotForms[lot.id]?.expiration_date ?? ''}
                                                            onChange={e => setLotForms(f => ({ ...f, [lot.id]: { ...f[lot.id], expiration_date: e.target.value } }))}
                                                        />
                                                    </Field>
                                                    <Field label="Quantité">
                                                        <input
                                                            type="number"
                                                            className={inputCls}
                                                            value={lotForms[lot.id]?.quantity ?? ''}
                                                            onChange={e => setLotForms(f => ({ ...f, [lot.id]: { ...f[lot.id], quantity: e.target.value } }))}
                                                        />
                                                    </Field>
                                                    <Field label="Prix d'achat">
                                                        <input
                                                            type="number"
                                                            className={inputCls}
                                                            value={lotForms[lot.id]?.purchase_price ?? ''}
                                                            onChange={e => setLotForms(f => ({ ...f, [lot.id]: { ...f[lot.id], purchase_price: e.target.value } }))}
                                                        />
                                                    </Field>
                                                    <Field label="Statut">
                                                        <select
                                                            className={inputCls}
                                                            value={lotForms[lot.id]?.status ?? 'AVAILABLE'}
                                                            onChange={e => setLotForms(f => ({ ...f, [lot.id]: { ...f[lot.id], status: e.target.value as PharmacistLot['status'] } }))}
                                                        >
                                                            <option value="AVAILABLE">Disponible</option>
                                                            <option value="RESERVED">Réservé</option>
                                                            <option value="EXPIRED">Expiré</option>
                                                            <option value="OUT_OF_STOCK">Rupture de stock</option>
                                                        </select>
                                                    </Field>
                                                </div>
                                                <div className="flex gap-2 pt-1">
                                                    <button
                                                        onClick={() => handleSaveLot(lot.id)}
                                                        disabled={savingLot === lot.id}
                                                        className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
                                                    >
                                                        {savingLot === lot.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                        Enregistrer le lot
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingLot(null)}
                                                        className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                                    >
                                                        Annuler
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            // Read-only summary
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                <div className="bg-gray-50 rounded-xl p-3">
                                                    <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                                                        <Calendar size={11} /> Exp.
                                                    </p>
                                                    <p className="font-semibold text-gray-800 text-sm">{lot.expiration_date || '—'}</p>
                                                </div>
                                                <div className="bg-gray-50 rounded-xl p-3">
                                                    <p className="text-xs text-gray-400 mb-0.5">Quantité</p>
                                                    <p className="font-semibold text-gray-800 text-sm">{lot.quantity}</p>
                                                </div>
                                                <div className="bg-gray-50 rounded-xl p-3">
                                                    <p className="text-xs text-gray-400 mb-0.5">Réservé</p>
                                                    <p className="font-semibold text-gray-800 text-sm">{lot.reserved_quantity}</p>
                                                </div>
                                                <div className="bg-gray-50 rounded-xl p-3">
                                                    <p className="text-xs text-gray-400 mb-0.5">P. achat</p>
                                                    <p className="font-semibold text-gray-800 text-sm">
                                                        {lot.purchase_price ? `${Number(lot.purchase_price).toLocaleString()} F` : '—'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

            </main>
        </div>
    );
}
