"use client";

import React from 'react';
import Link from 'next/link';
import { Pharmacy } from '@/types/common';

interface PharmacyCardProps {
  pharmacy: Pharmacy;
}

const PharmacyCard: React.FC<PharmacyCardProps> = ({ pharmacy }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all animate-slide-up">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-3xl">local_pharmacy</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">
            {pharmacy.name || pharmacy.officine_name}
          </h3>
          <p className="text-sm text-primary font-medium flex items-center gap-1">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
            Ouvert • 09:00 - 20:00
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="material-symbols-outlined text-gray-400 text-lg!">location_on</span>
          <span>{pharmacy.address || pharmacy.quartier || 'Adresse non spécifiée'}</span>
        </div>
        {pharmacy.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="material-symbols-outlined text-gray-400 text-lg!">phone</span>
            <span>{pharmacy.phone}</span>
          </div>
        )}
      </div>

      <Link 
        href={`/pharmacies/${pharmacy.id}`}
        className="block w-full py-2.5 text-center bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
      >
        Voir les détails
      </Link>
    </div>
  );
};

export default PharmacyCard;
