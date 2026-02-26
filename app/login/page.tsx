"use client";

import React, { useState } from 'react';
import { api } from '@/lib/api-client';

const LoginPage = () => {
  const [telephone, setTelephone] = useState('');
  const [countryCode, setCountryCode] = useState('+237');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      // On construit le numéro complet ici (ex: +237612345678)
      // et on le passe directement — api.login ne le reformatera plus
      const localNumber = telephone.replace(/^0+/, '').replace(/^\+237/, '');
      const fullPhone = `${countryCode}${localNumber}`;
      await api.login(fullPhone, password);
      window.location.href = '/';
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de connexion';
      alert(`Échec de connexion : ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 font-display">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
        {/* Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <span className="material-symbols-outlined text-primary text-4xl!">local_pharmacy</span>
          </div>
          <h1 className="text-3xl font-black text-primary mb-2">e-Dr TIM</h1>
          <p className="text-gray-500 font-medium">Connectez-vous à votre compte patient</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Phone input with country code */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Téléphone</label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-24 py-4 px-2 bg-gray-50 dark:bg-gray-700 border-0 rounded-2xl focus:ring-2 focus:ring-primary/50 transition-all text-sm font-semibold text-gray-700 dark:text-gray-200"
              >
                <option value="+237">🇨🇲 +237</option>
                <option value="+33">🇫🇷 +33</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+225">🇨🇮 +225</option>
                <option value="+221">🇸🇳 +221</option>
              </select>
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">phone</span>
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-700 border-0 rounded-2xl focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="6xx xxx xxx"
                  required
                />
              </div>
            </div>
          </div>

          {/* Password with visibility toggle */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Mot de passe</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">lock</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-14 py-4 bg-gray-50 dark:bg-gray-700 border-0 rounded-2xl focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <span className="material-symbols-outlined text-xl!">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Forgot password link — redirige vers la page dédiée */}
          <div className="text-right">
            <a
              href="/forgot-password"
              className="text-sm text-primary font-semibold hover:underline"
            >
              Mot de passe oublié ?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Se connecter'}
          </button>
        </form>

        <div className="mt-8 text-center pt-8 border-t border-gray-100 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400">
            Pas encore de compte ?{' '}
            <a href="/register" className="text-primary font-bold hover:underline">Créer un compte</a>
          </p>
        </div>
      </div>


    </div>
  );
};

export default LoginPage;
