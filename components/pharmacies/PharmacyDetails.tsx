"use client";

import React from 'react';
import { Pharmacy } from '@/types/common';

interface PharmacyDetailsProps {
  pharmacy: Pharmacy;
}

const PharmacyDetails: React.FC<PharmacyDetailsProps> = ({ pharmacy }) => {
  const callPharmacy = () => {
    if (pharmacy.phone) {
      window.location.href = `tel:${pharmacy.phone}`;
    }
  };

  const getDirections = () => {
    if (pharmacy.latitude && pharmacy.longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${pharmacy.latitude},${pharmacy.longitude}`);
    } else {
      const address = encodeURIComponent(`${pharmacy.address || ''} ${pharmacy.city || ''}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${address}`);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 sm:p-8 shadow-lg border border-gray-200 dark:border-gray-700 mb-8 animate-slide-down">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="shrink-0">
          <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-3xl">local_pharmacy</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
            {pharmacy.name || pharmacy.officine_name}
          </h1>
          <p className="text-sm font-semibold flex items-center gap-1 text-primary">
             <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
             Ouvert • 09:00 - 20:00
          </p>
          {pharmacy.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{pharmacy.description}</p>
          )}
        </div>
      </div>

      {/* Contact & Address Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Adresse */}
        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <span className="material-symbols-outlined text-primary shrink-0">location_on</span>
          <div className="min-w-0">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Adresse</p>
            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
              {pharmacy.street || pharmacy.address || 'Non spécifiée'}
            </p>
            {pharmacy.quartier && <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{pharmacy.quartier}</p>}
            {pharmacy.city && <p className="text-sm text-gray-600 dark:text-gray-400">{pharmacy.city}</p>}
          </div>
        </div>

        {/* Horaires */}
        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <span className="material-symbols-outlined text-primary shrink-0">schedule</span>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Horaires</p>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">09:00 - 20:00</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Lun - Sam</p>
          </div>
        </div>

        {/* Téléphone */}
        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <span className="material-symbols-outlined text-primary shrink-0">phone</span>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Téléphone</p>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">
              {pharmacy.phone || 'Non disponible'}
            </p>
          </div>
        </div>

        {/* BP */}
        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <span className="material-symbols-outlined text-primary shrink-0">business</span>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Boîte Postale</p>
            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
              {pharmacy.bp || 'Non disponible'}
            </p>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">verified</span>
          Services disponibles
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <span className="material-symbols-outlined text-primary">local_shipping</span>
            <span className="font-medium text-gray-900 dark:text-white">Livraison à domicile</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <span className="material-symbols-outlined text-primary">card_membership</span>
            <span className="font-medium text-gray-900 dark:text-white">Programme fidélité</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <span className="material-symbols-outlined text-primary">local_hospital</span>
            <span className="font-medium text-gray-900 dark:text-white">Conseils pharmaceutiques</span>
          </div>
        </div>
      </div>

      {/* Actions Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button 
          onClick={callPharmacy} 
          disabled={!pharmacy.phone}
          className="flex-1 h-12 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
        >
          <span className="material-symbols-outlined">phone</span>
          Appeler
        </button>
        <button 
          onClick={getDirections} 
          className="flex-1 h-12 rounded-lg bg-secondary dark:bg-gray-700 text-gray-900 dark:text-white font-semibold hover:bg-primary/10 hover:text-primary transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <span className="material-symbols-outlined">directions</span>
          Itinéraire
        </button>
      </div>
    </div>
  );
};

export default PharmacyDetails;
