"use client";

import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { useCart } from '@/context/CartContext';
import { api } from '@/lib/api-client';
import { Pharmacy } from '@/types/common';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// Mock medication data for demo
const MOCK_MEDICATION = {
  id: 'doliprane-1000',
  name: 'Doliprane 1000mg',
  subtitle: '8 comprimés, Paracétamol',
  category: 'Antalgique',
  price: 1075,
  description: "Ce médicament est un antalgique (il calme la douleur) et un antipyrétique (il fait baisser la fièvre). Il est indiqué en cas de douleur et/ou fièvre telles que maux de tête, états grippaux, douleurs dentaires, courbatures, règles douloureuses.",
  dosage: "Cette présentation est réservée à l'adulte et à l'enfant à partir de 50 kg (environ 15 ans). La posologie usuelle est de 1 comprimé à 1000 mg par prise, à renouveler au bout de 6 à 8 heures. En cas de besoin, la prise peut être renouvelée au bout de 4 heures minimum.",
  image: ''
};

export default function MedicationDetailsPage() {
  const params = useParams();
  const { addItem } = useCart();

  const [medication] = useState(MOCK_MEDICATION);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const loadPharmacies = async () => {
      try {
        const data = await api.getAllPharmacies();
        const results = Array.isArray(data) ? data : data.results || [];
        setPharmacies(results.slice(0, 5));
        if (results.length > 0) {
          setSelectedPharmacy(results[0].id);
        }
      } catch {
        setPharmacies([]);
      }
    };
    loadPharmacies();
  }, [params.id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleAddToCart = async () => {
    setAdding(true);
    try {
      addItem(medication.id, selectedPharmacy || 'default', 1, {
        id: medication.id,
        name: medication.name,
        price: medication.price
      });
      showToast('Produit ajouté au panier');
    } catch {
      showToast('Erreur lors de l\'ajout');
    } finally {
      setTimeout(() => setAdding(false), 1500);
    }
  };

  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
    showToast(isFavorite ? 'Retiré des favoris' : 'Ajouté aux favoris ❤️');
  };

  return (
    <>
      <Header />

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-white shadow-lg rounded-lg p-4 flex items-center gap-3 animate-slide-down border border-gray-100">
          <span className="material-symbols-outlined text-primary">check_circle</span>
          <span className="text-sm font-medium text-gray-900">{toast}</span>
        </div>
      )}

      <main className="min-h-screen bg-gray-50 pt-6 pb-20">
        <div className="container mx-auto px-4 max-w-6xl">

          {/* Back Button */}
          <button onClick={() => window.history.back()} className="flex items-center gap-2 text-gray-500 hover:text-primary mb-4 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="font-medium">Retour</span>
          </button>

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
                <span className="material-symbols-outlined text-gray-200 text-[120px]!">medication</span>
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
                    <span className="material-symbols-outlined text-primary text-base!">medication</span>
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
                    <span className="material-symbols-outlined">shopping_cart</span>
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
                    <span className="material-symbols-outlined">{isFavorite ? 'favorite' : 'favorite_border'}</span>
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
                              {isSelected && <span className="material-symbols-outlined text-base!">check_circle</span>}
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
        </div>
      </main>
    </>
  );
}
