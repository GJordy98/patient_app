"use client";

import React from 'react';
import Link from 'next/link';
import { Building2, MapPin, Phone } from 'lucide-react';
import { Pharmacy } from '@/types/common';

interface PharmacyCardProps {
  pharmacy: Pharmacy;
}

const PharmacyCard: React.FC<PharmacyCardProps> = ({ pharmacy }) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg transition-all animate-slide-up">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 bg-[#F0FDF4] rounded-lg flex items-center justify-center shrink-0">
          <Building2 size={28} className="text-[#22C55E]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-gray-900 truncate">
            {pharmacy.name || pharmacy.officine_name}
          </h3>
          <p className="text-sm text-[#22C55E] font-medium flex items-center gap-1">
            <span className="w-2 h-2 bg-[#22C55E] rounded-full animate-pulse"></span>
            Ouvert • 09:00 - 20:00
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
          <span>{pharmacy.address || pharmacy.quartier || 'Adresse non spécifiée'}</span>
        </div>
        {pharmacy.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone size={16} className="text-gray-400 shrink-0" />
            <span>{pharmacy.phone}</span>
          </div>
        )}
      </div>

      <Link
        href={`/pharmacies/${pharmacy.id}`}
        className="block w-full py-2.5 text-center bg-[#22C55E] hover:bg-[#16A34A] text-white font-semibold rounded-lg transition-colors shadow-sm"
      >
        Voir les détails
      </Link>
    </div>
  );
};

export default PharmacyCard;
