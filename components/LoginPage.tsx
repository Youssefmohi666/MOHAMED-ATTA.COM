import React, { useState, useEffect } from 'react';
import { Page } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { validateEmail, sanitizePlainText } from '../utils/validation';

interface LoginPageProps {
  onNavigate: (page: Page, params?: Record<string, string>) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [centerMode, setCenterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { login, user, isLoggedIn } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (user && isLoggedIn) {
      showToast(`مرحبا بك ${user.name}!`, 'success');
      const target: Page =
        user.role === 'admin'
          ? 'admin-dashboard'
          : user.role === 'teacher'
          ? 'teacher-dashboard'
          : 'dashboard';
      onNavigate(target);
    }
  }, [user, isLoggedIn, onNavigate, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!email.trim() || (!centerMode && !password) || (centerMode && !code.trim())) {
      setError(centerMode ? 'يرجى إدخال البريد/الهاتف و كود السنتر' : 'يرجى ملء جميع الحقول');
      return;
    }

    const clean = email.trim();
    const isPhone = /^[+\d][\d\s-]{6,}$/.test(clean) && /^\d/.test(clean.replace(/[^0-9]/g, ''));
    setError('');
    setIsLoading(true);
    try {
      // login() sends "email" for the email-or-phone identifier
      const sanitized = isPhone ? clean.replace(/[^0-9]/g, '') : clean.toLowerCase();
      const result = await login(sanitized, password, centerMode ? code.trim() : undefined);
      if (result && result.requiresEmailVerification) {
        showToast('يرجى تفعيل بريدك الإلكتروني أولاً. تم إرسال رمز التحقق إلى بريدك.', 'warning');
        onNavigate('verify-email', { email: result.email || sanitized });
        return;
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'حدث خطأ أثناء تسجيل الدخول';
      setError(message);
      setIsLoading(false);
      return;
    }
    setIsLoading(false);
  };

  return (
    <div
      dir="rtl"
      className="min-h-[80vh] flex items-center justify-center py-12 md:py-20 px-4 bg-[#f9f9ff] relative overflow-hidden"
    >
      {/* Subtle background blobs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#034289]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#4F8751]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-[0_8px_24px_-4px_rgba(3,66,137,0.12)] p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5 shadow-md"
              style={{ background: 'linear-gradient(135deg, #002c61 0%, #034289 100%)' }}
              aria-hidden="true"
            >
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#002c61] mb-1">تسجيل الدخول</h1>
            <p className="text-sm text-[#434751]">مرحبا بعودتك! قم بتسجيل الدخول للمتابعة</p>
          </div>

          {/* Global error alert */}
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-5 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
            >
              <svg className="w-4 h-4 mt-0.5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            {/* Email / Phone Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-[#002c61] mb-1.5">
                البريد الإلكتروني أو رقم الهاتف
              </label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737782]" aria-hidden="true">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <input
                  type="text"
                  id="email"
                  name="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com أو 01XXXXXXXXX"
                  aria-required="true"
                  aria-invalid={!!error}
                  className={`w-full pr-10 pl-4 py-3 bg-[#e8e7ee] rounded-t-xl rounded-b-none border-b-2 text-[#1a1c20] placeholder:text-[#737782] focus:outline-none focus:bg-[#ededf4] transition-colors duration-200 ${
                    error ? 'border-red-400 focus:border-red-500' : 'border-[#034289] focus:border-[#002c61]'
                  }`}
                />
              </div>
              {error && (
                <p role="alert" className="mt-1.5 text-red-500 text-sm flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </p>
              )}
            </div>

            {/* Center Code Field (only in center mode) */}
            {centerMode && (
              <div>
                <label htmlFor="code" className="block text-sm font-semibold text-[#002c61] mb-1.5">
                  كود السنتر
                </label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737782]" aria-hidden="true">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    id="code"
                    name="code"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="أدخل كود السنتر الخاص بك"
                    aria-required="true"
                    aria-invalid={!!error}
                    className={`w-full pr-10 pl-4 py-3 bg-[#e8e7ee] rounded-t-xl rounded-b-none border-b-2 text-[#1a1c20] placeholder:text-[#737782] focus:outline-none focus:bg-[#ededf4] transition-colors duration-200 ${
                      error ? 'border-red-400 focus:border-red-500' : 'border-[#034289] focus:border-[#002c61]'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            {!centerMode && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-semibold text-[#002c61]">
                  كلمة المرور
                </label>
                <button
                  type="button"
                  onClick={() => onNavigate('forgot-password')}
                  className="text-xs text-[#034289] hover:text-[#002c61] font-medium cursor-pointer transition-colors duration-200 underline-offset-2 hover:underline"
                >
                  نسيت كلمة المرور
                </button>
              </div>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737782]" aria-hidden="true">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type="password"
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=""
                  aria-required="true"
                  className="w-full pr-10 pl-4 py-3 bg-[#e8e7ee] rounded-t-xl rounded-b-none border-b-2 border-[#034289] text-[#1a1c20] placeholder:text-[#737782] focus:outline-none focus:bg-[#ededf4] focus:border-[#002c61] transition-colors duration-200"
                />
              </div>
            </div>
            )}

            {/* Remember Me */}
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="remember"
                className="w-4 h-4 rounded border-2 border-[#c3c6d2] text-[#034289] focus:ring-[#034289] focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="remember" className="text-sm text-[#434751] cursor-pointer select-none">
                تذكرني في هذا الجهاز
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl text-white font-bold text-base cursor-pointer transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#034289] focus-visible:ring-offset-2"
              style={{ background: isLoading ? '#034289' : 'linear-gradient(135deg, #002c61 0%, #034289 100%)' }}
            >
              <span className="flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>جاري تسجيل الدخول...</span>
                  </>
                ) : (
                  'تسجيل الدخول'
                )}
              </span>
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-7" aria-hidden="true">
            <div className="flex-1 h-px bg-[#c3c6d2]" />
            <span className="text-xs text-[#737782]">أو</span>
            <button
              type="button"
              onClick={() => setCenterMode(!centerMode)}
              className="text-xs text-[#034289] font-medium cursor-pointer transition-colors duration-200 hover:text-[#002c61] underline-offset-2 hover:underline"
            >
              هل انت كالب سنتر
            </button>
            <div className="flex-1 h-px bg-[#c3c6d2]" />
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-[#434751]">
            ليس لديك حساب{' '}
            <button
              type="button"
              onClick={() => onNavigate('signup')}
              className="font-bold text-[#034289] hover:text-[#002c61] cursor-pointer transition-colors duration-200 underline-offset-2 hover:underline"
            >
              إنشاء حساب جديد
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
