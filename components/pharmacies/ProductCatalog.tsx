"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { api } from '@/lib/api-client';
import { CatalogItem } from '@/types/common';
import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import { AlertCircle, Pill, Search, CheckCircle, ShoppingCart, Package, X, Loader2 } from 'lucide-react';

interface ProductCatalogProps {
  pharmacyId: string;
}

const ProductCatalog: React.FC<ProductCatalogProps> = ({ pharmacyId }) => {
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Autocomplete search state ──
  const [currentInput, setCurrentInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  // ── Selected product IDs (for multi-select) ──
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const { addItem } = useCart();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);

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

  // ── Close suggestions on outside click ──
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ── Suggestions: filter local products by input (debounced 200ms) ──
  const [debouncedInput, setDebouncedInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedInput(currentInput), 200);
    return () => clearTimeout(timer);
  }, [currentInput]);

  const suggestions = useMemo(() => {
    if (debouncedInput.trim().length < 2) return [];
    const q = debouncedInput.toLowerCase();
    const seen = new Set<string>();
    return products
      .filter((item) => {
        const id = String(item.product?.id ?? item.id);
        if (seen.has(id)) return false;
        seen.add(id);
        if (selectedIds.includes(id)) return false;
        const name = (item.product?.name ?? '').toLowerCase();
        const dci = (item.product?.dci ?? '').toLowerCase();
        return name.includes(q) || dci.includes(q);
      })
      .slice(0, 8)
      .map((item) => ({
        id: String(item.product?.id ?? item.id),
        name: item.product?.name ?? 'Médicament',
      }));
  }, [debouncedInput, products, selectedIds]);

  useEffect(() => {
    setShowSuggestions(suggestions.length > 0 && debouncedInput.trim().length >= 2);
  }, [suggestions, debouncedInput]);

  // ── Add / remove selected product ──
  const addProduct = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setCurrentInput('');
    setShowSuggestions(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const removeProduct = useCallback((id: string) => {
    setSelectedIds((prev) => prev.filter((p) => p !== id));
  }, []);

  const clearAll = useCallback(() => {
    setSelectedIds([]);
    setCurrentInput('');
  }, []);

  // ── Keyboard handling ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && currentInput === '' && selectedIds.length > 0) {
        setSelectedIds((prev) => prev.slice(0, -1));
      }
      if ((e.key === 'Enter' || e.key === ',') && suggestions.length > 0) {
        e.preventDefault();
        addProduct(suggestions[0].id);
      }
    },
    [currentInput, selectedIds, suggestions, addProduct]
  );

  // ── Derived display ──
  const hasSelection = selectedIds.length > 0;

  // Map: id → CatalogItem (first occurrence of each product id)
  const productById = useMemo(() => {
    const map = new Map<string, CatalogItem>();
    products.forEach((item) => {
      const id = String(item.product?.id ?? item.id);
      if (!map.has(id)) map.set(id, item);
    });
    return map;
  }, [products]);

  // Selected items in the order they were added
  const selectedItems = useMemo(
    () => selectedIds.map((id) => productById.get(id)).filter(Boolean) as CatalogItem[],
    [selectedIds, productById]
  );

  // All unique products (for the default grid)
  const allUniqueProducts = useMemo(() => {
    const seen = new Set<string>();
    return products.filter((item) => {
      const id = String(item.product?.id ?? item.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [products]);

  const displayedProducts = hasSelection ? selectedItems : allUniqueProducts;

  // Name map for chips
  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    products.forEach((item) => {
      const id = String(item.product?.id ?? item.id);
      if (!m.has(id)) m.set(id, item.product?.name ?? 'Médicament');
    });
    return m;
  }, [products]);

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
      setAddingIds((prev) => new Set(prev).add(itemId));
      await addItem(product.product.id, pharmacyId, 1, product.product);
      showToast(`"${product.product.name}" ajouté au panier !`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'ajout au panier.";
      showToast(msg, 'error');
    } finally {
      setAddingIds((prev) => {
        const s = new Set(prev);
        s.delete(itemId);
        return s;
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-[#22C55E] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
          {toastMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Pill size={28} className="text-[#22C55E]" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Produits disponibles</h2>
            <p className="text-sm text-gray-600">
              {hasSelection
                ? `${selectedItems.length} produit${selectedItems.length > 1 ? 's' : ''} sélectionné${selectedItems.length > 1 ? 's' : ''}`
                : 'Sélectionnez vos médicaments'}
            </p>
          </div>
        </div>
        <span className="px-4 py-2 bg-[#22C55E] text-white rounded-full text-sm font-bold shadow-sm">
          {displayedProducts.length}
        </span>
      </div>

      {/* ── Autocomplete search bar ── */}
      <div className="mb-6" ref={suggestionsRef}>
        <div className="relative">
          {/* Tags + input row */}
          <div
            className={`flex flex-wrap items-center gap-1.5 w-full pl-10 pr-9 py-2 border-2 rounded-xl bg-white transition-all cursor-text min-h-[48px] ${
              inputFocused || showSuggestions
                ? 'border-[#22C55E] ring-2 ring-[#22C55E]/20'
                : 'border-gray-200'
            }`}
            onClick={() => inputRef.current?.focus()}
          >
            {/* Search icon */}
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />

            {/* Selected product chips */}
            {selectedIds.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1 bg-[#22C55E] text-white text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
              >
                {nameById.get(id) ?? id}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeProduct(id);
                  }}
                  className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                >
                  <X size={10} />
                </button>
              </span>
            ))}

            {/* Text input */}
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                setInputFocused(true);
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onBlur={() => setInputFocused(false)}
              placeholder={
                selectedIds.length === 0
                  ? 'Rechercher un médicament...'
                  : 'Ajouter un autre médicament...'
              }
              className="flex-1 min-w-[160px] py-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent"
            />

            {/* Clear all / loading indicator */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {hasSelection || currentInput ? (
                <button
                  onClick={clearAll}
                  className="text-gray-400 hover:text-gray-700 transition-colors"
                  title="Effacer la recherche"
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {suggestions.map((s, idx) => (
                <button
                  key={s.id}
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent blur before addProduct
                    addProduct(s.id);
                  }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-[#F0FDF4] transition-colors ${
                    idx < suggestions.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <Pill size={13} className="text-[#22C55E] shrink-0" />
                  {s.name}
                </button>
              ))}
              <p className="px-4 py-2 text-[11px] text-gray-400 border-t border-gray-100 bg-gray-50">
                Appuyez sur{' '}
                <kbd className="bg-gray-200 px-1 rounded text-[10px]">Entrée</kbd>{' '}
                pour ajouter · <kbd className="bg-gray-200 px-1 rounded text-[10px]">⌫</kbd> pour supprimer
              </p>
            </div>
          )}

          {/* No match indicator */}
          {currentInput.trim().length >= 2 && suggestions.length === 0 && !loading && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
                <Loader2 size={14} className="text-gray-300" />
                Aucun médicament trouvé pour &ldquo;{currentInput}&rdquo;
              </div>
            </div>
          )}
        </div>

        {/* Reset link when products are selected */}
        {hasSelection && (
          <button
            onClick={clearAll}
            className="mt-2 text-xs text-gray-400 hover:text-[#22C55E] transition-colors flex items-center gap-1"
          >
            <X size={11} />
            Afficher tous les produits
          </button>
        )}
      </div>

      {/* Products grid */}
      {displayedProducts.length > 0 ? (
        <div className={`grid gap-6 ${
          hasSelection
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}>
          {displayedProducts.map((item) => (
            <div
              key={item.id}
              className="group bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-[#22C55E] transition-all"
            >
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
          <p className="text-gray-500">
            {hasSelection
              ? 'Les produits sélectionnés ne sont pas disponibles dans cette pharmacie.'
              : 'Aucun produit disponible dans cette pharmacie.'}
          </p>
          {hasSelection && (
            <button
              onClick={clearAll}
              className="mt-4 px-4 py-2 text-sm bg-[#22C55E] text-white rounded-lg hover:bg-[#16A34A] transition-colors"
            >
              Voir tous les produits
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductCatalog;
