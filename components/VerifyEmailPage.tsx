import React, { useState, useRef, useEffect } from 'react';
import { Page } from '../App';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { verifyEmail, sendVerificationCode } from '../api/auth.api';

interface VerifyEmailPageProps {
  email: string;
  onNavigate: (page: Page) => void;
}

const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ email, onNavigate }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { showToast } = useToast();
  const { loginWithTokens } = useAuth();

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...code];
    next[index] = value.slice(-1);
    setCode(next);
    setError('');
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setError('يرجى إدخال الرمز المكون من 6 أرقام');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await verifyEmail(email, fullCode);
      if (res.success) {
        showToast('تم تفعيل البريد الإلكتروني بنجاح!', 'success');
        if (res.token) {
          loginWithTokens(res);
          // App.tsx auto-redirects via auth state change
        } else {
          onNavigate('login');
        }
      } else {
        setError(res.message || 'رمز التحقق غير صحيح');
      }
    } catch {
      setError('حدث خطأ. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setIsResending(true);
    try {
      await sendVerificationCode(email);
      showToast('تم إرسال رمز جديد إلى بريدك الإلكتروني', 'success');
      setCountdown(60);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch {
      showToast('فشل إرسال الرمز. حاول مرة أخرى.', 'error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-[80vh] flex items-center justify-center py-12 px-4 relative overflow-hidden" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <div className="absolute inset-0">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#1E3A8A]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-[#DC2626]/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 dots-pattern opacity-20" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="gloss-card gloss-in bg-white/80 dark:bg-[#0d1f33]/80 p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-[#DC2626] to-[#EF4444] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#DC2626]/25 gloss-in gdelay-1">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-3xl font-black text-[#1E3A8A] mb-2 gloss-in gdelay-2">تفعيل البريد الإلكتروني</h2>
            <p className="text-[#1E3A8A]/60 text-sm leading-relaxed gloss-in gdelay-3">
              أرسلنا رمز التحقق إلى
              <br />
              <span className="font-bold text-[#1E3A8A]">{email}</span>
            </p>
          </div>

          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="flex gap-2 justify-center mb-6" dir="ltr" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  aria-label={`الرقم ${i + 1} من رمز التحقق`}
                  className="w-12 h-14 text-center text-2xl font-bold bg-[#F5F5F7] dark:bg-white/[0.06] rounded-xl border-2 border-transparent text-[#1E3A8A] focus:bg-white focus:border-[#1E3A8A]/30 focus:ring-0 transition-all duration-200 outline-none"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isLoading || code.join('').length < 6}
              className="w-full btn-primary py-4 text-lg font-bold text-white rounded-xl shadow-lg disabled:opacity-70 disabled:cursor-not-allowed hover-shine"
            >
              <span className="flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    جاري التحقق...
                  </>
                ) : 'تفعيل الحساب'}
              </span>
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-[#1E3A8A]/60 text-sm mb-2">لم تستلم الرمز؟</p>
            <button
              onClick={handleResend}
              disabled={countdown > 0 || isResending}
              className="text-[#DC2626] font-bold text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline cursor-pointer"
            >
              {isResending ? 'جاري الإرسال...' : countdown > 0 ? `إعادة الإرسال بعد ${countdown}ث` : 'إعادة إرسال الرمز'}
            </button>
          </div>

          <div className="text-center mt-4">
            <button
              onClick={() => onNavigate('login')}
              className="text-[#1E3A8A]/50 text-sm hover:text-[#1E3A8A] transition-colors duration-200 cursor-pointer"
            >
              العودة إلى تسجيل الدخول
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
