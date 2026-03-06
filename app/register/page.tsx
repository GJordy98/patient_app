"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Eye, EyeOff, Phone, Lock, User, Mail, Loader2, CheckCircle, XCircle } from "lucide-react";
import { api } from "@/lib/api-client";

const COUNTRY_CODES = [
  { code: "+237", flag: "🇨🇲", label: "CM" },
  { code: "+33",  flag: "🇫🇷", label: "FR" },
  { code: "+1",   flag: "🇺🇸", label: "US" },
  { code: "+225", flag: "🇨🇮", label: "CI" },
  { code: "+221", flag: "🇸🇳", label: "SN" },
  { code: "+212", flag: "🇲🇦", label: "MA" },
];

export default function RegisterPage() {
  const [countryCode, setCountryCode] = useState("+237");
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    telephone: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const passwordRules = useMemo(() => [
    { label: "8 caractères minimum",      met: form.password.length >= 8 },
    { label: "Une majuscule",              met: /[A-Z]/.test(form.password) },
    { label: "Un chiffre",                 met: /[0-9]/.test(form.password) },
    { label: "Un caractère spécial",       met: /[^A-Za-z0-9]/.test(form.password) },
  ], [form.password]);

  const strengthScore = passwordRules.filter((r) => r.met).length;
  const strengthColor = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-[#22C55E]"][strengthScore - 1] ?? "bg-[#E2E8F0]";
  const strengthLabel = ["Faible", "Moyen", "Bon", "Excellent"][strengthScore - 1] ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm_password) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (strengthScore < 4) {
      setError("Votre mot de passe ne respecte pas tous les critères de sécurité.");
      return;
    }

    try {
      setLoading(true);
      const fullPhone = `${countryCode}${form.telephone.replace(/^0+/, "")}`;
      localStorage.setItem("otpPhone", fullPhone);
      await api.register({
        first_name: form.first_name,
        last_name: form.last_name,
        telephone: fullPhone,
        email: form.email,
        password: form.password,
        role: "PATIENT",
      });
      window.location.href = "/otp-verification";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création du compte.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#22C55E] mb-4 shadow-lg shadow-green-200">
            <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
              <path d="M18 4v28M4 18h28" stroke="white" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-[28px] font-bold text-[#1E293B]">Créer votre compte</h1>
          <p className="text-[14px] text-[#94A3B8] mt-2">Rejoignez EdoctorPharma</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8">
          {error && (
            <div className="mb-5 flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-[13px] px-4 py-3 rounded-xl">
              <span className="shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nom + Prénom */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[14px] font-medium text-[#1E293B] mb-2">Prénom</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={set("first_name")}
                    placeholder="Jean"
                    required
                    className="w-full pl-9 pr-4 py-3 border border-[#E2E8F0] rounded-lg text-[14px] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#1E293B] mb-2">Nom</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={set("last_name")}
                    placeholder="Dupont"
                    required
                    className="w-full pl-9 pr-4 py-3 border border-[#E2E8F0] rounded-lg text-[14px] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-[14px] font-medium text-[#1E293B] mb-2">Téléphone</label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-[90px] px-2 py-3 border border-[#E2E8F0] rounded-lg text-[13px] font-medium text-[#1E293B] focus:outline-none focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 transition-all"
                >
                  {COUNTRY_CODES.map(({ code, flag, label }) => (
                    <option key={code} value={code}>{flag} {label}</option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type="tel"
                    value={form.telephone}
                    onChange={set("telephone")}
                    placeholder="6 12 34 56 78"
                    required
                    className="w-full pl-9 pr-4 py-3 border border-[#E2E8F0] rounded-lg text-[14px] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[14px] font-medium text-[#1E293B] mb-2">Adresse e-mail</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="jean.dupont@email.com"
                  required
                  className="w-full pl-9 pr-4 py-3 border border-[#E2E8F0] rounded-lg text-[14px] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 transition-all"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-[14px] font-medium text-[#1E293B] mb-2">Mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-10 py-3 border border-[#E2E8F0] rounded-lg text-[14px] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#1E293B] transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength */}
              {form.password && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all ${i <= strengthScore ? strengthColor : "bg-[#E2E8F0]"}`}
                        />
                      ))}
                    </div>
                    {strengthLabel && (
                      <span className="ml-3 text-[12px] font-medium text-[#94A3B8]">{strengthLabel}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {passwordRules.map((rule) => (
                      <div key={rule.label} className="flex items-center gap-1.5">
                        {rule.met ? (
                          <CheckCircle size={12} className="text-[#22C55E] shrink-0" />
                        ) : (
                          <XCircle size={12} className="text-[#E2E8F0] shrink-0" />
                        )}
                        <span className={`text-[11px] ${rule.met ? "text-[#22C55E]" : "text-[#94A3B8]"}`}>
                          {rule.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirmer mot de passe */}
            <div>
              <label className="block text-[14px] font-medium text-[#1E293B] mb-2">Confirmer le mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={form.confirm_password}
                  onChange={set("confirm_password")}
                  placeholder="••••••••"
                  required
                  className={`w-full pl-9 pr-10 py-3 border rounded-lg text-[14px] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 transition-all ${
                    form.confirm_password && form.confirm_password !== form.password
                      ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20"
                      : "border-[#E2E8F0] focus:border-[#22C55E] focus:ring-[#22C55E]/20"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#1E293B] transition-colors"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.confirm_password && form.confirm_password !== form.password && (
                <p className="mt-1 text-[12px] text-[#EF4444]">Les mots de passe ne correspondent pas.</p>
              )}
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
                  <span>Création en cours…</span>
                </>
              ) : (
                "Créer mon compte"
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-[13px] text-[#94A3B8]">
            Déjà inscrit ?{" "}
            <Link href="/login" className="text-[#22C55E] hover:text-[#16A34A] font-medium">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
