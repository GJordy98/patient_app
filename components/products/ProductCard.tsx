import React from 'react';
import { Pill, Building2, Info, ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    dci?: string;
    galenic?: string;
    image?: string;
  };
  pharmacyName: string;
  pharmacyId?: string;
  price: number;
  currency: string;
  onAddToCart: () => void;
  onViewDetails: () => void;
}

const iconColors = [
  { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  { bg: 'bg-teal-50',    text: 'text-teal-600' },
  { bg: 'bg-lime-50',    text: 'text-lime-700' },
  { bg: 'bg-green-50',   text: 'text-green-600' },
];

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  pharmacyName,
  pharmacyId,
  price,
  currency,
  onAddToCart,
  onViewDetails
}) => {
  const charSum = product.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const color = iconColors[charSum % iconColors.length];
  const hasPharmacy = !!pharmacyId;

  return (
    <div
      className="group relative flex flex-col h-full bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1"
      style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #e8f5e8' }}
      onClick={onViewDetails}
    >
      {/* Image / Icon area */}
      <div className={`relative h-44 flex items-center justify-center ${color.bg} overflow-hidden`}>
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              className={`w-16 h-16 rounded-2xl ${color.bg} flex items-center justify-center shadow-sm`}
              style={{ border: '1.5px solid rgba(0,0,0,0.05)' }}
            >
              <Pill size={36} className={color.text} />
            </div>
          </div>
        )}

        {/* Galenic badge */}
        {product.galenic && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-bold text-gray-600 rounded-full shadow-sm">
            {product.galenic}
          </span>
        )}

        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/4 transition-colors duration-300" />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-2.5">

        {/* Pharmacy badge */}
        <div className="flex items-center gap-1.5">
          <Building2 size={14} className="text-primary shrink-0" />
          {hasPharmacy ? (
            <span className="text-[11px] font-semibold text-primary truncate">{pharmacyName}</span>
          ) : (
            <span className="text-[11px] font-semibold text-gray-400 italic truncate">Non associé à une pharmacie</span>
          )}
        </div>

        {/* Product name */}
        <h3 className="font-bold text-gray-900 line-clamp-2 text-[15px] leading-snug min-h-10">
          {product.name}
        </h3>

        {/* DCI */}
        {product.dci && (
          <p className="text-[12px] text-gray-500 truncate">
            <span className="font-semibold text-gray-400">DCI :</span> {product.dci}
          </p>
        )}

        {/* Price */}
        <div className="mt-auto pt-3 border-t border-gray-50">
          {price > 0 ? (
            <p className="text-xl font-black text-primary">
              {price.toLocaleString('fr-FR')}{' '}
              <span className="text-sm font-bold text-primary/70">{currency}</span>
            </p>
          ) : (
            <p className="text-sm font-semibold text-gray-400 italic">Prix sur demande</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
            className="flex-1 py-2.5 rounded-xl bg-gray-50 text-gray-600 hover:bg-primary/8 hover:text-primary font-semibold text-[12px] flex items-center justify-center gap-1.5 transition-all"
          >
            <Info size={14} />
            Détails
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); if (hasPharmacy) onAddToCart(); }}
            disabled={!hasPharmacy}
            title={hasPharmacy ? 'Ajouter au panier' : "Produit sans pharmacie associée"}
            className={`flex-1 py-2.5 rounded-xl font-bold text-[12px] flex items-center justify-center gap-1.5 transition-all ${
              hasPharmacy
                ? 'bg-[#22C55E] hover:bg-[#16A34A] text-white active:scale-95'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60'
            }`}
            style={hasPharmacy ? { boxShadow: '0 2px 8px rgba(34,197,94,0.3)' } : {}}
          >
            <ShoppingCart size={14} />
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
