"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { Product, APICartItem, CartResponse } from '@/types/common';

interface CartItem {
  id: string; // Cart item ID from API
  cart_id?: string; // Cart ID
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  pharmacy_id: string;
  pharmacy_name?: string;
  product: Product;
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  removingItemId: string | null; // ID de l'article en cours de suppression
  total: number;
  cartTotal: number; // Total from API (total_amount) — source de vérité
  deliveryFee: number; // Frais de livraison estimés par le backend
  addItem: (productId: string, pharmacyId: string, quantity: number, productInfo?: Product) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [cartTotal, setCartTotal] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);

  const refreshCart = useCallback(async () => {
    try {
      if (!api.isAuthenticated()) return;
      setLoading(true);

      const data = await api.getCart();
      
      // Merge with local storage for prices (as in original cart.js)
      const localCart: Partial<CartItem>[] = JSON.parse(localStorage.getItem('local_cart') || '[]');
      
      console.log('[CartContext] Raw API cart data:', JSON.stringify(data, null, 2));

      // The API returns { cart: { id, items, total_amount, ... }, delivery_fee }
      // or could return an array of items directly (legacy/fallback)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawData = data as any;
      let apiItems: APICartItem[] = [];
      let cartId: string | undefined;
      let totalAmount = 0;

      if (rawData?.cart?.items) {
        // New API structure: { cart: { items: [...], total_amount, id }, delivery_fee }
        apiItems = rawData.cart.items;
        cartId = rawData.cart.id;
        totalAmount = parseFloat(rawData.cart.total_amount) || 0;
        setDeliveryFee(typeof rawData.delivery_fee === 'number' ? rawData.delivery_fee : parseFloat(rawData.delivery_fee) || 0);
      } else if (Array.isArray(data)) {
        apiItems = data;
      } else if ((data as CartResponse)?.cart) {
        apiItems = (data as CartResponse).cart.items || [];
        cartId = (data as CartResponse).cart.id;
        totalAmount = parseFloat(String((data as CartResponse).cart.total_amount || '0')) || 0;
      }

      // Store the authoritative total from the API
      setCartTotal(totalAmount);

      const normalizedItems = apiItems.map((item: APICartItem) => {
        const localItem = localCart.find((l: Partial<CartItem>) => l.product_id === item.product || l.id === item.id);
        
        // Correction : parseFloat("0.0000") vaut 0, donc on évite le "|| 1" qui le transformait en 1
        const parsedQty = typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity);
        const qty = isNaN(parsedQty) ? 1 : parsedQty;

        // Individual item price: prefer API value, then localStorage, then 0
        const itemPrice = item.sale_price ?? item.price ?? localItem?.price ?? 0;

        return {
          id: item.id,
          cart_id: cartId,
          product_id: item.product,
          product_name: item.product_name || item.product_detail?.name || localItem?.product_name || 'Produit',
          quantity: qty,
          price: itemPrice,
          pharmacy_id: item.pharmacy || localItem?.pharmacy_id || '',
          pharmacy_name: item.pharmacy_name || localItem?.pharmacy_name,
          product: {
            id: item.product,
            name: item.product_name || item.product_detail?.name || localItem?.product_name || 'Produit',
            dci: item.product_detail?.dci || localItem?.product?.dci,
            image: item.product_detail?.image || localItem?.product?.image,
            price: itemPrice
          } as Product
        };
      }).filter(item => item.quantity > 0); // Exclure les items zombies avec quantité 0

      setItems(normalizedItems);
    } catch (error) {
      console.error('Error refreshing cart:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addItem = async (productId: string, pharmacyId: string, quantity: number, productInfo?: Product) => {
    try {
      console.log(`[CartContext] addItem: productId=${productId}, pharmacyId=${pharmacyId}, quantity=${quantity}`);
      const result = await api.addToCart(productId, quantity, pharmacyId);
      console.log('[CartContext] addToCart result:', result);
      if (!result.success) {
        throw new Error(result.message || "Erreur lors de l'ajout au panier.");
      }
      
      // Update local storage for prices
      const localCart = JSON.parse(localStorage.getItem('local_cart') || '[]');
      const existingIndex = localCart.findIndex((l: Partial<CartItem>) => l.product_id === productId);
      const enrichedItem = {
        product_id: productId,
        pharmacy_id: pharmacyId,
        price: productInfo?.price || 0,
        product_name: productInfo?.name,
        product: productInfo
      };
      
      if (existingIndex >= 0) {
        localCart[existingIndex] = enrichedItem;
      } else {
        localCart.push(enrichedItem);
      }
      localStorage.setItem('local_cart', JSON.stringify(localCart));
      
      await refreshCart();
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error; // Re-throw so the calling UI can display the error
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      setRemovingItemId(itemId);
      const item = items.find(i => i.id === itemId);
      const qty = item ? item.quantity : 1;
      console.log(`[CartContext] removeItem: id=${itemId}, qty=${qty}, item=`, JSON.stringify(item));
      await api.removeCartItem(itemId, qty);
      await refreshCart();
    } catch (error) {
      console.error('Error removing from cart:', error);
      const message = error instanceof Error ? error.message : 'Erreur lors du retrait du produit';
      alert(message);
    } finally {
      setRemovingItemId(null);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      console.log(`[CartContext] updateQuantity: itemId=${itemId}, current=${item.quantity}, new=${quantity}`);

      if (quantity > item.quantity) {
          await api.addToCart(item.product_id, quantity - item.quantity, item.pharmacy_id);
      } else if (quantity < item.quantity && quantity > 0) {
          await api.removeCartItem(itemId, item.quantity - quantity);
      } else if (quantity <= 0) {
          await removeItem(itemId);
      }
      
      await refreshCart();
    } catch (error) {
      console.error('Error updating cart balance:', error);
    }
  };

  const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ items, loading, removingItemId, total, cartTotal, deliveryFee, addItem, removeItem, updateQuantity, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
