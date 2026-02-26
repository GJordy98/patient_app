"use client";

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { CatalogItem, Category, Product } from '@/types/common';

/**
 * Charge les produits depuis /products/ ET les catalogues des pharmacies,
 * puis les croise pour produire des CatalogItems enrichis avec prix + pharmacie.
 * Les produits sans entrée dans un catalogue s'affichent quand même
 * (sans prix ni pharmacie) mais le bouton panier sera désactivé côté UI.
 */
export const useProducts = () => {
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadCategories = useCallback(async () => {
    try {
      const data = await api.getCategories();
      const cats = Array.isArray(data) ? data : [];
      setCategories([
        { id: null, name: 'Tous les produits', icon: 'apps' },
        ...cats.map((c: Category) => ({
          id: c.id,
          name: c.name,
          icon: c.icon || (c.name === 'Médicament' ? 'medication' : 'category')
        }))
      ]);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  const loadProducts = useCallback(async (page: number, categoryId: string | null) => {
    try {
      setLoading(true);

      // Charger les produits depuis /products/ uniquement
      // (l'endpoint /officine/list-all-product-officine/ n'est pas disponible côté client)
      const productData = await api.getProducts(page, categoryId || undefined);

      const rawProducts: Product[] = Array.isArray(productData)
        ? productData
        : (productData.results || []);

      setTotalPages(Math.ceil(((productData as { count?: number }).count || rawProducts.length) / 12));

      // Convertir en CatalogItems (sans enrichissement pharmacie ici)
      const enriched: CatalogItem[] = rawProducts.map((p: Product) => ({
        id: p.id,
        product: p,
        sale_price: p.price || 0,
        price: p.price,
        quantity: undefined,
        officine_detail: undefined,
      }));

      setProducts(enriched);
    } catch (error) {
      console.error('[useProducts] Erreur chargement produits:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadProducts(currentPage, selectedCategory);
  }, [currentPage, selectedCategory, loadProducts]);

  const selectCategory = (id: string | null) => {
    setSelectedCategory(id);
    setCurrentPage(1);
  };

  return {
    products,
    categories,
    loading,
    selectedCategory,
    currentPage,
    totalPages,
    selectCategory,
    setCurrentPage,
    refresh: () => loadProducts(currentPage, selectedCategory)
  };
};
