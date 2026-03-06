"use client";

import React, { useState, useEffect } from 'react';
import { Pharmacy } from '@/types/common';
import { api } from '@/lib/api-client';
import { Building2, MapPin, Clock, Phone, ShieldCheck, Truck, Award, Stethoscope, Navigation, ShieldAlert } from 'lucide-react';

interface ScheduleDay {
  day: string;
  open_time: string;
  close_time: string;
  is_guard: boolean;
}

interface PharmacyDetailsProps {
  pharmacy: Pharmacy;
}

const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_LABELS: Record<string, string> = {
  MON: 'Lundi', TUE: 'Mardi', WED: 'Mercredi',
  THU: 'Jeudi', FRI: 'Vendredi', SAT: 'Samedi', SUN: 'Dimanche',
};
const DAY_SHORT: Record<string, string> = {
  MON: 'Lun', TUE: 'Mar', WED: 'Mer',
  THU: 'Jeu', FRI: 'Ven', SAT: 'Sam', SUN: 'Dim',
};

function getTodayCode(): string {
  return DAY_CODES[new Date().getDay()];
}

function isCurrentlyOpen(s: ScheduleDay): boolean {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = s.open_time.split(':').map(Number);
  const [ch, cm] = s.close_time.split(':').map(Number);
  return cur >= oh * 60 + om && cur < ch * 60 + cm;
}

