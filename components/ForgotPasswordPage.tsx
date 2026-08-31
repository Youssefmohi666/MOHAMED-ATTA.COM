import React, { useState, useRef, useEffect } from 'react';
import { Page } from '../App';
import { useToast } from '../contexts/ToastContext';
import { forgotPassword, resetPassword } from '../api/auth.api';

interface ForgotPasswordPageProps {
  onNavigate: (page: Page) => void;
}

type Step = 'email' | 'code' | 'newPassword';

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('يرجى إدخال البريد الإلكتروني'); return; }
    setIsLoading(true);
    setError('');
    try {
      await forgotPassword(email);
      // Always show success to avoid email enumeration
      showToast('تم إرسال رمز إعادة التعيين إلى بريدك الإلكتروني', 'success');
      setStep('code');
      setCountdown(60);
    } catch {
      setError('حدث خطأ. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...code];
    next[index] = value.slice(-1);
    setCode(next);
    setError('');
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.join('').length < 6) { setError('يرجى إدخال الرمز المكون من 6 أرقام'); return; }
    setError('');
    setStep('newPassword');
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    try {
      await forgotPassword(email);
      showToast('تم إرسال رمز جديد', 'success');
      setCountdown(60);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch {
      showToast('فشل إرسال الرمز', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (!newPassword) return 0;
    let s = 0;
    if (newPassword.length >= 8) s++;
    if (/[A-Z]/.test(newPassword)) s++;
    if (/[0-9]/.test(newPassword)) s++;
    if (/[^A-Za-z0-9]/.test(newPassword)) s++;
    return s;
  };
  const strength = getPasswordStrength();
  const strengthColors = ['', 'bg-red-400', 'bg-yellow-400', 'bg-[#DC2626]/60', 'bg-[#DC2626]'];
  const strengthLabels = ['', 'ضعيفة', 'متوسطة', 'جيدة', 'قوية'];

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) { setError('يرجى ملء جميع الحقول'); return; }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) {
      setError('كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل، وتشمل حرفاً كبيراً وحرفاً صغيراً ورقماً');
      return;
    }
    if (newPassword !== confirmPassword) { setError('كلمتا المرور غير متطابقتين'); return; }
    setIsLoading(true);
    setError('');
    try {
      const res = await resetPassword(email, code.join(''), newPassword);
      if (res.success) {
        showToast('تم إعادة تعيين كلمة المرور بنجاح!', 'success');
        onNavigate('login');
      } else {
        setError(res.message || 'فشل إعادة تعيين كلمة المرور');
        // If code was wrong, go back to code step
        if (res.message?.includes('رمز')) setStep('code');
      }
    } catch {
      setError('حدث خطأ. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-[80vh] flex items-center justify-center py-12 px-4 relative overflow-hidden" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#DC2626]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#1E3A8A]/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 dots-pattern opacity-20" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="gloss-card gloss-in bg-white/80 dark:bg-[#0d1f33]/80 p-8 md:p-10">

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {(['email', 'code', 'newPassword'] as Step[]).map((s, i) => (
              <React.Fragment key={s}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  step === s ? 'bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] text-white shadow-lg shadow-[#1E3A8A]/25' :
                  (['email', 'code', 'newPassword'].indexOf(step) > i) ? 'bg-gradient-to-br from-[#DC2626] to-[#EF4444] text-white shadow-lg shadow-[#DC2626]/25' :
                  'bg-[#DBEAFE] text-[#1E3A8A]/40'
                }`}>
                  {(['email', 'code', 'newPassword'].indexOf(step) > i) ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : i + 1}
                </div>
                {i < 2 && <div className={`flex-1 h-0.5 max-w-[40px] transition-all duration-300 ${(['email', 'code', 'newPassword'].indexOf(step) > i) ? 'bg-[#DC2626]' : 'bg-[#DBEAFE]'}`} />}
              </React.Fragment>
            ))}
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#1E3A8A]/25 gloss-in gdelay-1">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h2 className="text-3xl font-black text-[#1E3A8A] mb-2 gloss-in gdelay-2">
              {step === 'email' && 'نسيت كلمة المرور؟'}
              {step === 'code' && 'أدخل رمز التحقق'}
              {step === 'newPassword' && 'كلمة مرور جديدة'}
            </h2>
            <p className="text-[#1E3A8A]/60 text-sm gloss-in gdelay-3">
              {step === 'email' && 'أدخل بريدك الإلكتروني وسنرسل لك رمز إعادة التعيين'}
              {step === 'code' && <>أرسلنا رمزاً إلى <span className="font-bold text-[#1E3A8A]">{email}</span></>}
              {step === 'newPassword' && 'اختر كلمة مرور جديدة قوية'}
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

          {/* Step 1: Email */}
          {step === 'email' && (
            <form onSubmit={handleSendCode} className="space-y-5">
              <div>
                <label htmlFor="fp-email" className="block text-sm font-bold text-[#1E3A8A] mb-2">البريد الإلكتروني</label>
                <div className="relative">
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1E3A8A]/40">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    id="fp-email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="example@email.com"
                    className="w-full pr-12 pl-4 py-3.5 bg-[#F5F5F7] dark:bg-white/[0.06] border-2 border-transparent rounded-xl text-[#1E3A8A] placeholder:text-[#1E3A8A]/40 focus:bg-white focus:border-[#1E3A8A]/30 focus:outline-none transition-all duration-300"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary py-4 text-lg font-bold text-white rounded-xl shadow-lg disabled:opacity-70 disabled:cursor-not-allowed hover-shine"
              >
                <span className="flex items-center justify-center gap-2">
                  {isLoading ? (
                    <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>جاري الإرسال...</>
                  ) : 'إرسال رمز التحقق'}
                </span>
              </button>
            </form>
          )}

          {/* Step 2: OTP Code */}
          {step === 'code' && (
            <form onSubmit={handleVerifyCode}>
              <div className="flex gap-2 justify-center mb-6" dir="ltr" onPaste={handleCodePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleCodeChange(i, e.target.value)}
                    onKeyDown={e => handleCodeKeyDown(i, e)}
                    aria-label={`الرقم ${i + 1} من رمز التحقق`}
                    className="w-12 h-14 text-center text-2xl font-bold bg-[#F5F5F7] dark:bg-white/[0.06] rounded-xl border-2 border-transparent text-[#1E3A8A] focus:bg-white focus:border-[#1E3A8A]/30 focus:ring-0 transition-all duration-200 outline-none"
                  />
                ))}
              </div>
              <button
                type="submit"
                disabled={code.join('').length < 6}
                className="w-full btn-primary py-4 text-lg font-bold text-white rounded-xl shadow-lg disabled:opacity-70 disabled:cursor-not-allowed mb-4 hover-shine"
              >
                التحقق من الرمز
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0 || isLoading}
                  className="text-[#DC2626] font-bold text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline cursor-pointer"
                >
                  {isLoading ? 'جاري الإرسال...' : countdown > 0 ? `إعادة الإرسال بعد ${countdown}ث` : 'إعادة إرسال الرمز'}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 'newPassword' && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label htmlFor="new-pass" className="block text-sm font-bold text-[#1E3A8A] mb-2">كلمة المرور الجديدة</label>
                <div className="relative">
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1E3A8A]/40">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    id="new-pass"
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setError(''); }}
                    placeholder="••••••••"
                    className="w-full pr-12 pl-4 py-3.5 bg-[#F5F5F7] dark:bg-white/[0.06] border-2 border-transparent rounded-xl text-[#1E3A8A] placeholder:text-[#1E3A8A]/40 focus:bg-white focus:border-[#1E3A8A]/30 focus:outline-none transition-all duration-300"
                  />
                </div>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4].map(l => (
                    <div key={l} className={`h-1 flex-1 rounded transition-all duration-300 ${strength >= l ? strengthColors[strength] : 'bg-[#DBEAFE]'}`} />
                  ))}
                </div>
                {newPassword && <p className="text-xs text-[#1E3A8A]/50 mt-1">كلمة مرور {strengthLabels[strength]}</p>}
              </div>
              <div>
                <label htmlFor="confirm-pass" className="block text-sm font-bold text-[#1E3A8A] mb-2">تأكيد كلمة المرور</label>
                <div className="relative">
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1E3A8A]/40">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    id="confirm-pass"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                    placeholder="••••••••"
                    className="w-full pr-12 pl-4 py-3.5 bg-[#F5F5F7] dark:bg-white/[0.06] border-2 border-transparent rounded-xl text-[#1E3A8A] placeholder:text-[#1E3A8A]/40 focus:bg-white focus:border-[#1E3A8A]/30 focus:outline-none transition-all duration-300"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary py-4 text-lg font-bold text-white rounded-xl shadow-lg disabled:opacity-70 disabled:cursor-not-allowed hover-shine"
              >
                <span className="flex items-center justify-center gap-2">
                  {isLoading ? (
                    <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>جاري الحفظ...</>
                  ) : 'حفظ كلمة المرور الجديدة'}
                </span>
              </button>
            </form>
          )}

          <div className="text-center mt-6">
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

export default ForgotPasswordPage;
