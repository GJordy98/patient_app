"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api-client';
import { CatalogItem } from '@/types/common';
import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import { AlertCircle, Pill, Search, CheckCircle, ShoppingCart, Package } from 'lucide-react';

interface ProductCatalogProps {
  pharmacyId: string;
}

const ProductCatalog: React.FC<ProductCatalogProps> = ({ pharmacyId }) => {
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getPharmacyProducts(pharmacyId);
        setProducts(data);
      } catch (err) {
        console.error('Error fetching pharmacy products:', err);
        setError('Impossible de charger les produits. Veuillez vérifier que vous êtes connecté.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [pharmacyId]);

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p =>
      p.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.product?.dci?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const handleAddToCart = async (product: CatalogItem) => {
    if (!api.isAuthenticated()) {
      showToast('Veuillez vous connecter pour ajouter au panier.', 'error');
      return;
    }
    if (!api.isPatient()) {
      showToast('Cette fonctionnalité est réservée aux patients.', 'error');
      return;
    }
    const itemId = product.id;
    if (addingIds.has(itemId)) return;
    try {
      setAddingIds(prev => new Set(prev).add(itemId));
      await addItem(product.product.id, pharmacyId, 1, product.product);
      showToast(`"${product.product.name}" ajouté au panier !`, 'success');
    } catch (err) {
      console.error('Error adding to cart:', err);
      const msg = err instanceof Error ? err.message : "Erreur lors de l'ajout au panier.";
      showToast(msg, 'error');
    } finally {
      setAddingIds(prev => { const s = new Set(prev); s.delete(itemId); return s; });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-[#22C55E] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Chargement des produits...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={44} className="text-red-400 mx-auto mb-4" />
        <p className="text-red-600 font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 sm:p-8 shadow-lg border border-gray-200 animate-slide-down relative">

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-sm font-semibold animate-slide-up ${
          toastMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {toastMessage.type === 'success'
            ? <CheckCircle size={20} />
            : <AlertCircle size={20} />
          }
          {toastMessage.text}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Pill size={28} className="text-[#22C55E]" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Produits disponibles</h2>
            <p className="text-sm text-gray-600">Sélectionnez vos médicaments</p>
          </div>
        </div>
        <span className="px-4 py-2 bg-[#22C55E] text-white rounded-full text-sm font-bold shadow-sm">
          {filteredProducts.length}
        </span>
      </div>

      <div className="mb-6">
        <div className="relative">
          <div className="flex items-stretch w-full rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-primary/30 transition-all border border-gray-300">
            <div className="flex items-center justify-center px-4 bg-gray-50 rounded-l-lg border-r border-gray-300">
              <Search size={18} className="text-gray-500" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 h-12 px-4 bg-white border-0 rounded-r-lg focus:outline-none text-base text-gray-900 placeholder-gray-500"
              placeholder="Rechercher un médicament..."
            />
          </div>
        </div>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((item) => (
            <div key={item.id} className="group bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-[#22C55E] transition-all">
              <div className="relative aspect-square rounded-lg overflow-hidden mb-4 bg-white border border-gray-200">
                {item.product?.image ? (
                  <Image
                    src={item.product.image}
                    alt={item.product.name}
                    className="object-contain p-2 group-hover:scale-105 transition-transform"
                    fill
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Pill size={36} className="text-gray-300" />
                  </div>
                )}
              </div>
              <h3 className="font-bold text-gray-900 line-clamp-2 mb-1 h-12">
                {item.product?.name}
              </h3>
              <p className="text-xs text-gray-500 mb-2 truncate">
                {item.product?.dci || '-'}
              </p>
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-200">
                <span className="text-lg font-bold text-[#22C55E]">
                  {item.sale_price || item.price || 0} FCFA
                </span>
                <button
                  onClick={() => handleAddToCart(item)}
                  disabled={addingIds.has(item.id)}
                  className="w-10 h-10 rounded-full bg-[#22C55E] hover:bg-[#16A34A] text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
                  title="Ajouter au panier"
                >
                  {addingIds.has(item.id) ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ShoppingCart size={18} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Package size={56} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-600 mb-2">Aucun produit trouvé</h3>
          <p className="text-gray-500">Aucun produit ne correspond à votre recherche</p>
        </div>
      )}
    </div>
  );
};

export default ProductCatalog;
