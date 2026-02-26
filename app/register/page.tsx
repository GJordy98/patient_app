/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useState, useMemo } from 'react';
import { api } from '@/lib/api-client';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    telephone: '',
    password: '',
    confirm_password: '',
    email: ''
  });
  const [countryCode, setCountryCode] = useState('+237');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password strength rules
  const passwordRules = useMemo(() => {
    const pw = formData.password;
    return [
      { label: 'Au moins 8 caractères', met: pw.length >= 8 },
      { label: 'Au moins une majuscule', met: /[A-Z]/.test(pw) },
      { label: 'Au moins un chiffre', met: /[0-9]/.test(pw) },
      { label: 'Au moins un caractère spécial (!@#$...)', met: /[^A-Za-z0-9]/.test(pw) },
    ];
  }, [formData.password]);

  const rulesMet = passwordRules.filter(r => r.met).length;

  const strengthPercent = (rulesMet / passwordRules.length) * 100;
  const strengthColor =
    rulesMet <= 1 ? 'bg-red-500' :
    rulesMet === 2 ? 'bg-orange-500' :
    rulesMet === 3 ? 'bg-yellow-500' :
    'bg-green-500';
  const strengthLabel =
    rulesMet <= 1 ? 'Faible' :
    rulesMet === 2 ? 'Moyen' :
    rulesMet === 3 ? 'Bon' :
    'Excellent';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirm_password) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }
    if (rulesMet < 4) {
      alert('Votre mot de passe ne remplit pas tous les critères de sécurité');
      return;
    }
    if (!acceptTerms) {
      alert('Veuillez accepter les conditions générales d\'utilisation');
      return;
    }

    try {
      setLoading(true);
      const fullPhone = `${countryCode}${formData.telephone.replace(/^0+/, '')}`;

      // Envoyer uniquement les champs requis par le backend (role géré côté serveur)
      await api.register({
        first_name: formData.first_name,
        last_name: formData.last_name,
        telephone: fullPhone,
        email: formData.email,
        password: formData.password,
      });
      // Redirect to OTP verification after successful registration
      window.location.href = '/otp-verification';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la création du compte';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 font-display">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
        {/* Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <span className="material-symbols-outlined text-primary text-4xl!">local_pharmacy</span>
          </div>
          <h1 className="text-3xl font-black text-primary mb-2">Inscription</h1>
          <p className="text-gray-500 font-medium">Rejoignez e-Dr TIM aujourd'hui</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First + Last name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Prénom</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nom</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                required
              />
            </div>
          </div>

          {/* Phone with country code */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Téléphone</label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-24 py-3 px-2 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all text-sm font-semibold text-gray-700 dark:text-gray-200"
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
                  value={formData.telephone}
                  onChange={(e) => setFormData({...formData, telephone: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="6xx xxx xxx"
                  required
                />
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">mail</span>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="votre@email.com"
                required
              />
            </div>
          </div>

          {/* Password with show/hide */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Mot de passe</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">lock</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full pl-12 pr-14 py-3 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
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

            {/* Password Strength Meter */}
            {formData.password.length > 0 && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${strengthColor}`}
                      style={{ width: `${strengthPercent}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold ${
                    rulesMet <= 1 ? 'text-red-500' :
                    rulesMet === 2 ? 'text-orange-500' :
                    rulesMet === 3 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {strengthLabel}
                  </span>
                </div>

                {/* Rules Checklist */}
                <div className="space-y-1">
                  {passwordRules.map((rule, idx) => (
                    <div key={idx} className={`flex items-center gap-2 text-xs transition-colors ${rule.met ? 'text-green-600' : 'text-gray-400'}`}>
                      <span className="material-symbols-outlined text-sm!">
                        {rule.met ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span>{rule.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password with show/hide */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Confirmer le mot de passe</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">lock</span>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirm_password}
                onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                className="w-full pl-12 pr-14 py-3 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <span className="material-symbols-outlined text-xl!">
                  {showConfirmPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {formData.confirm_password.length > 0 && formData.password !== formData.confirm_password && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm!">error</span>
                Les mots de passe ne correspondent pas
              </p>
            )}
          </div>

          {/* Terms & Conditions */}
          <div className="flex items-start gap-3 pt-2">
            <input
              type="checkbox"
              id="acceptTerms"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/50 cursor-pointer"
            />
            <label htmlFor="acceptTerms" className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer leading-relaxed">
              J'accepte les{' '}
              <a href="/faq" className="text-primary font-semibold hover:underline">
                conditions générales d'utilisation
              </a>{' '}
              et la{' '}
              <a href="/faq" className="text-primary font-semibold hover:underline">
                politique de confidentialité
              </a>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !acceptTerms}
            className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none mt-4"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "S'inscrire"}
          </button>
        </form>

        <div className="mt-8 text-center pt-8 border-t border-gray-100 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400">
            Déjà un compte ?{' '}
            <a href="/login" className="text-primary font-bold hover:underline">Se connecter</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
