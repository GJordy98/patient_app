"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CategoryFilters from "@/components/products/CategoryFilters";
import ProductGrid from "@/components/products/ProductGrid";
import { api } from "@/lib/api-client";
import { useProducts } from "@/hooks/useProducts";
import { useCart } from "@/context/CartContext";
import { Pharmacy, CatalogItem, Product } from "@/types/common";

import dynamic from "next/dynamic";

import ProductDetailsModal from "@/components/products/ProductDetailsModal";
import PrescriptionUpload from "@/components/pharmacies/PrescriptionUpload";

const PharmacyMap = dynamic(() => import("@/components/pharmacies/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-gray-500">Chargement de la carte...</p>
    </div>
  ),
});

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loadingPharmacies, setLoadingPharmacies] = useState(true);
  const [searchResults, setSearchResults] = useState<CatalogItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  // Map pharmacieId → { pharmacy, catalogItems[] } construite après chaque recherche
  const [pharmacyProductMap, setPharmacyProductMap] = useState<Map<string, { pharmacy: Pharmacy; items: CatalogItem[] }>>(new Map());
  
  // Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productAvailability, setProductAvailability] = useState<CatalogItem[]>([]);

  const { addItem } = useCart();

  const {
    products,
    categories,
    loading: loadingProducts,
    selectedCategory,
    selectCategory,
  } = useProducts();

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation({ lat: 3.8667, lng: 11.5167 }) // Fallback: Yaoundé
      );
    } else {
      setUserLocation({ lat: 3.8667, lng: 11.5167 });
    }
  }, []);

  // Haversine distance (km)
  const getDistance = useCallback((lat1: number, lng1: number, lat2?: number, lng2?: number): number | null => {
    if (!lat2 || !lng2) return null;
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, []);

  // Load nearby pharmacies using real GPS position
  useEffect(() => {
    const loadPharmacies = async () => {
      try {
        setLoadingPharmacies(true);
        const lat = userLocation?.lat ?? 3.8667;
        const lng = userLocation?.lng ?? 11.5167;
        const data = await api.getNearbyPharmacies(lat, lng);
        setPharmacies(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error loading pharmacies:', error);
      } finally {
        setLoadingPharmacies(false);
      }
    };
    loadPharmacies();
  }, [userLocation]); // reload when GPS becomes available

  // Recherche: produits via /search/products/, puis produits de chaque pharmacie proche
  // via /officine/{id}/list-product/ pour trouver les vraies associations
  const searchMedications = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setPharmacyProductMap(new Map());
      setIsSearching(false);
      return;
    }
    try {
      setIsSearching(true);
      // 1. Rechercher les produits correspondants (donne les IDs)
      const { results } = await api.searchProducts(
        query,
        userLocation?.lat,
        userLocation?.lng,
      );
      setSearchResults(results);

      // 2. IDs des produits trouvés
      const searchedIds = new Set(results.map(item => String(item.product?.id ?? item.id)));

      // 3. Pour chaque pharmacie proche, charger son catalogue en parallèle
      if (pharmacies.length > 0 && searchedIds.size > 0) {
        const catalogResponses = await Promise.allSettled(
          pharmacies.map(p => api.getPharmacyProducts(String(p.id)))
        );

        const newMap = new Map<string, { pharmacy: Pharmacy; items: CatalogItem[] }>();
        pharmacies.forEach((pharmacy, idx) => {
          const result = catalogResponses[idx];
          if (result.status !== 'fulfilled') return;
          // Filtrer les items dont le produit est dans les résultats de recherche
          const matchingItems = result.value.filter(ci => {
            const pid = String(ci.product?.id ?? ci.id);
            return searchedIds.has(pid);
          });
          if (matchingItems.length > 0) {
            newMap.set(String(pharmacy.id), { pharmacy, items: matchingItems });
          }
        });
        setPharmacyProductMap(newMap);
      } else {
        setPharmacyProductMap(new Map());
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setPharmacyProductMap(new Map());
    } finally {
      setIsSearching(false);
    }
  }, [userLocation, pharmacies]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchMedications(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchMedications]);

  // ── Multi-product basket state (availability search) ──────
  const [basket, setBasket] = useState<CatalogItem[]>([]); // selected products for availability check
  const [availabilityPharmacies, setAvailabilityPharmacies] = useState<Pharmacy[]>([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const addToBasket = useCallback((item: CatalogItem) => {
    setBasket(prev => {
      const pid = item.product?.id ?? item.id;
      if (prev.some(i => (i.product?.id ?? i.id) === pid)) return prev;
      return [...prev, item];
    });
  }, []);

  const removeFromBasket = useCallback((id: string) => {
    setBasket(prev => prev.filter(i => (i.product?.id ?? i.id) !== id));
    if (basket.length <= 1) setAvailabilityPharmacies([]);
  }, [basket.length]);

  const checkAvailability = useCallback(async () => {
    if (basket.length === 0) return;
    try {
      setCheckingAvailability(true);
      const items = basket.map(i => ({
        product_id: String(i.product?.id ?? i.id),
        quantity: 1,
      }));
      const result = await api.searchPharmaciesByAvailability(items);
      setAvailabilityPharmacies(result);
    } catch (err) {
      console.error('Availability check failed:', err);
    } finally {
      setCheckingAvailability(false);
    }
  }, [basket]);

  // Pharmacies avec au moins un produit recherché (issues du catalogue per-pharmacy)
  const matchingPharmacies = useMemo((): { pharmacy: Pharmacy; products: string[] }[] => {
    if (!searchQuery.trim() || searchResults.length === 0) return [];
    const result: { pharmacy: Pharmacy; products: string[] }[] = [];
    pharmacyProductMap.forEach(({ pharmacy, items }) => {
      const productNames = items
        .map(ci => ci.product?.name || 'Produit')
        .filter((n, i, arr) => arr.indexOf(n) === i); // dédoublonner
      result.push({ pharmacy, products: productNames });
    });
    return result;
  }, [searchResults, searchQuery, pharmacyProductMap]);

  // Determine which pharmacies to show on the map
  const displayedPharmacies = useMemo(() => {
    if (availabilityPharmacies.length > 0) return availabilityPharmacies;
    if (searchQuery.trim() && matchingPharmacies.length > 0)
      return matchingPharmacies.map(m => m.pharmacy);
    return pharmacies;
  }, [searchQuery, matchingPharmacies, pharmacies, availabilityPharmacies]);

  const handleViewDetails = (product: Product) => {
    // Chercher les pharmacies qui ont ce produit dans pharmacyProductMap
    // (construit lors de la dernière recherche via /officine/{id}/list-product/)
    const availability: CatalogItem[] = [];
    pharmacyProductMap.forEach(({ pharmacy, items }) => {
      const matchingItems = items.filter(ci => {
        const pid = String(ci.product?.id ?? ci.id);
        return pid === String(product.id);
      });
      matchingItems.forEach(ci => {
        availability.push({
          ...ci,
          // S'assurer que officine_detail est bien la pharmacie connue
          officine_detail: ci.officine_detail || pharmacy,
          product: {
            ...product,
            ...(ci.product || {}),
            name: product.name || ci.product?.name || 'Produit',
          },
        });
      });
    });
    // Fallback: si pas de résultat de recherche, utiliser au moins le produit sans pharmacie
    if (availability.length === 0) {
      availability.push({ id: product.id, product, sale_price: product.price || 0 });
    }
    setSelectedProduct(product);
    setProductAvailability(availability);
  };

  const handleAddToCart = async (item: CatalogItem) => {
    try {
      const product = item.product || (item as unknown as Product);
      const productId = String(product.id || item.id);

      // Extraction robuste de l'ID de la pharmacie
      const pharmacy = item.officine_detail as Pharmacy | undefined;
      const pharmacyId = String(
        pharmacy?.id ||
        (item as Record<string, unknown>).pharmacyId ||
        (item as Record<string, unknown>).pharmacy_id ||
        (item as Record<string, unknown>).officine_id ||
        ''
      );

      if (!productId || !pharmacyId) {
        alert("Impossible d'ajouter : pharmacie non associée à ce produit.");
        return;
      }

      const productInfo: Product = {
        id: productId,
        name: product.name || 'Produit',
        dci: product.dci,
        image: product.image,
        price: item.sale_price || item.price || product.price || 0,
      };

      await addItem(productId, pharmacyId, 1, productInfo);
      alert(`✅ "${product.name}" ajouté au panier !`);
    } catch (error: unknown) {
      console.error("Error adding to cart:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'ajout au panier.";
      alert(errorMessage);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col font-display bg-gray-50 dark:bg-gray-900 text-text-dark dark:text-white">
      <Header />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="relative">
            <div className="flex items-stretch w-full rounded-2xl shadow-md focus-within:shadow-lg focus-within:ring-2 focus-within:ring-primary/30 transition-all bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-center px-5 text-primary">
                <span className="material-symbols-outlined text-[26px]">search</span>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 h-14 px-2 bg-transparent border-0 focus:outline-none text-base text-gray-800 dark:text-white placeholder:text-gray-400"
                placeholder="Rechercher médicaments (ex: Paracétamol, Spasfon)..."
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}
                  className="flex items-center justify-center px-4 text-gray-400 hover:text-gray-600 transition-colors">
                  <span className="material-symbols-outlined text-[22px]">close</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Search Suggestions Dropdown ── */}
        {searchQuery.trim() && (
          <div className="mb-4 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden animate-fade-in-up">
            {isSearching ? (
              <div className="flex items-center gap-3 px-5 py-4 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Recherche en cours…
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex items-center gap-3 px-5 py-4 text-sm text-gray-500">
                <span className="material-symbols-outlined text-gray-300">search_off</span>
                Aucun médicament trouvé pour &quot;{searchQuery}&quot;
              </div>
            ) : (
              <>
                <div className="px-5 py-2 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''}
                  </span>
                  {basket.length > 0 && (
                    <span className="text-xs text-primary font-semibold">{basket.length} dans le panier de recherche</span>
                  )}
                </div>
                <ul className="max-h-60 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
                  {searchResults.slice(0, 8).map((item, idx) => {
                    const product = item.product;
                    // Le nom peut être dans item.product.name, item.name, ou item.product_name
                    const productName =
                      product?.name ||
                      (item as Record<string, unknown>).name as string ||
                      (item as Record<string, unknown>).product_name as string ||
                      '';
                    // L'ID peut être dans item.product.id ou item.id
                    const pid = String(product?.id ?? item.id);
                    const inBasket = basket.some(b => String(b.product?.id ?? b.id) === pid);
                    // La pharmacie peut être dans item.officine_detail ou item.pharmacy ou item.officine
                    const pharmaDetail = item.officine_detail ||
                      (item as Record<string, unknown>).pharmacy as typeof item.officine_detail ||
                      (item as Record<string, unknown>).officine as typeof item.officine_detail;
                    const pharmaName =
                      pharmaDetail?.name ||
                      pharmaDetail?.officine_name ||
                      (item as Record<string, unknown>).pharmacy_name as string ||
                      '';
                    // La DCI peut être dans item.product.dci ou item.dci
                    const dci =
                      product?.dci ||
                      (item as Record<string, unknown>).dci as string ||
                      '';
                    return (
                      <li key={pid ?? idx} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{productName || 'Produit sans nom'}</p>
                          {(dci || pharmaName) && (
                            <p className="text-xs text-gray-500 truncate">
                              {dci && <span className="text-primary/70">{dci}</span>}
                              {dci && pharmaName && ' • '}
                              {pharmaName}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => inBasket ? removeFromBasket(pid) : addToBasket(item)}
                          className={`ml-3 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                            inBasket
                              ? 'bg-primary/10 text-primary hover:bg-red-50 hover:text-red-500'
                              : 'bg-primary text-white hover:bg-primary/90'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">{inBasket ? 'remove' : 'add'}</span>
                          {inBasket ? 'Retirer' : 'Ajouter'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        )}

        {/* ── Basket panel (multi-product availability) ── */}
        {basket.length > 0 && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-primary/20 shadow-sm animate-fade-in-up">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">medication</span>
                <span className="text-sm font-bold text-gray-800 dark:text-white">
                  Médicaments sélectionnés ({basket.length})
                </span>
              </div>
              <button onClick={() => { setBasket([]); setAvailabilityPharmacies([]); }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors font-semibold">
                Tout effacer
              </button>
            </div>
            <div className="px-5 py-3 flex flex-wrap gap-2">
              {basket.map(item => {
                const pid = String(item.product?.id ?? item.id);
                const bName =
                  item.product?.name ||
                  (item as Record<string, unknown>).name as string ||
                  (item as Record<string, unknown>).product_name as string ||
                  'Médicament';
                return (
                  <span key={pid} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-primary/8 text-primary rounded-full text-xs font-bold">
                    {bName}
                    <button onClick={() => removeFromBasket(pid)}
                      className="w-4 h-4 rounded-full bg-primary/15 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors">
                      <span className="material-symbols-outlined text-[12px]">close</span>
                    </button>
                  </span>
                );
              })}
            </div>
            <div className="px-5 pb-4">
              <button
                onClick={checkAvailability}
                disabled={checkingAvailability}
                className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:translate-y-px transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {checkingAvailability ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined">local_pharmacy</span>
                )}
                Trouver les pharmacies qui ont tout
              </button>
              {availabilityPharmacies.length > 0 && (
                <p className="text-xs text-center text-primary font-semibold mt-2">
                  ✓ {availabilityPharmacies.length} pharmacie{availabilityPharmacies.length > 1 ? 's trouvées' : ' trouvée'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Grid Layout (Map + List) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Map Section */}
          <div className="lg:col-span-2 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Pharmacies à proximité</h2>
              <button 
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg font-semibold hover:bg-primary hover:text-white transition-all">
                <span className="material-symbols-outlined text-lg">my_location</span>
                <span className="hidden sm:inline">Ma position</span>
              </button>
            </div>
            <div className="relative w-full aspect-video bg-gray-300 dark:bg-gray-700 rounded-xl shadow-lg overflow-hidden">
               <PharmacyMap pharmacies={displayedPharmacies} />
            </div>
          </div>

          {/* Pharmacy List */}
          <div className="lg:col-span-1 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <h2 className="text-xl font-bold mb-4">
              {searchQuery.trim() && matchingPharmacies.length > 0
                ? `Pharmacies avec "${searchQuery}"`
                : 'Liste des pharmacies'
              }
            </h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {loadingPharmacies || isSearching ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="font-semibold">Chargement...</p>
                </div>
              ) : searchQuery.trim() && matchingPharmacies.length > 0 ? (
                /* Show pharmacies matching the medication search */
                matchingPharmacies.map(({ pharmacy, products: matchedProducts }) => (
                  <Link
                    key={pharmacy.id}
                    href={`/pharmacies/${pharmacy.id}`}
                    className="block bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{pharmacy.name || pharmacy.officine_name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{pharmacy.quartier || pharmacy.location || pharmacy.address}</p>
                      </div>
                      {userLocation && (() => {
                        const d = getDistance(userLocation.lat, userLocation.lng, pharmacy.latitude, pharmacy.longitude);
                        return d !== null ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-primary whitespace-nowrap">
                            <span className="material-symbols-outlined text-sm">distance</span>
                            {d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {matchedProducts.slice(0, 3).map((name, i) => (
                        <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                          {name}
                        </span>
                      ))}
                      {matchedProducts.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs font-semibold rounded-full">
                          +{matchedProducts.length - 3}
                        </span>
                      )}
                    </div>
                  </Link>
                ))
              ) : searchQuery.trim() && searchResults.length > 0 && pharmacies.length > 0 ? (
                /* Aucune pharmacie directement liée aux résultats → afficher les pharmacies proches */
                <>
                  <div className="mb-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg flex items-start gap-2">
                    <span className="material-symbols-outlined text-amber-500 text-sm mt-0.5 shrink-0">info</span>
                    <p className="text-xs text-amber-700 dark:text-amber-300">Pharmacies à proximité pouvant avoir <strong>&quot;{searchQuery}&quot;</strong></p>
                  </div>
                  {pharmacies.slice(0, 8).map((pharmacy: Pharmacy) => (
                    <Link
                      key={pharmacy.id}
                      href={`/pharmacies/${pharmacy.id}`}
                      className="block bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white">{pharmacy.name || pharmacy.officine_name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{pharmacy.quartier || pharmacy.location || pharmacy.address}</p>
                        </div>
                        {userLocation && (() => {
                          const d = getDistance(userLocation.lat, userLocation.lng, pharmacy.latitude, pharmacy.longitude);
                          return d !== null ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-primary whitespace-nowrap">
                              <span className="material-symbols-outlined text-sm">distance</span>
                              {d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </Link>
                  ))}
                </>
              ) : searchQuery.trim() && searchResults.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <span className="material-symbols-outlined text-4xl mb-3 block">search_off</span>
                  <p className="font-semibold">Aucun résultat trouvé</p>
                  <p className="text-sm mt-1">Essayez d&apos;autres noms ou vérifiez l&apos;orthographe</p>
                </div>
              ) : pharmacies.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <p>Aucune pharmacie trouvée.</p>
                </div>
              ) : (
                /* Default: show all pharmacies */
                pharmacies.map((pharmacy: Pharmacy) => (
                  <Link
                    key={pharmacy.id}
                    href={`/pharmacies/${pharmacy.id}`}
                    className="block bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{pharmacy.name || pharmacy.officine_name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{pharmacy.quartier || pharmacy.location}</p>
                      </div>
                      {userLocation && (() => {
                        const d = getDistance(userLocation.lat, userLocation.lng, pharmacy.latitude, pharmacy.longitude);
                        return d !== null ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-primary whitespace-nowrap">
                            <span className="material-symbols-outlined text-sm">distance</span>
                            {d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Catalogue Section */}
        <section id="productsSection" className="mt-16 animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <div className="mb-6">
            <h2 className="text-3xl font-extrabold mb-2 text-gray-900 dark:text-white">Catalogue des médicaments</h2>
            <p className="text-gray-600 dark:text-gray-400">Parcourez notre sélection et trouvez les pharmacies disponibles</p>
          </div>

          <CategoryFilters 
            categories={categories}
            selectedCategoryId={selectedCategory}
            onSelectCategory={selectCategory}
          />

          <ProductGrid 
            products={products}
            loading={loadingProducts}
            onAddToCart={handleAddToCart}
            onViewDetails={(product: Product) => handleViewDetails(product)}
          />
        </section>

        {/* Upload Section */}
        <section id="uploadSection" className="mt-16 mb-8">
            <PrescriptionUpload />
        </section>

        {/* Product Details Modal */}
        {selectedProduct && (
          <ProductDetailsModal
            product={selectedProduct}
            availability={productAvailability}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={(item: CatalogItem) => {
              handleAddToCart(item);
              setSelectedProduct(null);
            }}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
