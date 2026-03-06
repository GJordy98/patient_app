"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/context/CartContext';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { api } from '@/lib/api-client';
import {
  ShoppingCart, Pill, Minus, Plus, Trash2, CheckCircle,
  Upload, ShoppingBag, ClipboardList, Loader2,
  MapPin, Navigation, AlertCircle,
} from 'lucide-react';

const CartPage = () => {
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated } = useAuthGuard();
  const { items, cartTotal, loading, removeItem, updateQuantity, refreshCart } = useCart();
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{ orderId: string } | null>(null);

  // Localisation de livraison
  type LocationMode = 'auto' | 'manual';
  const [locationMode, setLocationMode] = useState<LocationMode>('auto');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [coords, setCoords] = useState<{ lat: string; lng: string } | null>(null);
  const [manualCoords, setManualCoords] = useState('');

  useEffect(() => setMounted(true), []);

  const detectGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }
    setGpsLoading(true);
    setGpsError('');
    setCoords(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        });
        setGpsLoading(false);
      },
      () => {
        setGpsError('Impossible de récupérer votre position. Vérifiez les autorisations.');
        setGpsLoading(false);
      },
      { timeout: 10000 }
    );
  };

  const getDeliveryCoords = (): { lat: string; lng: string } | null => {
    if (locationMode === 'auto') return coords;
    const parts = manualCoords.split(',').map((s) => s.trim());
    if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
      return { lat: parts[0], lng: parts[1] };
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPrescriptionFile(e.target.files[0]);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      alert("Votre panier est vide");
      return;
    }

    try {
      setCheckingOut(true);

      const deliveryCoords = getDeliveryCoords();
      if (!deliveryCoords) {
        alert(locationMode === 'auto'
          ? 'Veuillez d\'abord localiser votre position GPS ou passer en saisie manuelle.'
          : 'Veuillez saisir des coordonnées valides (ex: 4.052449, 9.767426).'
        );
        setCheckingOut(false);
        return;
      }

      const formData = new FormData();
      const cartId = items[0]?.cart_id || "current-cart";
      formData.append('cart_id', cartId);
      formData.append('latitude', deliveryCoords.lat);
      formData.append('longitude', deliveryCoords.lng);
      if (prescriptionFile) {
        formData.append('prescription', prescriptionFile);
      }

      const result = await api.createOrder(formData);
      setOrderSuccess({ orderId: result.order_id });
      localStorage.removeItem('local_cart');
      await refreshCart();
    } catch (error: unknown) {
      console.error("Checkout error:", error);
      const message = error instanceof Error ? error.message : "Erreur lors de la commande";
      alert(message);
    } finally {
      setCheckingOut(false);
    }
  };

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6 text-[#1E293B]">Mon Panier</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center py-20 bg-white rounded-2xl shadow-sm border border-gray-200">
                <Loader2 size={36} className="text-primary animate-spin mb-4" />
                <p className="text-gray-500 text-sm">Chargement du panier...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-200">
                <ShoppingCart size={48} className="text-gray-300 mb-4 mx-auto" />
                <h2 className="text-lg font-bold text-gray-700 mb-2">Votre panier est vide</h2>
                <p className="text-sm text-gray-500 mb-6">Découvrez nos produits et commencez vos achats</p>
                <Link href="/" className="inline-block px-6 py-2 bg-primary text-white font-bold rounded-xl text-sm hover:bg-[#16A34A] transition-all">
                  Découvrir les produits
                </Link>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                  {/* Product Image */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                    {item.product?.image ? (
                      <Image
                        src={item.product.image}
                        alt={item.product_name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Pill size={24} className="text-gray-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{item.product_name}</h3>
                    {item.product?.dci && (
                      <p className="text-xs text-gray-400 truncate">{item.product.dci}</p>
                    )}
                    <p className="text-sm text-gray-500">{item.pharmacy_name}</p>
                    <p className="font-bold text-primary mt-1">
                      {item.price > 0
                        ? `${item.price.toLocaleString('fr-FR')} FCFA`
                        : <span className="text-xs font-normal text-gray-400 italic">Inclus dans le total</span>
                      }
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-3 bg-gray-100 p-1 rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-bold w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 text-xs font-semibold flex items-center gap-1 hover:underline"
                    >
                      <Trash2 size={13} />
                      Retirer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Summary & Checkout */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold mb-4 text-[#1E293B]">Récapitulatif</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Sous-total</span>
                  <span>{cartTotal.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Frais de service</span>
                  <span>Gratuit</span>
                </div>
                <hr className="border-gray-100" />
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-primary">{cartTotal.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>

              {/* Localisation de livraison */}
              <div className="mb-5">
                <label className="block text-xs font-bold mb-2 text-[#1E293B] flex items-center gap-1.5">
                  <MapPin size={13} className="text-primary" />
                  Adresse de livraison <span className="text-red-500">*</span>
                </label>

                {/* Toggle auto / manuel */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => { setLocationMode('auto'); setGpsError(''); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${locationMode === 'auto'
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-primary'
                      }`}
                  >
                    <Navigation size={12} /> GPS automatique
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLocationMode('manual'); setGpsError(''); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${locationMode === 'manual'
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-primary'
                      }`}
                  >
                    <MapPin size={12} /> Saisie manuelle
                  </button>
                </div>

                {/* Mode GPS automatique */}
                {locationMode === 'auto' && (
                  <div>
                    <button
                      type="button"
                      onClick={detectGPS}
                      disabled={gpsLoading}
                      className="w-full py-2.5 border-2 border-dashed border-primary/40 rounded-xl text-xs font-semibold text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {gpsLoading
                        ? <><Loader2 size={13} className="animate-spin" /> Localisation en cours…</>
                        : <><Navigation size={13} /> Utiliser ma position actuelle</>
                      }
                    </button>
                    {coords && (
                      <div className="mt-2 flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <CheckCircle size={13} className="text-green-600 shrink-0" />
                        <span className="text-[11px] text-green-700 font-medium">
                          Position détectée : {coords.lat}, {coords.lng}
                        </span>
                      </div>
                    )}
                    {gpsError && (
                      <div className="mt-2 flex items-start gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
                        <span className="text-[11px] text-red-600">{gpsError}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Mode manuel */}
                {locationMode === 'manual' && (
                  <div>
                    <input
                      type="text"
                      value={manualCoords}
                      onChange={(e) => setManualCoords(e.target.value)}
                      placeholder="ex: 4.052449, 9.767426"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <p className="mt-1.5 text-[11px] text-gray-400">
                      Entrez la latitude et la longitude séparées par une virgule.
                    </p>
                    {manualCoords && (() => {
                      const parts = manualCoords.split(',').map(s => s.trim());
                      const valid = parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]));
                      return valid ? (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <CheckCircle size={12} className="text-green-600" />
                          <span className="text-[11px] text-green-600 font-medium">Coordonnées valides</span>
                        </div>
                      ) : (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <AlertCircle size={12} className="text-red-500" />
                          <span className="text-[11px] text-red-500">Format invalide — utilisez: latitude, longitude</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Prescription Upload */}
              <div className="mb-6">
                <label className="block text-xs font-bold mb-2 text-[#1E293B]">Ordonnance (Optionnelle)</label>
                <div className="relative group">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    accept="image/*,.pdf"
                  />
                  <div className={`p-4 border-2 border-dashed rounded-xl text-center transition-all ${prescriptionFile ? 'border-primary bg-primary/5' : 'border-gray-200 group-hover:border-primary'}`}>
                    {prescriptionFile
                      ? <CheckCircle size={28} className="text-primary mx-auto mb-2" />
                      : <Upload size={28} className="text-primary mx-auto mb-2" />
                    }
                    <p className="text-xs text-gray-500 leading-tight">
                      {prescriptionFile ? prescriptionFile.name : 'Cliquez ou glissez pour téléverser votre ordonnance'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={checkingOut || items.length === 0}
                className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:translate-y-[-2px] active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {checkingOut
                  ? <Loader2 size={18} className="animate-spin" />
                  : <ShoppingBag size={18} />
                }
                <span className="text-sm">Passer la commande</span>
              </button>

              {!prescriptionFile && items.length > 0 && (
                <p className="text-[10px] text-center text-gray-400 mt-2">
                  Vous pouvez ajouter une ordonnance si nécessaire
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* ========== Order Success Modal ========== */}
      {orderSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center relative overflow-hidden">
            {/* Decorative dots */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-ping"
                  style={{
                    backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][i % 6],
                    top: `${10 + Math.random() * 80}%`,
                    left: `${5 + Math.random() * 90}%`,
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: `${1.5 + Math.random()}s`,
                    opacity: 0.6
                  }}
                />
              ))}
            </div>

            <div className="relative z-10">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                <CheckCircle size={44} className="text-green-600" />
              </div>

              <h2 className="text-2xl font-black text-gray-900 mb-2">
                Commande réussie ! 🎉
              </h2>
              <p className="text-gray-600 text-sm mb-2">
                Votre commande a été passée avec succès.
              </p>
              <div className="inline-block px-4 py-2 bg-primary/10 rounded-xl mb-6">
                <span className="text-xs text-gray-500">N° de commande :</span>
                <span className="block text-sm font-bold text-primary">{orderSuccess.orderId}</span>
              </div>

              <div className="space-y-3">
                <Link
                  href="/orders"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl hover:translate-y-[-2px] transition-all text-center"
                >
                  <ClipboardList size={16} />
                  Voir ma commande
                </Link>
                <Link
                  href="/"
                  className="block w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all text-center"
                >
                  Continuer mes achats
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
