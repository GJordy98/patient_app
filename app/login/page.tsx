"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Phone, Lock, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";


const COUNTRY_CODES = [
  { code: "+237", flag: "🇨🇲", label: "CM" },
  { code: "+33", flag: "🇫🇷", label: "FR" },
  { code: "+1", flag: "🇺🇸", label: "US" },
  { code: "+225", flag: "🇨🇮", label: "CI" },
  { code: "+221", flag: "🇸🇳", label: "SN" },
  { code: "+212", flag: "🇲🇦", label: "MA" },
];

export default function LoginPage() {
  const [countryCode, setCountryCode] = useState("+237");
  const [telephone, setTelephone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!telephone.trim()) {
      setError("Veuillez saisir votre numéro de téléphone.");
      return;
    }
    if (!password) {
      setError("Veuillez saisir votre mot de passe.");
      return;
    }

    try {
      setLoading(true);
      const local = telephone.replace(/^0+/, "").replace(/^\+\d+/, "");
      const fullPhone = `${countryCode}${local}`;
      await api.login(fullPhone, password);
      window.location.href = "/";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Identifiants incorrects. Réessayez.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#22C55E] mb-4 shadow-lg shadow-green-200">
            <img src="/logo.png" alt="Logo" width={32} height={32} />
          </div>
          <h1 className="text-[28px] font-bold text-[#1E293B] leading-none">EdoctorPharma</h1>
          <p className="text-[14px] text-[#94A3B8] mt-2">Connectez-vous à votre compte patient</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8">
          {/* Error */}
          {error && (
            <div className="mb-5 flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-[13px] px-4 py-3 rounded-xl">
              <span className="shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Phone */}
            <div>
              <label className="block text-[14px] font-medium text-[#1E293B] mb-2">
                Téléphone
              </label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-[90px] px-2 py-3 bg-white border border-[#E2E8F0] rounded-lg text-[13px] font-medium text-[#1E293B] focus:outline-none focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 transition-all"
                >
                  {COUNTRY_CODES.map(({ code, flag, label }) => (
                    <option key={code} value={code}>
                      {flag} {label}
                    </option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type="tel"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="6 12 34 56 78"
                    className="w-full pl-9 pr-4 py-3 bg-white border border-[#E2E8F0] rounded-lg text-[14px] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[14px] font-medium text-[#1E293B]">Mot de passe</label>
                <Link
                  href="/forgot-password"
                  className="text-[12px] text-[#22C55E] hover:text-[#16A34A] font-medium transition-colors"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-3 bg-white border border-[#E2E8F0] rounded-lg text-[14px] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#1E293B] transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#22C55E] hover:bg-[#16A34A] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Connexion en cours…</span>
                </>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E2E8F0]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-[12px] text-[#94A3B8]">Nouveau sur EdoctorPharma ?</span>
            </div>
          </div>

          <Link
            href="/register"
            className="block w-full text-center border border-[#22C55E] text-[#22C55E] hover:bg-[#F0FDF4] font-semibold py-3 px-6 rounded-lg transition-colors duration-200 text-[14px]"
          >
            Créer un compte patient
          </Link>
        </div>
      </div>
    </div>
  );
}
