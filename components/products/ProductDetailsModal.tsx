"use client";

import React from 'react';
import Image from 'next/image';
import { Product, CatalogItem, Pharmacy } from '@/types/common';
import { Info, X, Pill, Store, ShoppingCart } from 'lucide-react';

interface ProductDetailsModalProps {
  product: Product;
  availability: CatalogItem[];
  onClose: () => void;
  onAddToCart: (item: CatalogItem) => void;
}

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product,
  availability,
  onClose,
  onAddToCart,
}) => {
  const galenicName =
    (product.galenic_detail as { name?: string } | undefined)?.name ||
    product.galenic ||
    null;

  const categoryName =
    (product.category_detail as { name?: string } | undefined)?.name || null;

  const unitLabel =
    (product.unit_sale_detail as { label?: string; code?: string } | undefined)?.label ||
    (product.unit_sale_detail as { label?: string; code?: string } | undefined)?.code ||
    null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-primary/5">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Info size={20} className="text-primary" />
            Détails du produit
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Product Info Section */}
          <div className="p-6 flex flex-col md:flex-row gap-6">
            {/* Image */}
            <div className="w-full md:w-1/3 flex items-center justify-center bg-gray-50 rounded-2xl overflow-hidden aspect-square relative">
              {product.image ? (
                <Image src={product.image} alt={product.name} fill className="object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                    <Pill size={40} className="text-primary" />
                  </div>
                  {galenicName && (
                    <span className="text-xs text-gray-400 font-medium text-center px-2">{galenicName}</span>
                  )}
                </div>
              )}
            </div>

            {/* Right info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-bold mb-3 text-gray-900 leading-tight">{product.name}</h3>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {product.dci && (
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full">
                    DCI : {product.dci}
                  </span>
                )}
                {galenicName && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                    {galenicName}
                  </span>
                )}
                {categoryName && categoryName !== 'Non classé' && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
                    {categoryName}
                  </span>
                )}
              </div>

              {/* Details table */}
              <div className="space-y-2">
                {product.dosage && product.dosage !== 'nan' && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-gray-600 w-24 shrink-0">Dosage :</span>
                    <span className="text-gray-800">{product.dosage}</span>
                  </div>
                )}
                {unitLabel && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-gray-600 w-24 shrink-0">Unité :</span>
                    <span className="text-gray-800">{unitLabel}</span>
                  </div>
                )}
                {product.manufacturer && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-gray-600 w-24 shrink-0">Fabricant :</span>
                    <span className="text-gray-800">{product.manufacturer}</span>
                  </div>
                )}
              </div>

              {product.description && (
                <p className="mt-3 text-gray-600 text-sm leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>
          </div>

          {/* Availability Section */}
          <div className="px-6 pb-6">
            <h4 className="text-lg font-bold mb-4 flex items-center gap-2 text-primary">
              <Store size={20} />
              Disponibilité et prix
              {availability.length > 0 && (
                <span className="ml-auto text-sm font-normal text-gray-400">
                  {availability.length} pharmacie{availability.length > 1 ? 's' : ''}
                </span>
              )}
            </h4>

            <div className="space-y-3">
              {availability.length > 0 ? (
                availability.map((item) => {
                  const pharmacy = (item.officine_detail || (item as { pharmacy?: Pharmacy }).pharmacy) as Pharmacy;
                  const pharmacyName =
                    pharmacy?.name ||
                    pharmacy?.officine_name ||
                    (item as { pharmacy_name?: string }).pharmacy_name ||
                    (item as { pharmacyName?: string }).pharmacyName ||
                    'Pharmacie';
                  const location = pharmacy?.quartier || pharmacy?.location || (item as { location?: string }).location;
                  const price = item.sale_price || item.price || 0;

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary/50 transition-all border-l-4 border-l-primary"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900 truncate">{pharmacyName}</span>
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">
                            En Stock
                          </span>
                        </div>
                        {location && (
                          <p className="text-xs text-gray-500">{location}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="text-right">
                          {price > 0 ? (
                            <p className="text-xl font-extrabold text-primary">
                              {price.toLocaleString('fr-FR')} <span className="text-sm font-bold">FCFA</span>
                            </p>
                          ) : (
                            <p className="text-sm font-semibold text-gray-400 italic">Prix sur demande</p>
                          )}
                        </div>
                        <button
                          onClick={() => onAddToCart(item)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <ShoppingCart size={16} />
                          Ajouter
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <Store size={36} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium">Aucune pharmacie ne propose ce produit pour le moment.</p>
                  <p className="text-xs text-gray-400 mt-1">Revenez plus tard ou contactez une pharmacie directement.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="p-3 bg-gray-50 text-center border-t border-gray-100">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
            e-Dr TIM PHARMACY - Comparateur de prix en temps réel
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsModal;
