"use client";

import React, { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import {
  Pill, Check, KeyRound, CheckCircle, AlertCircle, Send,
  Phone, ShieldCheck, Lock, Eye, EyeOff, Loader2,
} from 'lucide-react';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://e-doctorpharma.onrender.com/api/v1').replace(/\/$/, '');

type Step = 'phone' | 'reset';

const formatPhone = (countryCode: string, phone: string) =>
  `${countryCode}${phone.replace(/^0+/, '')}`;

const ForgotPasswordContent = () => {
  const router = useRouter();

  const [step, setStep] = useState<Step>('phone');
  const [countryCode, setCountryCode] = useState('+237');

  const [phoneNumber, setPhoneNumber] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [otpSent, setOtpSent] = useState(false);

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

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
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
      const response = await fetch(`${API_BASE}/send-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telephone: fullPhone }),
      });

      const data = await response.json();
      console.log('📱 /send-otp/ réponse complète:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        const msg = data.message || data.detail || data.error || `Erreur ${response.status}`;
        setPhoneError(msg);
        return;
      }

      localStorage.setItem('forgotPhone', fullPhone);
      setOtpSent(true);
      setTimeout(() => setStep('reset'), 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur réseau. Vérifiez votre connexion.";
      setPhoneError(msg);
    } finally {
      setSendingOtp(false);
    }
  };

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
      const response = await fetch(`${API_BASE}/change-fogot-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telephone: fullPhone, password: newPassword }),
      });

      const data = await response.json();
      console.log('✅ /change-fogot-password/ réponse:', data);

      if (response.ok || data.status === true || data.success === true) {
        localStorage.removeItem('forgotPhone');
        setResetSuccess(true);
        setTimeout(() => router.push('/login'), 2500);
        return;
      }

      const msg = data.message || data.detail || data.error || `Erreur ${response.status}`;
      setResetError(msg);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau. Vérifiez votre connexion.';
      setResetError(msg);
    } finally {
      setResetting(false);
    }
  };

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
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="max-w-md w-full">

        {/* ── Branding ── */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4 cursor-pointer"
            onClick={() => router.push('/')}
          >
            <Pill size={32} className="text-primary" />
          </div>
          <h1 className="text-3xl font-black text-primary mb-1">e-Dr TIM</h1>
          <p className="text-gray-500 font-medium">Réinitialisation du mot de passe</p>
        </div>

        {/* ── Indicateur d'étape ── */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all
              ${step === 'phone' ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-primary/20 text-primary'}`}>
              {step === 'reset' ? <Check size={14} /> : '1'}
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

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">

          {/* ── ÉTAPE 1 ── */}
          {step === 'phone' && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50 mb-4">
                  <KeyRound size={22} className="text-amber-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Mot de passe oublié ?</h2>
                <p className="text-sm text-gray-500">
                  Entrez votre numéro de téléphone. Un code de vérification vous sera envoyé par SMS / WhatsApp.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Numéro de téléphone
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-24 py-4 px-2 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-primary/50 transition-all text-sm font-semibold text-gray-700"
                  >
                    <option value="+237">🇨🇲 +237</option>
                    <option value="+33">🇫🇷 +33</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+225">🇨🇮 +225</option>
                    <option value="+221">🇸🇳 +221</option>
                  </select>
                  <div className="relative flex-1">
                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => { setPhoneNumber(e.target.value); setPhoneError(''); }}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="6xx xxx xxx"
                      required
                    />
                  </div>
                </div>
              </div>

              {otpSent && (
                <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-xl">
                  <CheckCircle size={16} />
                  <span>Code envoyé ! Redirection en cours…</span>
                </div>
              )}

              {phoneError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl">
                  <AlertCircle size={16} />
                  <span>{phoneError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={sendingOtp || otpSent}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {sendingOtp
                  ? <Loader2 size={18} className="animate-spin" />
                  : <><Send size={18} /> Envoyer le code de vérification</>
                }
              </button>

              <div className="text-center">
                <a href="/login" className="text-sm text-primary font-semibold hover:underline">
                  ← Retour à la connexion
                </a>
              </div>
            </form>
          )}

          {/* ── ÉTAPE 2 ── */}
          {step === 'reset' && !resetSuccess && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-50 mb-4">
                  <ShieldCheck size={22} className="text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  Code OTP &amp; Nouveau mot de passe
                </h2>
                <p className="text-sm text-gray-500">
                  Un code a été envoyé au{' '}
                  <strong className="text-gray-700">{countryCode}{phoneNumber}</strong>.
                  {' '}Saisissez-le ci-dessous avec votre nouveau mot de passe.
                </p>
              </div>

              {/* OTP Boxes */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
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
                      className={`w-12 h-14 text-center text-xl font-black rounded-2xl border-2 transition-all focus:outline-none bg-gray-50
                        ${digit ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-800'}
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

              {/* New password */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nouveau mot de passe</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setResetError(''); }}
                    className="w-full pl-12 pr-14 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Minimum 6 caractères"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showNewPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Confirmer le mot de passe</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setResetError(''); }}
                    className="w-full pl-12 pr-14 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Répétez le mot de passe"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Password strength */}
              {newPassword && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1.5 rounded-full transition-all ${
                          newPassword.length >= i * 2
                            ? newPassword.length >= 8 ? 'bg-green-500' : newPassword.length >= 6 ? 'bg-amber-400' : 'bg-red-400'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">
                    Force : {newPassword.length < 6 ? 'Faible' : newPassword.length < 8 ? 'Moyenne' : 'Forte'}
                  </p>
                </div>
              )}

              {resetError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl">
                  <AlertCircle size={16} />
                  <span>{resetError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={resetting}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {resetting
                  ? <Loader2 size={18} className="animate-spin" />
                  : <><CheckCircle size={18} /> Réinitialiser le mot de passe</>
                }
              </button>

              <div className="flex justify-between text-sm">
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setOtpSent(false); }}
                  className="text-gray-500 hover:text-gray-700 font-semibold hover:underline"
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

          {/* ── SUCCÈS ── */}
          {resetSuccess && (
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Mot de passe modifié !</h2>
              <p className="text-gray-500 text-sm mb-6">
                Votre mot de passe a été réinitialisé avec succès.<br />
                Redirection vers la connexion…
              </p>
              <Loader2 size={28} className="text-primary animate-spin mx-auto" />
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
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    }>
      <ForgotPasswordContent />
    </Suspense>
  );
}
