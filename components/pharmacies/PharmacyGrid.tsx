"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api-client';
import { Pharmacy } from '@/types/common';
import PharmacyCard from './PharmacyCard';

const PharmacyGrid = () => {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPharmacies = async () => {
      try {
        setLoading(true);
        const data = await api.getAllPharmacies();
        setPharmacies(Array.isArray(data) ? data : data.results || []);
        setError(null);
      } catch (err: unknown) {
        console.error('Error fetching pharmacies:', err);
        setError('Impossible de charger les pharmacies.');
      } finally {
        setLoading(false);
      }
    };

    fetchPharmacies();
  }, []);

  const cities = useMemo(() => {
    const uniqueCities = new Set(pharmacies.map(p => p.city).filter(Boolean));
    return Array.from(uniqueCities).sort();
  }, [pharmacies]);

  const filteredPharmacies = useMemo(() => {
    return pharmacies.filter(p => {
      const matchesSearch = (p.name || p.officine_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (p.address || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (p.quartier || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCity = !selectedCity || p.city === selectedCity;
      return matchesSearch && matchesCity;
    });
  }, [pharmacies, searchQuery, selectedCity]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400 font-semibold text-lg">Chargement des pharmacies...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 font-semibold mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Search & Filters */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <div className="flex items-stretch w-full rounded-lg shadow-sm border-2 border-primary focus-within:ring-2 focus-within:ring-primary/50 transition-all">
            <div className="flex items-center justify-center px-4 bg-primary/5">
              <span className="material-symbols-outlined text-primary">search</span>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 h-12 px-4 bg-white dark:bg-gray-800 border-0 rounded-r-lg focus:outline-none"
              placeholder="Rechercher une pharmacie par nom, ville ou adresse..."
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <select 
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="px-4 py-2 rounded-full border-2 border-primary bg-white dark:bg-gray-800 text-sm font-medium text-primary hover:bg-primary/5 focus:border-primary focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer" 
          >
            <option value="">Toutes les villes</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          
          <button 
            onClick={() => {
              setLoading(true);
              // Re-fetch logic or just reset state if needed
              window.location.reload();
            }}
            className="px-4 py-2 rounded-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-primary hover:text-primary transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg!">refresh</span>
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      {filteredPharmacies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPharmacies.map(pharmacy => (
            <PharmacyCard key={pharmacy.id} pharmacy={pharmacy} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-6xl mb-4 block">location_off</span>
          <h3 className="text-xl font-bold text-gray-600 dark:text-gray-400 mb-2">Aucune pharmacie trouvée</h3>
          <p className="text-gray-500 dark:text-gray-400">Essayez de modifier vos critères de recherche.</p>
        </div>
      )}
    </div>
  );
};

export default PharmacyGrid;