const PharmacyDetails: React.FC<PharmacyDetailsProps> = ({ pharmacy }) => {
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);

  useEffect(() => {
    if (!pharmacy.id) return;
    api.getPharmacySchedule(String(pharmacy.id))
      .then(res => {
        if (Array.isArray(res?.schedules) && res.schedules.length > 0) {
          setSchedule(res.schedules as ScheduleDay[]);
        }
      })
      .catch(() => { /* silent */ });
  }, [pharmacy.id]);

  const todayCode = getTodayCode();
  const todaySchedule = schedule.find(s => s.day === todayCode);

  const statusLabel = todaySchedule
    ? todaySchedule.is_guard
      ? { text: 'De garde', color: 'text-amber-600', dot: 'bg-amber-400' }
      : isCurrentlyOpen(todaySchedule)
        ? { text: `Ouvert • ${todaySchedule.open_time} - ${todaySchedule.close_time}`, color: 'text-[#22C55E]', dot: 'bg-[#22C55E]' }
        : { text: `Fermé · Ouvre à ${todaySchedule.open_time}`, color: 'text-red-500', dot: 'bg-red-400' }
    : null;

  const callPharmacy = () => {
    if (pharmacy.phone) window.location.href = `tel:${pharmacy.phone}`;
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
    <div className="bg-white rounded-xl p-6 sm:p-8 shadow-lg border border-gray-200 mb-8 animate-slide-down">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-200">
        <div className="shrink-0">
          <div className="w-16 h-16 bg-[#F0FDF4] rounded-xl flex items-center justify-center">
            <Building2 size={32} className="text-[#22C55E]" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
            {pharmacy.name || pharmacy.officine_name}
          </h1>
          {statusLabel ? (
            <p className={`text-sm font-semibold flex items-center gap-1 ${statusLabel.color}`}>
              <span className={`w-2 h-2 ${statusLabel.dot} rounded-full animate-pulse`}></span>
              {statusLabel.text}
            </p>
          ) : (
            <p className="text-sm text-gray-400">Horaires non disponibles</p>
          )}
          {pharmacy.description && (
            <p className="text-sm text-gray-600 mt-2">{pharmacy.description}</p>
          )}
        </div>
      </div>

      {/* Contact & Address Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
          <MapPin size={20} className="text-[#22C55E] shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs text-gray-600 mb-1">Adresse</p>
            <p className="font-semibold text-gray-900 text-sm truncate">
              {pharmacy.street || pharmacy.address || 'Non spécifiée'}
            </p>
            {pharmacy.quartier && <p className="text-sm text-gray-600 truncate">{pharmacy.quartier}</p>}
            {pharmacy.city && <p className="text-sm text-gray-600">{pharmacy.city}</p>}
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
          <Clock size={20} className="text-[#22C55E] shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs text-gray-600 mb-1">Horaires aujourd&apos;hui</p>
            {todaySchedule ? (
              <>
                <p className="font-semibold text-gray-900 text-sm">
                  {todaySchedule.open_time} - {todaySchedule.close_time}
                </p>
                {todaySchedule.is_guard && (
                  <p className="text-xs text-amber-600 font-semibold flex items-center gap-1 mt-0.5">
                    <ShieldAlert size={11} />De garde
                  </p>
                )}
              </>
            ) : (
              <p className="font-semibold text-gray-900 text-sm">—</p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
          <Phone size={20} className="text-[#22C55E] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-gray-600 mb-1">Téléphone</p>
            <p className="font-semibold text-gray-900 text-sm">
              {pharmacy.phone || 'Non disponible'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
          <Building2 size={20} className="text-[#22C55E] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-gray-600 mb-1">Boîte Postale</p>
            <p className="font-semibold text-gray-900 text-sm truncate">
              {pharmacy.bp || 'Non disponible'}
            </p>
          </div>
        </div>
      </div>

      {/* Weekly schedule */}
      {schedule.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[15px] font-bold mb-3 text-gray-900 flex items-center gap-2">
            <Clock size={16} className="text-[#22C55E]" />
            Planning hebdomadaire
          </h2>
          <div className="grid grid-cols-7 gap-1">
            {['MON','TUE','WED','THU','FRI','SAT','SUN'].map(code => {
              const s = schedule.find(x => x.day === code);
              const isToday = code === todayCode;
              return (
                <div
                  key={code}
                  className={`rounded-lg p-2 text-center text-[11px] border ${
                    isToday
                      ? 'border-[#22C55E] bg-[#F0FDF4]'
                      : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <p className={`font-bold mb-1 ${isToday ? 'text-[#22C55E]' : 'text-gray-500'}`}>
                    {DAY_SHORT[code]}
                  </p>
                  {s ? (
                    <>
                      <p className="text-gray-700 leading-tight">{s.open_time}</p>
                      <p className="text-gray-400 text-[10px]">—</p>
                      <p className="text-gray-700 leading-tight">{s.close_time}</p>
                      {s.is_guard && (
                        <p className="text-amber-500 text-[9px] font-bold mt-1">Garde</p>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-300 text-[10px] mt-1">—</p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">
            {DAY_LABELS[todayCode]} en surbrillance
          </p>
        </div>
      )}

      {/* Services */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4 text-gray-900 flex items-center gap-2">
          <ShieldCheck size={20} className="text-[#22C55E]" />
          Services disponibles
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F0FDF4] border border-[#22C55E]/20">
            <Truck size={20} className="text-[#22C55E]" />
            <span className="font-medium text-gray-900">Livraison à domicile</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F0FDF4] border border-[#22C55E]/20">
            <Award size={20} className="text-[#22C55E]" />
            <span className="font-medium text-gray-900">Programme fidélité</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F0FDF4] border border-[#22C55E]/20">
            <Stethoscope size={20} className="text-[#22C55E]" />
            <span className="font-medium text-gray-900">Conseils pharmaceutiques</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={callPharmacy}
          disabled={!pharmacy.phone}
          className="flex-1 h-12 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-white font-semibold active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
        >
          <Phone size={18} />
          Appeler
        </button>
        <button
          onClick={getDirections}
          className="flex-1 h-12 rounded-lg border-2 border-[#22C55E] text-[#22C55E] font-semibold hover:bg-[#22C55E] hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <Navigation size={18} />
          Itinéraire
        </button>
      </div>
    </div>
  );
};

export default PharmacyDetails;
