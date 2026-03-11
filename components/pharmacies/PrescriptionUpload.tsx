"use client";

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api-client';
import { Pharmacy } from '@/types/common';
import { Upload, Building2, FileText, X, AlertCircle, CheckCircle, Send, Lock } from 'lucide-react';

interface PrescriptionUploadProps {
  /** Si fourni, la pharmacie est pré-sélectionnée et le sélecteur est masqué */
  pharmacyId?: string;
  pharmacyName?: string;
}

const PrescriptionUpload = ({ pharmacyId: preselectedPharmacyId, pharmacyName }: PrescriptionUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mode sélecteur : uniquement si aucune pharmacie n'est pré-sélectionnée
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState('');
  const [loadingPharmacies, setLoadingPharmacies] = useState(!preselectedPharmacyId);

  // L'ID effectif utilisé pour l'appel API
  const effectivePharmacyId = preselectedPharmacyId || selectedPharmacyId;

  useEffect(() => {
    if (preselectedPharmacyId) return; // Pas besoin de charger la liste
    const load = async () => {
      try {
        const data = await api.getNearbyPharmacies(3.8667, 11.5167);
        setPharmacies(Array.isArray(data) ? data : []);
      } catch {
        // silently fail
      } finally {
        setLoadingPharmacies(false);
      }
    };
    load();
  }, [preselectedPharmacyId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
      setSuccess(false);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!effectivePharmacyId) {
      setError('Veuillez sélectionner une pharmacie.');
      return;
    }

    try {
      setUploading(true);
      setError('');
      const result = await api.sendPrescriptionOrder(effectivePharmacyId, file, note || undefined);
      if (result.success) {
        setSuccess(true);
        setFile(null);
        setPreview(null);
        setNote('');
        if (!preselectedPharmacyId) setSelectedPharmacyId('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setError(result.message || "Erreur lors de l'envoi.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'envoi. Vérifiez votre connexion.";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-200 mt-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[#22C55E]/10 flex items-center justify-center shrink-0">
          <Upload size={24} className="text-[#22C55E]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Envoyer une ordonnance</h2>
          <p className="text-sm text-gray-500">
            {preselectedPharmacyId
              ? 'Joignez votre ordonnance — la pharmacie vous rappellera rapidement.'
              : 'Choisissez une pharmacie et joignez votre ordonnance — nous vous rappelons rapidement.'}
          </p>
        </div>
      </div>

      {/* Pharmacy — pré-sélectionnée (badge verrouillé) OU sélecteur */}
      <div className="mb-5">
        <label className="block text-sm font-bold text-gray-700 mb-2">
          <span className="flex items-center gap-1.5">
            <Building2 size={16} className="text-[#22C55E]" />
            Pharmacie destinataire <span className="text-red-500">*</span>
          </span>
        </label>

        {preselectedPharmacyId ? (
          /* Badge verrouillé — pharmacie connue depuis la page de détails */
          <div className="flex items-center gap-3 px-4 py-3 bg-[#F0FDF4] border border-[#22C55E]/30 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-[#22C55E]/15 flex items-center justify-center shrink-0">
              <Building2 size={16} className="text-[#22C55E]" />
            </div>
            <span className="flex-1 font-semibold text-sm text-gray-800 truncate">
              {pharmacyName || `Pharmacie #${preselectedPharmacyId}`}
            </span>
            <Lock size={14} className="text-[#22C55E] shrink-0" />
          </div>
        ) : loadingPharmacies ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
            <div className="w-4 h-4 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
            Chargement des pharmacies…
          </div>
        ) : (
          <select
            value={selectedPharmacyId}
            onChange={(e) => { setSelectedPharmacyId(e.target.value); setError(''); }}
            className="w-full py-3.5 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/40 focus:border-[#22C55E] transition-all text-sm font-medium text-gray-800 appearance-none"
          >
            <option value="">— Sélectionner une pharmacie —</option>
            {pharmacies.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name || p.officine_name || `Pharmacie #${p.id}`}
                {p.quartier ? ` — ${p.quartier}` : p.location ? ` — ${p.location}` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* File drop zone */}
      <div className="relative bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border-2 border-dashed border-[#22C55E]/50 hover:border-[#22C55E] p-7 transition-all mb-5">
        {!preview ? (
          <div className="flex flex-col items-center justify-center text-center">
            <Upload size={48} className="text-[#22C55E] mb-3" />
            <h3 className="text-base font-bold text-[#22C55E] mb-1">Déposez votre ordonnance ici</h3>
            <p className="text-sm text-gray-500 mb-1">ou cliquez pour parcourir</p>
            <p className="text-xs text-gray-400">PDF, JPG, PNG · Max 10 MB</p>
          </div>
        ) : (
          <div className="relative group">
            <div className="max-h-56 rounded-xl overflow-hidden border border-gray-200 bg-white">
              {file?.type === 'application/pdf' ? (
                <div className="flex items-center justify-center py-10 gap-3">
                  <FileText size={36} className="text-red-500" />
                  <span className="font-medium text-sm text-gray-700">{file.name}</span>
                </div>
              ) : (
                <Image
                  src={preview}
                  alt="Aperçu ordonnance"
                  className="w-full h-full object-contain"
                  fill
                  unoptimized
                />
              )}
            </div>
            <button
              onClick={clearFile}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.jpg,.png,.jpeg"
          className="hidden"
        />
        {!preview && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 w-full h-full cursor-pointer z-10"
            aria-label="Sélectionner un fichier"
          />
        )}
      </div>

      {/* Optional note */}
      <div className="mb-5">
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Note pour la pharmacie <span className="text-gray-400 font-normal">(optionnel)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/40 focus:border-[#22C55E] transition-all text-sm resize-none text-gray-800"
          placeholder="Ex : médicament urgent, préférence de contact WhatsApp…"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-xl text-sm animate-fade-in-up">
          <CheckCircle size={18} />
          <span>Ordonnance envoyée avec succès ! La pharmacie vous contactera bientôt.</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleUpload}
          disabled={!file || uploading || !effectivePharmacyId}
          className="w-full py-3.5 bg-[#22C55E] text-white font-bold rounded-xl shadow-md shadow-primary/25 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={18} />
          )}
          {uploading ? 'Envoi en cours…' : "Envoyer l'ordonnance à la pharmacie"}
        </button>

        {file && (
          <button
            onClick={clearFile}
            className="w-full py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all font-semibold text-sm"
          >
            Annuler
          </button>
        )}
      </div>
    </div>
  );
};

export default PrescriptionUpload;
