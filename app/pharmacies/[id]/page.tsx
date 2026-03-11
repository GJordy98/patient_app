"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { Pharmacy } from '@/types/common';
import PharmacyDetails from '@/components/pharmacies/PharmacyDetails';
import ProductCatalog from '@/components/pharmacies/ProductCatalog';
import PrescriptionUpload from '@/components/pharmacies/PrescriptionUpload';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { AlertCircle, ArrowLeft, Clock, Loader2 } from 'lucide-react';

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
      .then(res => { if (res.schedules) setSchedule(res.schedules as unknown as ScheduleDay[]); })
      .catch(() => { /* silencieux — horaires optionnels */ });
  }, [id]);

  return (
    <>
      <Header />

      {/* Chargement */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Loader2 size={48} className="text-[#22C55E] animate-spin mb-4" />
          <p className="text-gray-600 font-semibold text-lg">Chargement de la pharmacie...</p>
        </div>
      )}

      {/* Erreur */}
      {!loading && (error || !pharmacy) && (
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-2xl mx-auto">
            <AlertCircle size={56} className="text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-red-900 mb-4">Erreur de chargement</h1>
            <p className="text-red-700 mb-6">{error || "La pharmacie est introuvable."}</p>
            <Link
              href="/pharmacies"
              className="px-6 py-3 bg-[#22C55E] text-white rounded-lg hover:bg-[#16A34A] transition-colors font-semibold"
            >
              Retour à la liste
            </Link>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      {!loading && pharmacy && (
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Bouton retour */}
          <Link
            href="/pharmacies"
            className="flex items-center gap-2 text-gray-600 hover:text-[#22C55E] mb-6 transition-colors group w-fit"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Toutes les Pharmacies</span>
          </Link>

          <PharmacyDetails pharmacy={pharmacy} />

          {/* Horaires d'ouverture */}
          {schedule && schedule.length > 0 && (
            <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] flex items-center justify-center">
                  <Clock size={20} className="text-[#22C55E]" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Horaires d&apos;ouverture</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {DAY_ORDER.map(dayKey => {
                  const day = schedule.find(d => d.day?.toLowerCase() === dayKey);
                  if (!day) return null;
                  return (
                    <div key={dayKey} className="px-6 py-3 flex items-center justify-between">
                      <span className="font-semibold text-sm text-gray-700 w-28">{DAY_LABELS[dayKey]}</span>
                      {day.is_open ? (
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-gray-800">
                            {day.opening_time} – {day.closing_time}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#F0FDF4] text-[#22C55E]">Ouvert</span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-500">Fermé</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <ProductCatalog pharmacyId={pharmacy.id} />

          <PrescriptionUpload
            pharmacyId={String(pharmacy.id)}
            pharmacyName={pharmacy.name || pharmacy.officine_name || undefined}
          />
        </main>
      )}

      <Footer />
    </>
  );
};

export default PharmacyDetailsPage;
