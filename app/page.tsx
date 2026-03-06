"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Search,
  MapPin,
  Building2,
  X,
  Pill,
  ChevronRight,
  Navigation,
  Loader2,
  ShoppingBag,
  ToggleLeft,
  ToggleRight,
  Package,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/products/ProductCard";
import ProductDetailsModal from "@/components/products/ProductDetailsModal";
import { api } from "@/lib/api-client";
import { useCart } from "@/context/CartContext";
import { Pharmacy, CatalogItem, Product } from "@/types/common";

const PharmacyMap = dynamic(() => import("@/components/pharmacies/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full bg-[#F8FAFC]">
      <Loader2 size={32} className="text-[#22C55E] animate-spin mb-3" />
      <p className="text-[13px] text-[#94A3B8]">Chargement de la carte…</p>
    </div>
  ),
});

/* ── Haversine distance ── */
function haversine(lat1: number, lng1: number, lat2?: number, lng2?: number): number | null {
  if (!lat2 || !lng2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

/* ── PharmacyCard dans le panel droit ── */
interface PharmacyCardProps {
  pharmacy: Pharmacy;
  matchedProducts?: string[];
  totalPrice?: number;
  searchedCount?: number;
  matchCount?: number;
  distance: number | null;
  onOrder: () => void;
  highlighted?: boolean;
  onHover: (id: string | null) => void;
}

function PharmacyCard({
  pharmacy,
  matchedProducts,
  totalPrice,
  searchedCount,
  matchCount,
  distance,
  onOrder,
  highlighted,
  onHover,
}: PharmacyCardProps) {
  const name = pharmacy.name || pharmacy.officine_name || "Pharmacie";
  const address = pharmacy.quartier || pharmacy.location || pharmacy.address || "";
  const total = matchedProducts?.length ?? 0;

  return (
    <div
      onMouseEnter={() => onHover(String(pharmacy.id))}
      onMouseLeave={() => onHover(null)}
      className={`bg-white rounded-xl border transition-all duration-200 cursor-pointer ${
        highlighted
          ? "border-[#22C55E] shadow-md shadow-green-100"
          : "border-[#E2E8F0] shadow-sm hover:shadow-md hover:border-[#22C55E]/40"
      }`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] flex items-center justify-center shrink-0">
              <Building2 size={16} className="text-[#22C55E]" />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[#1E293B] truncate">{name}</p>
              {address && (
                <p className="text-[12px] text-[#94A3B8] truncate flex items-center gap-1">
                  <MapPin size={10} />
                  {address}
                </p>
              )}
            </div>
          </div>
          {distance !== null && (
            <span className="text-[11px] font-semibold text-[#22C55E] bg-[#F0FDF4] px-2 py-0.5 rounded-full shrink-0">
              {formatDistance(distance)}
            </span>
          )}
        </div>

        {/* Médicaments correspondants */}
        {total > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#22C55E] bg-[#F0FDF4] px-2.5 py-1 rounded-full">
                <Pill size={11} />
                {searchedCount && searchedCount > 0
                  ? `${matchCount}/${searchedCount} médicament${searchedCount > 1 ? "s" : ""}`
                  : `${total} médicament${total > 1 ? "s" : ""} disponible${total > 1 ? "s" : ""}`}
              </span>
              {totalPrice !== undefined && totalPrice > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-[#22C55E] px-2.5 py-1 rounded-full">
                  Total : {totalPrice.toLocaleString("fr-FR")} FCFA
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {matchedProducts!.slice(0, 3).map((n) => (
                <span key={n} className="text-[11px] text-[#94A3B8] bg-[#F8FAFC] px-2 py-0.5 rounded-full border border-[#E2E8F0]">
                  {n}
                </span>
              ))}
              {matchedProducts!.length > 3 && (
                <span className="text-[11px] text-[#94A3B8]">+{matchedProducts!.length - 3}</span>
              )}
            </div>
          </div>
        )}

        <button
          onClick={onOrder}
          className="w-full flex items-center justify-center gap-1.5 bg-[#22C55E] hover:bg-[#16A34A] text-white text-[13px] font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
        >
          <ShoppingBag size={14} />
          Commander ici
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════ */
export default function HomePage() {
  /* ── Multi-product search state ── */
  const [selectedProducts, setSelectedProducts] = useState<{ id: string; name: string }[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [suggestions, setSuggestions] = useState<{ id: string; name: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inputFocused, setInputFocused] = useState(false);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loadingPharmacies, setLoadingPharmacies] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<CatalogItem[]>([]);
  const [pharmacyProductMap, setPharmacyProductMap] = useState<
    Map<string, { pharmacy: Pharmacy; items: CatalogItem[] }>
  >(new Map());
  const [highlightedPharmacy, setHighlightedPharmacy] = useState<string | null>(null);

  // Adresse de livraison
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pointingOnMap, setPointingOnMap] = useState(false);

  // Modal détails produit
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductAvailability, setSelectedProductAvailability] = useState<CatalogItem[]>([]);

  // Produits initiaux des pharmacies proches
  const [allProducts, setAllProducts] = useState<CatalogItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const { addItem } = useCart();

  /* ── GPS ── */
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation({ lat: 3.8667, lng: 11.5167 })
      );
    } else {
      setUserLocation({ lat: 3.8667, lng: 11.5167 });
    }
  }, []);

  /* ── Pharmacies proches ── */
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingPharmacies(true);
        const { lat, lng } = userLocation ?? { lat: 3.8667, lng: 11.5167 };
        const data = await api.getNearbyPharmacies(lat, lng);
        setPharmacies(Array.isArray(data) ? data : []);
      } catch {
        // silent
      } finally {
        setLoadingPharmacies(false);
      }
    };
    load();
  }, [userLocation]);

  /* ── Produits initiaux depuis les pharmacies proches ── */
  useEffect(() => {
    if (pharmacies.length === 0) return;
    const loadInitialProducts = async () => {
      try {
        setLoadingProducts(true);
        const responses = await Promise.allSettled(
          pharmacies.slice(0, 4).map((p) => api.getPharmacyProducts(String(p.id)))
        );
        const items: CatalogItem[] = [];
        responses.forEach((res) => {
          if (res.status === "fulfilled") items.push(...res.value);
        });
        setAllProducts(items);
      } catch {
        // silent
      } finally {
        setLoadingProducts(false);
      }
    };
    loadInitialProducts();
  }, [pharmacies]);

  /* ── Suggestions (autocomplete, debounce 300ms) ── */
  useEffect(() => {
    if (currentInput.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsFetchingSuggestions(true);
      try {
        const { results } = await api.searchProducts(currentInput, userLocation?.lat, userLocation?.lng);
        const seen = new Set<string>();
        const uniq = results
          .filter((ci) => {
            const id = String(ci.product?.id ?? ci.id);
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          })
          .filter((ci) => !selectedProducts.some((s) => s.id === String(ci.product?.id ?? ci.id)))
          .slice(0, 8)
          .map((ci) => ({
            id: String(ci.product?.id ?? ci.id),
            name: ci.product?.name ?? "Médicament",
          }));
        setSuggestions(uniq);
        setShowSuggestions(uniq.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setIsFetchingSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [currentInput, userLocation, selectedProducts]);

  /* ── Fermer suggestions au clic extérieur ── */
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  /* ── Ajouter / supprimer un produit ── */
  const addProduct = useCallback((product: { id: string; name: string }) => {
    setSelectedProducts((prev) => {
      if (prev.some((s) => s.id === product.id)) return prev;
      return [...prev, product];
    });
    setCurrentInput("");
    setSuggestions([]);
    setShowSuggestions(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const removeProduct = useCallback((id: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  /* ── Gestion clavier dans l'input ── */
  const handleInputKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && currentInput === "" && selectedProducts.length > 0) {
        setSelectedProducts((prev) => prev.slice(0, -1));
        return;
      }
      if ((e.key === "," || e.key === "Enter") && currentInput.trim().length >= 2) {
        e.preventDefault();
        // Prendre la première suggestion si disponible
        if (suggestions.length > 0) {
          addProduct(suggestions[0]);
          return;
        }
        // Sinon chercher via API
        try {
          const { results } = await api.searchProducts(currentInput.trim(), userLocation?.lat, userLocation?.lng);
          if (results.length > 0) {
            const first = results[0];
            addProduct({
              id: String(first.product?.id ?? first.id),
              name: first.product?.name ?? currentInput.trim(),
            });
          }
        } catch {
          // silent
        }
      }
    },
    [currentInput, selectedProducts, suggestions, addProduct, userLocation]
  );

  /* ── Recherche multi-produits ── */
  const searchWithProducts = useCallback(async () => {
    if (selectedProducts.length === 0) {
      setSearchResults([]);
      setPharmacyProductMap(new Map());
      return;
    }
    setIsSearching(true);
    try {
      const responses = await Promise.allSettled(
        selectedProducts.map((p) => api.searchProducts(p.name, userLocation?.lat, userLocation?.lng))
      );

      const allItems: CatalogItem[] = [];
      responses.forEach((r) => {
        if (r.status === "fulfilled") allItems.push(...r.value.results);
      });
      setSearchResults(allItems);

      // Agréger par pharmacie
      const newMap = new Map<string, { pharmacy: Pharmacy; items: CatalogItem[] }>();
      allItems.forEach((ci) => {
        const pharmId = String(ci.officine_detail?.id ?? ci.pharmacyId ?? "");
        if (!pharmId) return;
        if (!newMap.has(pharmId)) {
          newMap.set(pharmId, { pharmacy: ci.officine_detail!, items: [] });
        }
        const existing = newMap.get(pharmId)!;
        const prodId = String(ci.product?.id ?? ci.id);
        if (!existing.items.some((e) => String(e.product?.id ?? e.id) === prodId)) {
          existing.items.push(ci);
        }
      });
      setPharmacyProductMap(newMap);
    } catch {
      setSearchResults([]);
      setPharmacyProductMap(new Map());
    } finally {
      setIsSearching(false);
    }
  }, [selectedProducts, userLocation]);

  useEffect(() => {
    searchWithProducts();
  }, [searchWithProducts]);

  /* ── Données dérivées ── */
  const matchingPharmacies = useMemo(() => {
    const result: {
      pharmacy: Pharmacy;
      products: string[];
      totalPrice: number;
      matchCount: number;
    }[] = [];
    pharmacyProductMap.forEach(({ pharmacy, items }) => {
      const names = [...new Set(items.map((ci) => ci.product?.name || "Médicament"))];
      const totalPrice = items.reduce((sum, ci) => sum + (ci.sale_price || ci.price || 0), 0);
      result.push({ pharmacy, products: names, totalPrice, matchCount: names.length });
    });
    // Trier : plus de produits correspondants en premier
    return result.sort((a, b) => b.matchCount - a.matchCount);
  }, [pharmacyProductMap]);

  const hasSearch = selectedProducts.length > 0;

  const displayedOnMap = useMemo(() => {
    if (hasSearch && matchingPharmacies.length > 0)
      return matchingPharmacies.map((m) => m.pharmacy);
    return pharmacies;
  }, [hasSearch, matchingPharmacies, pharmacies]);

  const listPharmacies = useMemo(() => {
    if (hasSearch && matchingPharmacies.length > 0) return matchingPharmacies;
    return pharmacies.map((p) => ({ pharmacy: p, products: [], totalPrice: 0, matchCount: 0 }));
  }, [hasSearch, matchingPharmacies, pharmacies]);

  // Produits à afficher : résultats recherche ou catalogue initial
  const displayedProducts = useMemo(() => {
    if (hasSearch && searchResults.length > 0) return searchResults;
    return allProducts;
  }, [hasSearch, searchResults, allProducts]);

  /* ── Handlers ── */
  const handleOrder = useCallback((pharmacyId: string) => {
    window.location.href = `/pharmacies/${pharmacyId}`;
  }, []);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (!pointingOnMap) return;
      setDeliveryCoords({ lat, lng });
      setDeliveryAddress(`Position choisie (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
      setPointingOnMap(false);
    },
    [pointingOnMap]
  );

  const handleViewDetails = useCallback(
    (item: CatalogItem) => {
      const product = item.product ?? ({ id: String(item.id), name: "Produit" } as Product);
      const prodId = String(product.id);
      const availability = displayedProducts.filter(
        (ci) => String(ci.product?.id ?? ci.id) === prodId
      );
      setSelectedProduct(product);
      setSelectedProductAvailability(availability.length > 0 ? availability : [item]);
    },
    [displayedProducts]
  );

  const handleAddToCart = useCallback(
    async (item: CatalogItem) => {
      const productId = String(item.product?.id ?? item.id);
      const pharmacyId = String(item.officine_detail?.id ?? item.pharmacyId ?? "");
      if (!pharmacyId) return;
      await addItem(productId, pharmacyId, 1);
    },
    [addItem]
  );

  const isInitialLoading = loadingPharmacies || loadingProducts;

  return (
    <DashboardLayout noPadding>
      <div className="flex flex-col bg-[#F8FAFC]">

        {/* ══════════════════════════════════════════════
            Barre de recherche — pleine largeur, sticky
        ══════════════════════════════════════════════ */}
        <div className="w-full bg-white border-b border-[#E2E8F0] sticky top-[68px] z-[1000] shadow-sm">
          <div className="px-4 py-3">
            {/* Champ de recherche multi-produits */}
            <div ref={suggestionsRef} className="relative">
              {/* Conteneur tags + input */}
              <div
                className={`flex flex-wrap items-center gap-1.5 w-full pl-10 pr-9 py-2 border rounded-xl bg-white transition-all cursor-text ${
                  inputFocused || showSuggestions
                    ? "border-[#22C55E] ring-2 ring-[#22C55E]/20"
                    : "border-[#E2E8F0]"
                }`}
                onClick={() => inputRef.current?.focus()}
              >
                {/* Icône loupe */}
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none"
                />

                {/* Tags produits sélectionnés */}
                {selectedProducts.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 bg-[#22C55E] text-white text-[12px] font-medium px-2.5 py-1 rounded-full shrink-0"
                  >
                    {p.name}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeProduct(p.id);
                      }}
                      className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}

                {/* Input inline */}
                <input
                  ref={inputRef}
                  type="text"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  onFocus={() => {
                    setInputFocused(true);
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  onBlur={() => setInputFocused(false)}
                  placeholder={
                    selectedProducts.length === 0
                      ? "Rechercher un médicament…"
                      : "Ajouter un autre médicament…"
                  }
                  className="flex-1 min-w-[160px] py-1 text-[14px] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none bg-transparent"
                />

                {/* Loader / clear */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isFetchingSuggestions || isSearching ? (
                    <Loader2 size={16} className="text-[#22C55E] animate-spin" />
                  ) : hasSearch ? (
                    <button
                      onClick={() => {
                        setSelectedProducts([]);
                        setCurrentInput("");
                      }}
                      className="text-[#94A3B8] hover:text-[#1E293B] transition-colors"
                    >
                      <X size={16} />
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Dropdown suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 overflow-hidden">
                  {suggestions.map((s, idx) => (
                    <button
                      key={s.id}
                      onMouseDown={(e) => {
                        e.preventDefault(); // prevent input blur before addProduct
                        addProduct(s);
                      }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[13px] text-[#1E293B] hover:bg-[#F0FDF4] transition-colors ${
                        idx < suggestions.length - 1 ? "border-b border-[#F1F5F9]" : ""
                      }`}
                    >
                      <Pill size={13} className="text-[#22C55E] shrink-0" />
                      {s.name}
                    </button>
                  ))}
                  <p className="px-4 py-2 text-[11px] text-[#94A3B8] border-t border-[#F1F5F9] bg-[#F8FAFC]">
                    Appuyez sur <kbd className="bg-[#E2E8F0] px-1 rounded text-[10px]">,</kbd> ou{" "}
                    <kbd className="bg-[#E2E8F0] px-1 rounded text-[10px]">Entrée</kbd> pour ajouter
                  </p>
                </div>
              )}
            </div>

            {/* Toggle adresse de livraison */}
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setUseCurrentLocation(!useCurrentLocation)}
                className="flex items-center gap-2 text-left shrink-0"
              >
                {useCurrentLocation ? (
                  <ToggleRight size={22} className="text-[#22C55E]" />
                ) : (
                  <ToggleLeft size={22} className="text-[#94A3B8]" />
                )}
                <span className="text-[13px] font-medium text-[#1E293B]">
                  {useCurrentLocation ? "Livrer à ma position actuelle" : "Choisir une autre adresse"}
                </span>
              </button>

              {!useCurrentLocation && (
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                  <div className="relative flex-1">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#EF4444]" />
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Saisir une adresse de livraison…"
                      className="w-full pl-8 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-[13px] focus:outline-none focus:border-[#EF4444] transition-all"
                    />
                  </div>
                  <button
                    onClick={() => setPointingOnMap(true)}
                    className={`flex items-center gap-1.5 py-2 px-3 rounded-lg border text-[12px] font-medium transition-colors whitespace-nowrap ${
                      pointingOnMap
                        ? "bg-[#EF4444] border-[#EF4444] text-white"
                        : "border-[#E2E8F0] text-[#94A3B8] hover:border-[#EF4444] hover:text-[#EF4444]"
                    }`}
                  >
                    <Navigation size={13} />
                    {pointingOnMap ? "Cliquez…" : "Sur la carte"}
                  </button>
                  {deliveryCoords && (
                    <p className="text-[11px] text-[#22C55E] flex items-center gap-1 whitespace-nowrap">
                      <MapPin size={11} />
                      Marquée
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            Carte (60%) + Panel pharmacies (40%)
        ══════════════════════════════════════════════ */}
        <div className="flex h-[500px]">

          {/* ── Carte ── */}
          <div className="relative flex-[3] min-w-0 h-full" style={{ isolation: 'isolate' }}>
            <PharmacyMap
              pharmacies={displayedOnMap}
              userLat={userLocation?.lat}
              userLng={userLocation?.lng}
              deliveryLat={!useCurrentLocation ? deliveryCoords?.lat : undefined}
              deliveryLng={!useCurrentLocation ? deliveryCoords?.lng : undefined}
              onMapClick={pointingOnMap ? handleMapClick : undefined}
              highlightedPharmacyId={highlightedPharmacy}
            />
            {pointingOnMap && (
              <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none z-10">
                <div className="bg-white rounded-xl px-4 py-3 shadow-lg text-[14px] font-medium text-[#1E293B] flex items-center gap-2">
                  <Navigation size={16} className="text-[#EF4444]" />
                  Cliquez sur la carte pour choisir votre adresse
                </div>
              </div>
            )}
          </div>

          {/* ── Panel pharmacies (40%) ── */}
          <div className="flex-[2] min-w-0 h-full flex flex-col bg-white border-l border-[#E2E8F0] overflow-hidden">

            {/* Titre du panel */}
            <div className="px-4 pt-3 pb-2 border-b border-[#E2E8F0] shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-[13px] font-semibold text-[#94A3B8] uppercase tracking-wide">
                  {hasSearch && matchingPharmacies.length > 0
                    ? `${matchingPharmacies.length} pharmacie${matchingPharmacies.length > 1 ? "s trouvées" : " trouvée"}`
                    : `${pharmacies.length} pharmacie${pharmacies.length > 1 ? "s" : ""} à proximité`}
                </h2>
                {hasSearch && (
                  <button
                    onClick={() => setSelectedProducts([])}
                    className="text-[11px] text-[#94A3B8] hover:text-[#EF4444] transition-colors"
                  >
                    Effacer
                  </button>
                )}
              </div>
            </div>

            {/* Liste scrollable */}
            <div className="flex-1 overflow-y-auto">
              {/* Skeletons */}
              {(loadingPharmacies || isSearching) && (
                <div className="px-4 pt-3 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-28 rounded-xl bg-[#F0FDF4] animate-pulse" />
                  ))}
                </div>
              )}

              {/* Aucun résultat */}
              {!loadingPharmacies && !isSearching && hasSearch && matchingPharmacies.length === 0 && searchResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <Pill size={48} className="text-[#E2E8F0] mb-3" />
                  <p className="text-[14px] font-medium text-[#94A3B8]">Aucun médicament trouvé</p>
                  <p className="text-[12px] text-[#94A3B8] mt-1">Vérifiez l&apos;orthographe ou essayez un autre nom</p>
                </div>
              )}

              {/* Cartes pharmacies */}
              {!loadingPharmacies && !isSearching && (
                <div className="px-4 pb-4 pt-3 space-y-3">
                  {listPharmacies.map(({ pharmacy, products, totalPrice, matchCount }) => {
                    const dist = userLocation
                      ? haversine(userLocation.lat, userLocation.lng, pharmacy.latitude, pharmacy.longitude)
                      : null;
                    return (
                      <PharmacyCard
                        key={pharmacy.id}
                        pharmacy={pharmacy}
                        matchedProducts={products.length > 0 ? products : undefined}
                        totalPrice={totalPrice}
                        searchedCount={hasSearch ? selectedProducts.length : undefined}
                        matchCount={matchCount}
                        distance={dist}
                        onOrder={() => handleOrder(String(pharmacy.id))}
                        highlighted={highlightedPharmacy === String(pharmacy.id)}
                        onHover={setHighlightedPharmacy}
                      />
                    );
                  })}

                  {listPharmacies.length === 0 && !hasSearch && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Building2 size={48} className="text-[#E2E8F0] mb-3" />
                      <p className="text-[14px] text-[#94A3B8]">Aucune pharmacie à proximité</p>
                    </div>
                  )}

                  {listPharmacies.length > 0 && (
                    <Link
                      href="/pharmacies"
                      className="flex items-center justify-center gap-1 w-full py-3 text-[13px] font-medium text-[#22C55E] hover:text-[#16A34A] border border-[#E2E8F0] hover:border-[#22C55E] rounded-xl transition-all"
                    >
                      Voir toutes les pharmacies
                      <ChevronRight size={14} />
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            Section produits — sous la carte
        ══════════════════════════════════════════════ */}
        <div id="productsSection" className="px-4 lg:px-6 py-8">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-[22px] font-bold text-[#1E293B]">
                {hasSearch ? "Produits trouvés" : "Produits disponibles"}
              </h2>
              {displayedProducts.length > 0 && (
                <p className="text-[13px] text-[#94A3B8] mt-0.5">
                  {displayedProducts.length} produit{displayedProducts.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
            {(isInitialLoading || isSearching) && (
              <Loader2 size={20} className="text-[#22C55E] animate-spin" />
            )}
          </div>

          {/* Skeletons chargement initial */}
          {isInitialLoading && displayedProducts.length === 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden border border-[#E2E8F0]">
                  <div className="h-44 bg-[#F0FDF4] animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-[#F0FDF4] rounded animate-pulse" />
                    <div className="h-3 bg-[#F0FDF4] rounded w-2/3 animate-pulse" />
                    <div className="h-8 bg-[#F0FDF4] rounded animate-pulse mt-2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Grille de produits */}
          {displayedProducts.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {displayedProducts.map((item) => {
                const prod = item.product ?? ({ id: String(item.id), name: "Produit" } as Product);
                const pharmacy = item.officine_detail;
                return (
                  <ProductCard
                    key={item.id}
                    product={{
                      id: String(prod.id),
                      name: prod.name,
                      dci: prod.dci,
                      galenic: prod.galenic,
                      image: prod.image,
                    }}
                    pharmacyName={pharmacy?.name || pharmacy?.officine_name || ""}
                    pharmacyId={String(pharmacy?.id || item.pharmacyId || "")}
                    price={item.sale_price || item.price || 0}
                    currency="FCFA"
                    onViewDetails={() => handleViewDetails(item)}
                    onAddToCart={() => handleAddToCart(item)}
                  />
                );
              })}
            </div>
          )}

          {/* État vide */}
          {!isInitialLoading && !isSearching && displayedProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#F0FDF4] flex items-center justify-center mb-4">
                <Package size={32} className="text-[#22C55E]" />
              </div>
              <p className="text-[16px] font-semibold text-[#1E293B] mb-1">
                {hasSearch ? "Aucun produit trouvé" : "Aucun produit disponible"}
              </p>
              <p className="text-[13px] text-[#94A3B8]">
                {hasSearch
                  ? "Vérifiez l'orthographe ou essayez un autre nom"
                  : "Les produits des pharmacies proches apparaîtront ici"}
              </p>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════
            Footer
        ══════════════════════════════════════════════ */}
        <Footer />
      </div>

      {/* Modal détails produit */}
      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          availability={selectedProductAvailability}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={(item) => {
            handleAddToCart(item);
            setSelectedProduct(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}
