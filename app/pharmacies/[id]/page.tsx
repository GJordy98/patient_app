"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { Pharmacy } from '@/types/common';
import PharmacyDetails from '@/components/pharmacies/PharmacyDetails';
import ProductCatalog from '@/components/pharmacies/ProductCatalog';
import PrescriptionUpload from '@/components/pharmacies/PrescriptionUpload';
import Footer from '@/components/layout/Footer';

const DAY_LABELS: Record<string, string> = {
  monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi',
  thursday: 'Jeudi', friday: 'Vendredi', saturday: 'Samedi', sunday: 'Dimanche',
};
const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

interface ScheduleDay { day: string; opening_time: string; closing_time: string; is_open: boolean; }

const PharmacyDetailsPage = () => {
  const { id } = useParams();
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Story 1.6 — Horaires d'ouverture
  const [schedule, setSchedule] = useState<ScheduleDay[] | null>(null);

  useEffect(() => {
    const fetchPharmacy = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await api.getPharmacyDetails(id as string);
        setPharmacy(data);
        setError(null);
      } catch (err: unknown) {
        console.error('Error fetching pharmacy details:', err);
        setError("Impossible de charger les détails de la pharmacie.");
      } finally {
        setLoading(false);
      }
    };

    fetchPharmacy();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    api.getPharmacySchedule(id as string)
      .then(res => { if (res.schedule) setSchedule(res.schedule); })
      .catch(() => { /* silencieux — horaires optionnels */ });
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400 font-semibold text-lg">Chargement de la pharmacie...</p>
      </div>
    );
  }

  if (error || !pharmacy) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 max-w-2xl mx-auto">
          <span className="material-symbols-outlined text-red-600 text-6xl mb-4">error</span>
          <h1 className="text-2xl font-bold text-red-900 dark:text-red-200 mb-4">Erreur de chargement</h1>
          <p className="text-red-700 dark:text-red-300 mb-6">{error || "La pharmacie est introuvable."}</p>
          <Link 
            href="/pharmacies"
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link 
        href="/pharmacies" 
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary mb-6 transition-colors group w-fit"
      >
        <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
        <span className="font-medium">Toutes les Pharmacies</span>
      </Link>

      <PharmacyDetails pharmacy={pharmacy} />

      {/* Horaires d'ouverture — Story 1.6 */}
      {schedule && schedule.length > 0 && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-r from-primary/10 to-green-100 dark:from-primary/20 dark:to-green-900/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-xl">schedule</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Horaires d&apos;ouverture</h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {DAY_ORDER.map(dayKey => {
              const day = schedule.find(d => d.day?.toLowerCase() === dayKey);
              if (!day) return null;
              return (
                <div key={dayKey} className="px-6 py-3 flex items-center justify-between">
                  <span className="font-semibold text-sm text-gray-700 dark:text-gray-300 w-28">{DAY_LABELS[dayKey]}</span>
                  {day.is_open ? (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-gray-800 dark:text-gray-200">
                        {day.opening_time} – {day.closing_time}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Ouvert</span>
                    </div>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 dark:bg-red-900/20 text-red-500">Fermé</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ProductCatalog pharmacyId={pharmacy.id} />
      
      <PrescriptionUpload />
    </main>
    <Footer />
    </>
  );
};

export default PharmacyDetailsPage;
