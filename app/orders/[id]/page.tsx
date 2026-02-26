"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api-client';
import { Order, OrderItem } from '@/types/order';

const TrackingMap = dynamic(() => import('@/components/orders/TrackingMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[350px] md:h-[400px] rounded-2xl bg-gray-100 dark:bg-gray-700 animate-pulse flex items-center justify-center">
      <span className="material-symbols-outlined text-gray-300 dark:text-gray-500 text-5xl">map</span>
    </div>
  ),
});

/* ─── 3-Step Timeline ─── */
const getStepIndex = (status: string): number => {
  const s = status?.toUpperCase();
  if (['PENDING', 'CONFIRMED', 'PROCESSING'].includes(s)) return 0;
  if (['IN_PICKUP', 'DELIVERY', 'ARRIVED'].includes(s)) return 1;
  if (['DELIVERED', 'COMPLETED'].includes(s)) return 2;
  return 0;
};

const Timeline = ({ status }: { status: string }) => {
  const steps = [
    { label: 'Validé', icon: '✓', activeColor: 'from-orange-400 to-orange-500' },
    { label: 'En route', icon: '🚚', activeColor: 'from-blue-400 to-blue-500' },
    { label: 'Livré', icon: '📦', activeColor: 'from-green-400 to-green-500' },
  ];
  const currentStep = getStepIndex(status);

  return (
    <div className="flex items-center justify-between p-4 bg-linear-to-r from-gray-50 to-green-50/50 dark:from-gray-700 dark:to-gray-700 rounded-2xl">
      {steps.map((step, i) => {
        const isCompleted = i < currentStep;
        const isActive = i === currentStep;
        const isReached = isCompleted || isActive;
        return (
          <React.Fragment key={step.label}>
            <div className="flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-md transition-all ${
                  isReached
                    ? `bg-linear-to-br ${step.activeColor} text-white ${isActive ? 'ring-4 ring-primary/30 animate-pulse-slow' : ''}`
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-400'
                }`}
              >
                {step.icon}
              </div>
              <p className={`text-xs mt-2 font-semibold ${isReached ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'}`}>
                {step.label}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-1 rounded-full mx-2 -mt-4 transition-all ${
                  i < currentStep ? `bg-linear-to-r ${step.activeColor}` : 'bg-gray-200 dark:bg-gray-600'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ─── Dispute Modal ─── */
const DisputeModal = ({ orderId, onClose, onSuccess }: { orderId: string; onClose: () => void; onSuccess: (msg: string) => void }) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !description.trim()) return;

    setSubmitting(true);
    try {
      await api.reportDispute(orderId, reason, description, photo || undefined);
      onSuccess('✓ Votre signalement a été transmis au support');
      onClose();
    } catch {
      onSuccess('Erreur lors de l\'envoi du signalement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-lg w-full p-8 shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-linear-to-r from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-800/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-500 text-2xl">feedback</span>
            </div>
            <h3 className="text-xl font-bold bg-linear-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">
              Signaler un problème
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all">
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Info */}
        <div className="mb-5 p-4 bg-linear-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 rounded-xl border border-amber-200 dark:border-amber-700">
          <p className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
            <span className="material-symbols-outlined text-lg">info</span>
            <span>Nous prenons vos retours très au sérieux. Décrivez votre problème et nous vous répondrons rapidement.</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Reason */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Raison du signalement</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all bg-white dark:bg-gray-700"
            >
              <option value="">Sélectionnez une raison</option>
              <option value="WRONG_PRODUCT">Produit incorrect</option>
              <option value="DAMAGED">Produit endommagé</option>
              <option value="MISSING_ITEMS">Articles manquants</option>
              <option value="LATE_DELIVERY">Livraison en retard</option>
              <option value="QUALITY_ISSUE">Problème de qualité</option>
              <option value="OTHER">Autre</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Description détaillée</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              rows={4}
              placeholder="Décrivez le problème en détail..."
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all resize-none bg-white dark:bg-gray-700"
            />
          </div>

          {/* Photo */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Photo justificative (optionnel)</label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full py-3 px-4 border-2 border-blue-500 text-blue-500 rounded-xl font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">upload_file</span>
              {photo ? photo.name : 'Choisir un fichier'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) setPhoto(e.target.files[0]); }} />
            {photo && (
              <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-700 flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600">check_circle</span>
                <span className="text-sm font-semibold text-green-700 dark:text-green-400 flex-1 truncate">{photo.name}</span>
                <button type="button" onClick={() => setPhoto(null)} className="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-lg">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 border-2 border-gray-300 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-4 bg-linear-to-r from-amber-500 to-amber-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined">send</span>
                  Envoyer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Status Label Helper ─── */
const statusLabels: Record<string, { label: string; gradient: string; icon: string }> = {
  'PENDING':    { label: 'Validé',         gradient: 'from-orange-400 to-orange-500', icon: 'check_circle' },
  'CONFIRMED':  { label: 'Confirmée',      gradient: 'from-blue-400 to-blue-500',     icon: 'check_circle' },
  'PROCESSING': { label: 'En préparation', gradient: 'from-purple-400 to-purple-500', icon: 'autorenew' },
  'DELIVERY':   { label: 'En livraison',   gradient: 'from-blue-500 to-blue-600',     icon: 'local_shipping' },
  'IN_PICKUP':  { label: 'Récupération',   gradient: 'from-teal-400 to-teal-500',     icon: 'shopping_bag' },
  'COMPLETED':  { label: 'Terminée',       gradient: 'from-green-500 to-green-600',   icon: 'done_all' },
  'DELIVERED':  { label: 'Livrée',         gradient: 'from-green-400 to-green-500',   icon: 'check_circle' },
  'CANCELLED':  { label: 'Annulée',        gradient: 'from-red-400 to-red-500',       icon: 'cancel' },
};

/* ─── QR Code Modal ─── */
const QrCodeModal = ({ orderId, onClose }: { orderId: string; onClose: () => void }) => {
  const [qrData, setQrData] = useState<{ qr_code?: string; qr_code_url?: string; image?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getOrderQrCode(orderId)
      .then(setQrData)
      .catch(() => setError('Impossible de charger le QR code.'))
      .finally(() => setLoading(false));
  }, [orderId]);

  const qrSrc = qrData?.qr_code_url || qrData?.image || (qrData?.qr_code ? `data:image/png;base64,${qrData.qr_code}` : null);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-sm w-full p-8 shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">QR Code de livraison</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex flex-col items-center gap-4">
          {loading && <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />}
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {qrSrc && !loading && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrSrc} alt="QR Code commande" className="w-48 h-48 object-contain rounded-xl border border-gray-200" />
          )}
          {!qrSrc && !loading && !error && qrData?.qr_code && (
            <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 w-full text-center">
              <p className="text-xs text-gray-500 mb-2">Code de livraison</p>
              <p className="font-mono text-lg font-bold text-gray-900 dark:text-white tracking-widest break-all">{qrData.qr_code}</p>
            </div>
          )}
          <p className="text-xs text-gray-500 text-center">Présentez ce QR code au livreur lors de la réception.</p>
        </div>
        <button onClick={onClose} className="mt-6 w-full py-3 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-200 transition-all">
          Fermer
        </button>
      </div>
    </div>
  );
};

/* ─── Rating Modal ─── */
const RatingModal = ({ orderId, deliveryId, onClose, onSuccess }: { orderId: string; deliveryId?: string; onClose: () => void; onSuccess: (msg: string) => void }) => {
  const [orderRating, setOrderRating] = useState(0);
  const [orderComment, setOrderComment] = useState('');
  const [driverRating, setDriverRating] = useState(0);
  const [driverComment, setDriverComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const StarRow = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button" onClick={() => onChange(s)} className={`text-2xl transition-transform hover:scale-110 ${s <= value ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
      ))}
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (orderRating > 0) {
        await api.rateOrder({ order_id: orderId, rating: orderRating, comment: orderComment || undefined });
      }
      if (driverRating > 0 && deliveryId) {
        await api.reviewDriver({ delivery_id: deliveryId, rating: driverRating, comment: driverComment || undefined });
      }
      onSuccess('✓ Merci pour votre évaluation !');
      onClose();
    } catch {
      onSuccess('Erreur lors de l\'envoi de l\'évaluation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-lg w-full p-8 shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Évaluer votre commande</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Commande */}
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl">
            <p className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">local_pharmacy</span>
              Officine &amp; médicaments
            </p>
            <StarRow value={orderRating} onChange={setOrderRating} />
            <textarea value={orderComment} onChange={e => setOrderComment(e.target.value)} placeholder="Votre avis (optionnel)..." rows={2}
              className="mt-3 w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm resize-none bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary focus:border-transparent" />
          </div>
          {/* Livreur */}
          {deliveryId && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
              <p className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500 text-lg">local_shipping</span>
                Livreur
              </p>
              <StarRow value={driverRating} onChange={setDriverRating} />
              <textarea value={driverComment} onChange={e => setDriverComment(e.target.value)} placeholder="Votre avis sur le livreur (optionnel)..." rows={2}
                className="mt-3 w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm resize-none bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border-2 border-gray-300 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">Annuler</button>
            <button type="submit" disabled={submitting || (orderRating === 0 && driverRating === 0)}
              className="flex-1 py-3 bg-linear-to-r from-yellow-400 to-orange-400 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span className="material-symbols-outlined">star</span>Envoyer</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Main Page ─── */
const OrderDetailsPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [showDispute, setShowDispute] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // Story 1.1 — QR Code
  const [showQr, setShowQr] = useState(false);
  // Story 1.3 — Facture
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  // Story 1.4/1.5 — Notation
  const [showRating, setShowRating] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const data = await api.getMyOrders();
        const orders = Array.isArray(data) ? data : (data.results || []);
        const foundOrder = orders.find((o) => o.id === id || (o.order_id && o.order_id === id));
        setOrder(foundOrder || null);
      } catch (error) {
        console.error('Error fetching order details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchOrder();
  }, [id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Story 1.3 — Télécharger la facture PDF
  const handleDownloadInvoice = async () => {
    if (!order) return;
    setInvoiceLoading(true);
    try {
      const invoice = await api.getInvoice(order.id);
      const blob = await api.getInvoicePdf(invoice.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture-${invoice.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('✓ Facture téléchargée');
    } catch {
      showToast('Erreur lors du téléchargement de la facture');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleConfirmReception = async () => {
    if (!order) return;
    if (!confirm('Confirmer la réception de cette commande ?')) return;

    setConfirming(true);
    try {
      await api.confirmReception(order.id);
      showToast('✓ Réception confirmée avec succès !');
      // Update local state
      setOrder(prev => prev ? { ...prev, status: 'COMPLETED' } : null);
    } catch {
      showToast('Erreur de confirmation');
    } finally {
      setConfirming(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Date inconnue';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-display">
        <Header />
        <div className="flex flex-col items-center py-40">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500">Chargement des détails de la commande...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-display">
        <Header />
        <div className="text-center py-40">
          <div className="w-24 h-24 mx-auto mb-6 bg-linear-to-br from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-800/20 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-red-500 text-5xl">error</span>
          </div>
          <h1 className="text-2xl font-bold mb-4">Commande introuvable</h1>
          <button onClick={() => router.push('/orders')} className="text-primary hover:underline font-semibold">
            Retour à mes commandes
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const status = statusLabels[order.status?.toUpperCase()] || statusLabels['PENDING'];
  const isCancelled = order.status?.toUpperCase() === 'CANCELLED';
  const canConfirm = ['DELIVERY', 'ARRIVED', 'IN_PICKUP'].includes(order.status?.toUpperCase());

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-display">
      <Header />

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-down">
          <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-4 flex items-center gap-3 border-l-4 border-primary">
            <span className="material-symbols-outlined text-primary text-2xl">check_circle</span>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{toast}</span>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back + Title */}
        <div className="mb-8">
          <button onClick={() => router.push('/orders')} className="text-sm font-semibold text-primary flex items-center gap-1 hover:underline mb-4">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Retour aux commandes
          </button>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Détails de la commande</h1>
              <p className="text-gray-500 uppercase tracking-wider text-xs font-bold mt-1">#{order.order_id || order.id}</p>
            </div>
            <div className={`px-4 py-2 rounded-full bg-linear-to-r ${status.gradient} text-white font-bold text-sm flex items-center gap-2 shadow-lg`}>
              <span className="material-symbols-outlined text-sm">{status.icon}</span>
              {status.label}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ──── Left Column ──── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timeline */}
            {!isCancelled && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">timeline</span>
                  Statut de la livraison
                </h2>
                <Timeline status={order.status} />
              </div>
            )}

            {/* Tracking Map */}
            {!isCancelled && order.pharmacy_latitude && order.pharmacy_longitude && order.patient_latitude && order.patient_longitude && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">map</span>
                  Suivi en temps réel
                </h2>
                <TrackingMap
                  pharmacyLat={order.pharmacy_latitude}
                  pharmacyLng={order.pharmacy_longitude}
                  patientLat={order.patient_latitude}
                  patientLng={order.patient_longitude}
                  status={order.status}
                />
              </div>
            )}

            {/* Items */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">shopping_bag</span>
                Articles commandés
              </h2>
              <div className="space-y-4">
                {order.items?.map((item: OrderItem, idx: number) => (
                  <div key={idx} className="flex justify-between items-center py-3 border-b border-gray-50 dark:border-gray-700 last:border-0">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{item.product_name}</p>
                      <p className="text-sm text-gray-500">Quantité: {parseFloat(String(item.quantity))}</p>
                    </div>
                    <p className="font-bold text-primary">{(parseFloat(String(item.total_price)) || 0).toLocaleString('fr-FR')} FCFA</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Prescription */}
            {order.prescription && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">description</span>
                  Ordonnance
                </h2>
                <div className="aspect-4/3 relative rounded-xl overflow-hidden bg-gray-100">
                  <Image src={order.prescription} alt="Ordonnance" className="object-contain" fill sizes="(max-width: 768px) 100vw, 50vw" />
                </div>
              </div>
            )}
          </div>

          {/* ──── Right Column ──── */}
          <div className="lg:col-span-1 space-y-6">
            {/* Total + Date */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="mb-4">
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total payé</p>
                <p className="text-2xl font-black text-primary">{(parseFloat(String(order.total_amount)) || 0).toLocaleString('fr-FR')} FCFA</p>
              </div>
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Date de commande</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{formatDate(order.created_at || order.date)}</p>
              </div>
              {order.pharmacy_name && (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700 mt-4">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Pharmacie</p>
                  <p className="font-bold text-gray-900 dark:text-white">{order.pharmacy_name}</p>
                </div>
              )}
            </div>

            {/* Reception Code */}
            {order.code_reception && !isCancelled && (
              <div className="bg-linear-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-2xl p-6 text-center">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Code de réception</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-gray-100 tracking-widest">{order.code_reception}</p>
              </div>
            )}

            {/* Actions */}
            {!isCancelled && (
              <div className="space-y-3">
                {/* Confirm Reception */}
                {canConfirm && (
                  <button
                    onClick={handleConfirmReception}
                    disabled={confirming}
                    className="w-full py-4 bg-linear-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {confirming ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span className="material-symbols-outlined">check_circle</span>
                        Confirmer la réception
                      </>
                    )}
                  </button>
                )}

                {/* Report Issue */}
                <button
                  onClick={() => setShowDispute(true)}
                  className="w-full py-4 border-2 border-amber-500 text-amber-600 dark:text-amber-400 rounded-2xl font-bold hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">feedback</span>
                  Signaler un problème
                </button>

                {/* QR Code livraison */}
                <button
                  onClick={() => setShowQr(true)}
                  className="w-full py-4 border-2 border-blue-500 text-blue-600 dark:text-blue-400 rounded-2xl font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">qr_code</span>
                  QR Code livraison
                </button>

                {/* Télécharger facture */}
                <button
                  onClick={handleDownloadInvoice}
                  disabled={invoiceLoading}
                  className="w-full py-4 border-2 border-gray-400 text-gray-600 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {invoiceLoading ? (
                    <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined">receipt_long</span>
                  )}
                  {invoiceLoading ? 'Téléchargement...' : 'Télécharger la facture'}
                </button>

                {/* Évaluer (commandes terminées) */}
                {order.status?.toUpperCase() === 'COMPLETED' && (
                  <button
                    onClick={() => setShowRating(true)}
                    className="w-full py-4 bg-linear-to-r from-yellow-400 to-orange-400 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">star</span>
                    Évaluer la commande
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Dispute Modal */}
      {showDispute && (
        <DisputeModal
          orderId={order.id}
          onClose={() => setShowDispute(false)}
          onSuccess={showToast}
        />
      )}

      {/* QR Code Modal */}
      {showQr && (
        <QrCodeModal
          orderId={order.id}
          onClose={() => setShowQr(false)}
        />
      )}

      {/* Rating Modal */}
      {showRating && (
        <RatingModal
          orderId={order.id}
          deliveryId={order.delivery_id}
          onClose={() => setShowRating(false)}
          onSuccess={showToast}
        />
      )}
    </div>
  );
};

export default OrderDetailsPage;
