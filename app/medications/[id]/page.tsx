"use client";

import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { useCart } from '@/context/CartContext';
import { api } from '@/lib/api-client';
import { Pharmacy } from '@/types/common';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, ArrowLeft, Pill, ShoppingCart, Heart, HeartOff } from 'lucide-react';

export default function MedicationDetailsPage() {
  const params = useParams();
  const { addItem } = useCart();

  const [medication, setMedication] = useState<{ id: string; name: string; subtitle?: string; category?: string; price: number; description?: string; dosage?: string; image?: string } | null>(null);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const id = params.id as string;
    const load = async () => {
      // Chercher le produit par son id/slug
      try {
        const { results } = await api.searchProducts(id);
        if (results.length > 0) {
          const first = results[0];
          const p = first.product;
          setMedication({
            id: String(p?.id ?? id),
            name: p?.name ?? id,
            subtitle: p?.galenic,
            category: typeof p?.category === 'object' && p?.category !== null ? p.category.name : p?.category,
            price: first.sale_price || first.price || 0,
            image: p?.image,
          });
        }
      } catch {
        // produit non trouvé — on reste null
      }
      // Charger les pharmacies associées
      try {
        const data = await api.getAllPharmacies();
        const results = Array.isArray(data) ? data : data.results || [];
        setPharmacies(results.slice(0, 5));
        if (results.length > 0) setSelectedPharmacy(results[0].id);
      } catch {
        setPharmacies([]);
      }
    };
    load();
  }, [params.id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleAddToCart = async () => {
    if (!medication) return;
    setAdding(true);
    try {
      addItem(medication.id, selectedPharmacy || 'default', 1, {
        id: medication.id,
        name: medication.name,
        price: medication.price
      });
      showToast('Produit ajouté au panier');
    } catch {
      showToast("Erreur lors de l'ajout");
    } finally {
      setTimeout(() => setAdding(false), 1500);
    }
  };

  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
    showToast(isFavorite ? 'Retiré des favoris' : 'Ajouté aux favoris');
  };

  return (
    <>
      <Header />

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-white shadow-lg rounded-lg p-4 flex items-center gap-3 animate-slide-down border border-gray-100">
          <CheckCircle size={20} className="text-primary" />
          <span className="text-sm font-medium text-gray-900">{toast}</span>
        </div>
      )}

      <main className="min-h-screen bg-gray-50 pt-6 pb-20">
        <div className="container mx-auto px-4 max-w-6xl">

          {/* Back Button */}
          <button onClick={() => window.history.back()} className="flex items-center gap-2 text-gray-500 hover:text-primary mb-4 transition-colors">
            <ArrowLeft size={18} />
            <span className="font-medium">Retour</span>
          </button>

          {!medication ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <Pill size={52} className="mb-4 opacity-30" />
              <p className="text-lg font-semibold">Produit introuvable</p>
            </div>
          ) : (<>

          {/* Breadcrumb */}
          <nav className="text-sm text-gray-500 mb-6">
            <Link href="/" className="hover:text-primary">Médicaments</Link>
            <span className="mx-2">/</span>
            <span className="font-medium text-gray-900">{medication.name}</span>
          </nav>

          {/* Product Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

            {/* Left Column */}
            <div className="space-y-6">
              {/* Product Image */}
              <div className="bg-white rounded-xl p-8 flex justify-center items-center shadow-sm border border-gray-100 min-h-[300px]">
                <Pill size={120} className="text-gray-200" />
              </div>

              {/* Description */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-3">Description</h2>
                <p className="text-gray-600 leading-relaxed">{medication.description}</p>
              </div>

              {/* Dosage */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-3">Posologie</h2>
                <p className="text-gray-600 leading-relaxed">{medication.dosage}</p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">

              {/* Product Info Card */}
              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{medication.name}</h1>
                    <p className="text-gray-500 mt-1">{medication.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-lg shrink-0">
                    <Pill size={16} className="text-primary" />
                    <span className="text-xs font-semibold text-primary">{medication.category}</span>
                  </div>
                </div>

                <div className="my-6">
                  <span className="text-3xl font-bold text-primary">{medication.price.toLocaleString()} FCFA</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleAddToCart}
                    disabled={adding}
                    className="flex-1 h-12 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <ShoppingCart size={18} />
                    <span>{adding ? 'Ajouté ✓' : 'Ajouter au panier'}</span>
                  </button>
                  <button
                    onClick={handleFavorite}
                    className={`h-12 w-12 rounded-lg flex items-center justify-center transition-all ${
                      isFavorite
                        ? 'bg-red-50 text-red-500 hover:bg-red-100'
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                  >
                    {isFavorite
                      ? <Heart size={20} className="fill-red-500" />
                      : <HeartOff size={20} />
                    }
                  </button>
                </div>
              </div>

              {/* Pharmacies List */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Pharmacies disponibles</h2>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {pharmacies.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">Chargement des pharmacies...</p>
                  ) : (
                    pharmacies.map(pharmacy => {
                      const isSelected = selectedPharmacy === pharmacy.id;
                      return (
                        <div
                          key={pharmacy.id}
                          className={`p-4 rounded-lg transition-all cursor-pointer ${
                            isSelected
                              ? 'border-2 border-primary bg-white'
                              : 'border border-gray-200 bg-gray-50 hover:border-primary'
                          }`}
                          onClick={() => setSelectedPharmacy(pharmacy.id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-900">{pharmacy.name}</h3>
                              <p className="text-xs text-gray-500">{pharmacy.address || pharmacy.quartier}</p>
                              <p className="text-sm font-semibold text-primary mt-1">En stock</p>
                              <Link
                                href={`/pharmacies/${pharmacy.id}`}
                                className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                              >
                                Voir les détails de la pharmacie
                              </Link>
                            </div>
                            <button
                              className={`h-9 px-4 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1 ${
                                isSelected
                                  ? 'bg-primary text-white hover:bg-primary/90'
                                  : 'bg-primary/10 text-primary hover:bg-primary/20'
                              }`}
                            >
                              {isSelected && <CheckCircle size={16} />}
                              {isSelected ? 'Sélectionnée' : 'Choisir'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
          </>)}
        </div>
      </main>
    </>
  );
}
