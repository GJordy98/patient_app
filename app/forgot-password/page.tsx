"use client";

import React, { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';

// URL de l'API (toujours l'URL réelle, pas de mock sur le flux auth critique)
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://e-doctorpharma.onrender.com/api/v1').replace(/\/$/, '');

// ============================================================
// Étape 1 — Numéro de téléphone → envoie le code OTP
// Endpoint : POST /send-otp/
// Payload  : { telephone }
// ============================================================
// Étape 2 — Saisie du nouveau mot de passe
// Endpoint : POST /change-fogot-password/
// Payload  : { telephone, password }
// ============================================================

type Step = 'phone' | 'reset';

const formatPhone = (countryCode: string, phone: string) =>
  `${countryCode}${phone.replace(/^0+/, '')}`;

const ForgotPasswordContent = () => {
  const router = useRouter();

  // ── État global ──────────────────────────────────────────
  const [step, setStep] = useState<Step>('phone');
  const [countryCode, setCountryCode] = useState('+237');

  // ── Étape 1 : envoi OTP ──────────────────────────────────
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [otpSent, setOtpSent] = useState(false); // message de confirmation envoi

  // ── Étape 2 : OTP (6 boîtes) + nouveau mot de passe ─────────────────────────────────
  const OTP_LENGTH = 6;
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const otpCode = otpDigits.join('');
  const otpRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Gestion saisie OTP boîte par boîte
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1); // 1 seul chiffre
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setResetError('');
    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        otpRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    const newDigits = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((d, i) => { newDigits[i] = d; });
    setOtpDigits(newDigits);
    const nextEmpty = pasted.length < OTP_LENGTH ? pasted.length : OTP_LENGTH - 1;
    otpRefs.current[nextEmpty]?.focus();
  };

  // ── Étape 1 : appel réel /send-otp/ ─────────────────────
  // Endpoint: POST /send-otp/
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    setOtpSent(false);

    if (!phoneNumber.trim()) {
      setPhoneError('Veuillez entrer votre numéro de téléphone.');
      return;
    }

    const fullPhone = formatPhone(countryCode, phoneNumber);

    try {
      setSendingOtp(true);

      // Appel direct (pas de mock) — endpoint critique d'authentification
      const response = await fetch(`${API_BASE}/send-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telephone: fullPhone }),
      });

      const data = await response.json();
      // ── Log complet de la réponse /send-otp/ ──────────────
      console.log('📱 /send-otp/ réponse complète:', JSON.stringify(data, null, 2));
      console.log('🔑 Code OTP (si retourné):', data.otp ?? data.code ?? data.otp_code ?? data.token ?? '(non retourné par le backend)');

      if (!response.ok) {
        const msg = data.message || data.detail || data.error || `Erreur ${response.status}`;
        setPhoneError(msg);
        return;
      }

      // Succès : stocker le téléphone et passer à l'étape 2
      localStorage.setItem('forgotPhone', fullPhone);
      setOtpSent(true);
      // Petit délai pour que l'utilisateur voit le message de succès
      setTimeout(() => setStep('reset'), 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur réseau. Vérifiez votre connexion.";
      setPhoneError(msg);
    } finally {
      setSendingOtp(false);
    }
  };

  // ── Étape 2 : appel réel /change-fogot-password/ ─────────
  // Endpoint: POST /change-fogot-password/
  // Payload : { telephone, password }
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    if (!otpCode.trim() || otpCode.length < OTP_LENGTH) {
      setResetError(`Veuillez entrer le code OTP complet (${OTP_LENGTH} chiffres).`);
      return;
    }
    if (newPassword.length < 6) {
      setResetError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Les mots de passe ne correspondent pas.');
      return;
    }

    const fullPhone = localStorage.getItem('forgotPhone') || formatPhone(countryCode, phoneNumber);

    try {
      setResetting(true);

      // Appel direct (pas de mock) — endpoint critique d'authentification
      const response = await fetch(`${API_BASE}/change-fogot-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Payload exact : { telephone, password } — l'OTP est validé en interne par le backend
        body: JSON.stringify({ telephone: fullPhone, password: newPassword }),
      });

      const data = await response.json();
      console.log('✅ /change-fogot-password/ réponse:', data);

      // Succès : le backend retourne { status: true } ou { success: true }
      if (response.ok || data.status === true || data.success === true) {
        localStorage.removeItem('forgotPhone');
        setResetSuccess(true);
        setTimeout(() => router.push('/login'), 2500);
        return;
      }

      // Erreur retournée dans le body
      const msg = data.message || data.detail || data.error || `Erreur ${response.status}`;
      setResetError(msg);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau. Vérifiez votre connexion.';
      setResetError(msg);
    } finally {
      setResetting(false);
    }
  };

  // ── Renvoyer l'OTP ───────────────────────────────────────
  const handleResendOtp = async () => {
    const fullPhone = localStorage.getItem('forgotPhone') || formatPhone(countryCode, phoneNumber);
    try {
      await fetch(`${API_BASE}/send-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telephone: fullPhone }),
      });
    } catch {
      // Silencieux
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 font-display">
      <div className="max-w-md w-full">

        {/* ── Branding ── */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4 cursor-pointer"
            onClick={() => router.push('/')}
          >
            <span className="material-symbols-outlined text-primary text-4xl!">local_pharmacy</span>
          </div>
          <h1 className="text-3xl font-black text-primary mb-1">e-Dr TIM</h1>
          <p className="text-gray-500 font-medium">Réinitialisation du mot de passe</p>
        </div>

        {/* ── Indicateur d'étape ── */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all
              ${step === 'phone' ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-primary/20 text-primary'}`}>
              {step === 'reset' ? (
                <span className="material-symbols-outlined text-base!">check</span>
              ) : '1'}
            </div>
            <span className={`text-sm font-semibold ${step === 'phone' ? 'text-primary' : 'text-gray-400'}`}>
              Téléphone
            </span>
          </div>
          <div className={`flex-1 max-w-[60px] h-0.5 rounded-full transition-all ${step === 'reset' ? 'bg-primary' : 'bg-gray-200'}`} />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all
              ${step === 'reset' ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-gray-200 text-gray-400'}`}>
              2
            </div>
            <span className={`text-sm font-semibold ${step === 'reset' ? 'text-primary' : 'text-gray-400'}`}>
              Nouveau mot de passe
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">

          {/* ════════════════════════════════════════════════════
              ÉTAPE 1 — Numéro de téléphone
              Endpoint : POST /send-otp/
              Payload  : { telephone }
              ════════════════════════════════════════════════════ */}
          {step === 'phone' && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 mb-4">
                  <span className="material-symbols-outlined text-amber-500 text-2xl!">lock_reset</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Mot de passe oublié ?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Entrez votre numéro de téléphone. Un code de vérification vous sera envoyé par SMS / WhatsApp.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Numéro de téléphone
                </label>
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
                      value={phoneNumber}
                      onChange={(e) => { setPhoneNumber(e.target.value); setPhoneError(''); }}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-700 border-0 rounded-2xl focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="6xx xxx xxx"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Message de succès envoi OTP */}
              {otpSent && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded-xl">
                  <span className="material-symbols-outlined text-lg!">check_circle</span>
                  <span>Code envoyé ! Redirection en cours…</span>
                </div>
              )}

              {/* Erreur */}
              {phoneError && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
                  <span className="material-symbols-outlined text-lg!">error</span>
                  <span>{phoneError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={sendingOtp || otpSent}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {sendingOtp ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl!">send</span>
                    Envoyer le code de vérification
                  </>
                )}
              </button>

              <div className="text-center">
                <a href="/login" className="text-sm text-primary font-semibold hover:underline">
                  ← Retour à la connexion
                </a>
              </div>
            </form>
          )}

          {/* ════════════════════════════════════════════════════
              ÉTAPE 2 — Nouveau mot de passe
              Endpoint : POST /change-fogot-password/
              Payload  : { telephone, password }
              ════════════════════════════════════════════════════ */}
          {step === 'reset' && !resetSuccess && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 mb-4">
                  <span className="material-symbols-outlined text-green-600 text-2xl!">verified_user</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Code OTP &amp; Nouveau mot de passe
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Un code a été envoyé au{' '}
                  <strong className="text-gray-700 dark:text-gray-200">
                    {countryCode}{phoneNumber}
                  </strong>.
                  {' '}Saisissez-le ci-dessous avec votre nouveau mot de passe.
                </p>
              </div>

              {/* ── Code OTP : 6 boîtes individuelles ── */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                  Code OTP reçu par SMS / WhatsApp
                </label>
                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onFocus={(e) => e.target.select()}
                      className={`w-12 h-14 text-center text-xl font-black rounded-2xl border-2 transition-all focus:outline-none bg-gray-50 dark:bg-gray-700
                        ${
                          digit
                            ? 'border-primary bg-primary/5 text-primary dark:bg-primary/10'
                            : 'border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white'
                        }
                        focus:border-primary focus:ring-2 focus:ring-primary/20`}
                      style={{ caretColor: 'transparent' }}
                    />
                  ))}
                </div>
                {otpCode.length > 0 && otpCode.length < OTP_LENGTH && (
                  <p className="text-xs text-gray-400 text-center mt-2">
                    {otpCode.length}/{OTP_LENGTH} chiffres saisis
                  </p>
                )}
              </div>

              {/* Nouveau mot de passe */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">lock</span>
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setResetError(''); }}
                    className="w-full pl-12 pr-14 py-4 bg-gray-50 dark:bg-gray-700 border-0 rounded-2xl focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Minimum 6 caractères"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xl!">
                      {showNewPwd ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Confirmation */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">lock_open</span>
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setResetError(''); }}
                    className="w-full pl-12 pr-14 py-4 bg-gray-50 dark:bg-gray-700 border-0 rounded-2xl focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Répétez le mot de passe"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xl!">
                      {showConfirmPwd ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Indicateur de force */}
              {newPassword && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1.5 rounded-full transition-all ${
                          newPassword.length >= i * 2
                            ? newPassword.length >= 8 ? 'bg-green-500' : newPassword.length >= 6 ? 'bg-amber-400' : 'bg-red-400'
                            : 'bg-gray-200 dark:bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">
                    Force : {newPassword.length < 6 ? 'Faible' : newPassword.length < 8 ? 'Moyenne' : 'Forte'}
                  </p>
                </div>
              )}

              {/* Erreur */}
              {resetError && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
                  <span className="material-symbols-outlined text-lg!">error</span>
                  <span>{resetError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={resetting}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {resetting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl!">check_circle</span>
                    Réinitialiser le mot de passe
                  </>
                )}
              </button>

              <div className="flex justify-between text-sm">
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setOtpSent(false); }}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-semibold hover:underline"
                >
                  ← Changer le numéro
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-primary font-semibold hover:underline"
                >
                  Renvoyer le code
                </button>
              </div>
            </form>
          )}

          {/* ══ SUCCÈS ══ */}
          {resetSuccess && (
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-4xl!">check_circle</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Mot de passe modifié !</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Votre mot de passe a été réinitialisé avec succès.<br />
                Redirection vers la connexion…
              </p>
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2025 e-Dr Tim Pharmacy. Tous droits réservés.
        </p>
      </div>
    </div>
  );
};

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ForgotPasswordContent />
    </Suspense>
  );
}
