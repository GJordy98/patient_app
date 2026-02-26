"use client";

import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/context/CartContext';
import { useAuthGuard } from '@/hooks/useAuthGuard';

interface FavoriteItem {
  id: string;
  name: string;
  description: string;
  price: number;
  rating: number;
  image?: string;
  pharmacyId?: string;
}

const MOCK_FAVORITES: FavoriteItem[] = [
  { id: '1', name: 'Boost Vitamine C', description: '1000mg, 90 comprimés', price: 6500, rating: 5 },
  { id: '2', name: 'Antidouleur Rapide', description: 'Ibuprofène 200mg', price: 3750, rating: 4 },
  { id: '3', name: 'Sirop Toux Sèche', description: '150ml, Dextromethorphan', price: 4200, rating: 4 },
  { id: '4', name: 'Crème Hydratante', description: 'Aloe Vera 200ml', price: 2800, rating: 5 },
];

export default function FavoritesPage() {
  useAuthGuard();
  const [favorites, setFavorites] = useState<FavoriteItem[]>(MOCK_FAVORITES);
  const [toast, setToast] = useState<string | null>(null);
  const { addItem } = useCart();

  const removeFavorite = (id: string) => {
    setFavorites(prev => prev.filter(f => f.id !== id));
    showToast('Retiré des favoris');
  };

  const handleAddToCart = (item: FavoriteItem) => {
    addItem(item.id, item.pharmacyId || 'default', 1, {
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image
    });
    showToast('Ajouté au panier');
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`material-symbols-outlined text-sm! ${i < rating ? 'text-amber-400' : 'text-gray-300'}`}
      >
        star
      </span>
    ));
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

          <button onClick={() => window.history.back()} className="flex items-center gap-2 text-gray-500 hover:text-primary mb-6 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="font-medium">Retour</span>
          </button>

          <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Mes Favoris</h1>

          {favorites.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <span className="material-symbols-outlined text-6xl mb-4 block">favorite_border</span>
              <p className="text-xl font-bold mb-2">Aucun favori</p>
              <p className="text-sm">Ajoutez des produits à vos favoris pour les retrouver ici.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {favorites.map(item => (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all group">
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-gray-300 text-6xl!">medication</span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 mb-1">{item.name}</h3>
                    <p className="text-sm text-gray-500 mb-2">{item.description}</p>
                    <div className="flex mb-2">{renderStars(item.rating)}</div>
                    <p className="text-lg font-bold text-primary mb-3">{item.price.toLocaleString()} FCFA</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="flex-1 h-9 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all"
                      >
                        Ajouter
                      </button>
                      <button
                        onClick={() => removeFavorite(item.id)}
                        className="h-9 w-9 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-all"
                      >
                        <span className="material-symbols-outlined text-base!">favorite</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
