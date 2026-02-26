"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/context/CartContext';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { api } from '@/lib/api-client';

const CartPage = () => {
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated } = useAuthGuard();
  const { items, cartTotal, loading, removeItem, updateQuantity, refreshCart } = useCart();
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{ orderId: string } | null>(null);

  useEffect(() => setMounted(true), []);

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
      
      const formData = new FormData();
      const cartId = items[0]?.cart_id || "current-cart"; 
      
      formData.append('cart_id', cartId);
      if (prescriptionFile) {
        formData.append('prescription', prescriptionFile);
      }

      const result = await api.createOrder(formData);

      // Show success modal and clear the cart
      setOrderSuccess({ orderId: result.order_id });
      localStorage.removeItem('local_cart');
      await refreshCart(); // Cart is now empty after order creation

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-display">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Mon Panier</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 text-sm">Chargement du panier...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                <span className="material-symbols-outlined text-5xl text-gray-300 mb-4 block">shopping_cart</span>
                <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">Votre panier est vide</h2>
                <p className="text-sm text-gray-500 mb-6">Découvrez nos produits et commencez vos achats</p>
                <Link href="/" className="inline-block px-6 py-2 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary/90 transition-all">
                  Découvrir les produits
                </Link>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4">
                  {/* Product Image */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0 flex items-center justify-center">
                    {item.product?.image ? (
                      <Image
                        src={item.product.image}
                        alt={item.product_name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-2xl text-gray-400">medication</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-white truncate">{item.product_name}</h3>
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
                    <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 rounded-md transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">remove</span>
                      </button>
                      <span className="font-bold w-4 text-center">{item.quantity}</span>
                      <button 
                         onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 rounded-md transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                      </button>
                    </div>
                    <button 
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 text-xs font-semibold flex items-center gap-1 hover:underline"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      Retirer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Summary & Checkout */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold mb-4">Récapitulatif</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Sous-total</span>
                  <span>{cartTotal.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Frais de service</span>
                  <span>Gratuit</span>
                </div>
                <hr className="border-gray-100 dark:border-gray-700" />
                <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
                  <span>Total</span>
                  <span className="text-primary">{cartTotal.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>

              {/* Prescription Upload */}
              <div className="mb-6">
                <label className="block text-xs font-bold mb-2">Ordonnance (Optionnelle)</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    accept="image/*,.pdf"
                  />
                  <div className={`p-4 border-2 border-dashed rounded-xl text-center transition-all ${prescriptionFile ? 'border-primary bg-primary/5' : 'border-gray-200 group-hover:border-primary'}`}>
                    <span className="material-symbols-outlined text-3xl text-primary mb-2">
                        {prescriptionFile ? 'check_circle' : 'upload_file'}
                    </span>
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
                {checkingOut ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <span className="material-symbols-outlined text-lg">shopping_bag</span>
                )}
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
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 max-w-md w-full animate-[slideUp_0.4s_ease-out] text-center relative overflow-hidden">
            {/* Confetti-style decorative dots */}
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

            {/* Success icon */}
            <div className="relative z-10">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-5xl!">check_circle</span>
              </div>

              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                Commande réussie ! 🎉
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                Votre commande a été passée avec succès.
              </p>
              <div className="inline-block px-4 py-2 bg-primary/10 rounded-xl mb-6">
                <span className="text-xs text-gray-500">N° de commande :</span>
                <span className="block text-sm font-bold text-primary">{orderSuccess.orderId}</span>
              </div>

              <div className="space-y-3">
                <Link
                  href={`/orders`}
                  className="block w-full py-3 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl hover:translate-y-[-2px] transition-all text-center"
                >
                  <span className="material-symbols-outlined text-lg! align-middle mr-1">receipt_long</span>
                  Voir ma commande
                </Link>
                <Link
                  href="/"
                  className="block w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-center"
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

