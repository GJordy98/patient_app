import React from 'react';
import ProductCard from './ProductCard';
import { CatalogItem, Product, Pharmacy } from '@/types/common';
import { Package } from 'lucide-react';

interface ProductGridProps {
  products: CatalogItem[];
  loading: boolean;
  onAddToCart: (item: CatalogItem) => void;
  onViewDetails?: (product: Product) => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, loading, onAddToCart, onViewDetails }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-gray-200 animate-pulse h-80 rounded-2xl"></div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
        <Package size={56} className="text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-600">Aucun produit trouvé</h3>
        <p className="text-gray-500">Essayez de changer de catégorie ou de zone de recherche</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map((item) => {
        const product = item.product || (item as unknown as Product);
        const pharmacy = (item.officine_detail || (item as { pharmacy?: Pharmacy }).pharmacy) as Pharmacy;
        const pharmacyId = pharmacy?.id || (item as Record<string, unknown>).pharmacyId as string || (item as Record<string, unknown>).officine_id as string || '';
        const pharmacyName = pharmacy?.name || pharmacy?.officine_name || (item as { pharmacy_name?: string }).pharmacy_name || (item as { pharmacyName?: string }).pharmacyName || 'Pharmacie';

        return (
          <ProductCard
            key={item.id}
            product={product as { id: string; name: string; dci?: string; galenic?: string; image?: string }}
            pharmacyName={pharmacyName}
            pharmacyId={pharmacyId || undefined}
            price={item.sale_price || item.price || 0}
            currency={(item.currency as string) || 'FCFA'}
            onAddToCart={() => onAddToCart(item)}
            onViewDetails={() => onViewDetails?.(product)}
          />
        );
      })}
    </div>
  );
};

export default ProductGrid;
