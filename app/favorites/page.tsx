"use client";

import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/context/CartContext';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { ArrowLeft, Pill, HeartOff, Heart, Star, CheckCircle } from 'lucide-react';

interface FavoriteItem {
  id: string;
  name: string;
  description: string;
  price: number;
  rating: number;
  image?: string;
  pharmacyId?: string;
}

export default function FavoritesPage() {
  useAuthGuard();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
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

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={14}
        className={i < rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
      />
    ));

  return (
    <>
      <Header />

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-white shadow-lg rounded-lg p-4 flex items-center gap-3 animate-slide-down border border-gray-100">
          <CheckCircle size={18} className="text-primary" />
          <span className="text-sm font-medium text-gray-900">{toast}</span>
        </div>
      )}

      <main className="min-h-screen bg-[#F8FAFC] pt-6 pb-20">
        <div className="container mx-auto px-4 max-w-6xl">

          <button onClick={() => window.history.back()} className="flex items-center gap-2 text-gray-500 hover:text-primary mb-6 transition-colors">
            <ArrowLeft size={18} />
            <span className="font-medium">Retour</span>
          </button>

          <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Mes Favoris</h1>

          {favorites.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <HeartOff size={56} className="mx-auto mb-4 opacity-30" />
              <p className="text-xl font-bold mb-2">Aucun favori</p>
              <p className="text-sm">Ajoutez des produits à vos favoris pour les retrouver ici.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {favorites.map(item => (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all group">
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    <Pill size={52} className="text-gray-300" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 mb-1">{item.name}</h3>
                    <p className="text-sm text-gray-500 mb-2">{item.description}</p>
                    <div className="flex mb-2">{renderStars(item.rating)}</div>
                    <p className="text-lg font-bold text-primary mb-3">{item.price.toLocaleString()} FCFA</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="flex-1 h-9 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-[#16A34A] transition-all"
                      >
                        Ajouter
                      </button>
                      <button
                        onClick={() => removeFavorite(item.id)}
                        className="h-9 w-9 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-all"
                      >
                        <Heart size={16} className="fill-red-400" />
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
