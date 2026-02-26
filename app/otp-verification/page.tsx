"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
// Helper to check mock mode (same logic as ApiClient.isMockEnabled)
const checkMockMode = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('use_mock_api') === 'true' || !process.env.NEXT_PUBLIC_API_URL;
};

const OTPContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneFromQuery = searchParams.get('phone');

  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [resendMsg, setResendMsg] = useState('');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const storedPhone = localStorage.getItem('otpPhone') || phoneFromQuery || '';
    if (!storedPhone) {
      router.push('/register');
      return;
    }
    setPhone(storedPhone);
    // Auto-focus first input
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, [router, phoneFromQuery]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const handleInput = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (value && index === 5) {
      const code = newOtp.join('');
      if (code.length === 6) {
        handleVerify(code);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.match(/\d/g);
    if (!digits) return;

    const newOtp = [...otp];
    digits.forEach((digit, i) => {
      if (i < 6) newOtp[i] = digit;
    });
    setOtp(newOtp);

    if (digits.length >= 6) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleVerify = async (code?: string) => {
    const otpCode = code || otp.join('');
    if (otpCode.length !== 6) return;

    setVerifying(true);
    setError('');

    try {
      // Use mock mode check
      if (checkMockMode()) {
        // Simulate success in mock mode
        await new Promise(resolve => setTimeout(resolve, 1000));
        setVerified(true);
        localStorage.removeItem('otpPhone');
        localStorage.removeItem('otpEmail');
        setTimeout(() => router.push('/login'), 1500);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://e-doctorpharma.onrender.com/api/v1'}/valid-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpCode, telephone: phone })
      });

      const data = await response.json();

      if (response.ok) {
        setVerified(true);
        if (data.access) localStorage.setItem('access_token', data.access);
        if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
        localStorage.removeItem('otpPhone');
        localStorage.removeItem('otpEmail');
        setTimeout(() => router.push('/login'), 1500);
      } else {
        const msg = data.message || data.error || data.detail || 'Code OTP invalide';
        setError(msg);
        setOtp(Array(6).fill(''));
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError('Erreur de connexion. Vérifiez votre internet.');
      setOtp(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setCanResend(false);
    setCountdown(60);
    setResendMsg('');

    try {
      if (checkMockMode()) {
        setResendMsg('✓ Code renvoyé (mode test)');
        setTimeout(() => setResendMsg(''), 3000);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://e-doctorpharma.onrender.com/api/v1'}/send-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telephone: phone })
      });

      if (response.ok) {
        setResendMsg('✓ Code renvoyé avec succès');
      } else {
        const data = await response.json();
        setError(data.message || 'Impossible de renvoyer le code');
        setCanResend(true);
        setCountdown(0);
      }
    } catch {
      setError('Erreur de connexion');
      setCanResend(true);
      setCountdown(0);
    }

    setTimeout(() => setResendMsg(''), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify();
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-gray-50">
      {/* Header */}
      <header className="w-full bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">local_pharmacy</span>
              </div>
              <div className="flex flex-col leading-tight">
                <h2 className="text-lg font-bold text-primary">e-Dr TIM</h2>
                <p className="text-xs font-semibold text-primary/70">PHARMACY</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md mx-auto">

          <div className="text-center mb-8 animate-slide-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <span className="material-symbols-outlined text-primary text-4xl!">mark_email_read</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Vérification OTP</h1>
            <p className="mt-2 text-base text-gray-500">
              Entrez le code à 6 chiffres envoyé à<br />
              <strong className="text-gray-900">{phone || '+237 XXX XXX XXX'}</strong>
            </p>
          </div>

          <div className="bg-white shadow-xl rounded-xl p-6 sm:p-8 animate-slide-up">
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* OTP Inputs */}
              <div className="flex justify-center gap-2 sm:gap-3">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => { inputRefs.current[index] = el; }}
                    type="text"
                    maxLength={1}
                    inputMode="numeric"
                    value={digit}
                    onChange={e => handleInput(index, e.target.value)}
                    onKeyDown={e => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all outline-none
                      ${error ? 'border-red-400 bg-red-50' : digit ? 'border-primary bg-primary/5' : 'border-gray-300'}
                      focus:border-primary focus:ring-4 focus:ring-primary/10 focus:scale-105
                    `}
                  />
                ))}
              </div>

              {/* Error */}
              {error && (
                <p className="text-center text-red-600 text-sm font-medium">{error}</p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={verifying || verified}
                className={`w-full h-12 rounded-lg font-bold transition-all flex items-center justify-center gap-2
                  ${verified ? 'bg-emerald-600 text-white' : 'bg-primary text-white hover:bg-primary/90'}
                  disabled:opacity-70
                `}
              >
                {verifying ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : verified ? (
                  '✅ Vérifié !'
                ) : (
                  'Vérifier'
                )}
              </button>

              {/* Resend */}
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  Vous n&apos;avez pas reçu le code ?
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={!canResend}
                    className={`font-bold ml-1 ${canResend ? 'text-primary hover:underline' : 'text-gray-400 cursor-not-allowed'}`}
                  >
                    Renvoyer
                  </button>
                </p>
                {countdown > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Vous pourrez renvoyer dans {countdown}s
                  </p>
                )}
                {resendMsg && (
                  <p className="text-sm text-emerald-600 font-medium mt-2">{resendMsg}</p>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 border-t border-gray-200 text-center text-sm text-gray-400">
        © 2025 e-Dr Tim Pharmacy. Tous droits réservés.
      </footer>
    </div>
  );
};

export default function OTPVerificationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <OTPContent />
    </Suspense>
  );
}
