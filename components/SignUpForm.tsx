import React, { useState, useEffect } from 'react';
import { Page } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { sanitizePlainText } from '../utils/validation';
import AuthLayout from './AuthLayout';

interface SignUpFormProps {
  onNavigate: (page: Page, params?: Record<string, string>) => void;
}

const SignUpForm: React.FC<SignUpFormProps> = ({ onNavigate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fatherPhone, setFatherPhone] = useState('');
  const [motherPhone, setMotherPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { signup, user, isLoggedIn } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (user && isLoggedIn) {
      showToast(`مرحبا بك ${user.name}! تم إنشاء حسابك بنجاح`, 'success');
      onNavigate('dashboard');
    }
  }, [user, isLoggedIn, showToast, onNavigate]);

  const getPasswordStrength = () => {
    if (password.length === 0) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    return Math.min(score, 4);
  };

  const strengthLabels = ['', 'ضعيفة جداً', 'ضعيفة', 'متوسطة', 'قوية'];
  const strengthColors = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
  const strength = getPasswordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !phoneNumber.trim() || !fatherPhone.trim() || !motherPhone.trim() || !fatherName.trim() || !motherName.trim() || !password) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const sanitizedName = sanitizePlainText(fullName, 100);
    if (sanitizedName.length < 2) {
      setError('الاسم يجب أن يكون حرفين على الأقل');
      return;
    }

    const sanitizedFatherName = sanitizePlainText(fatherName, 255);
    if (sanitizedFatherName.length < 5) {
      setError('يرجى إدخال اسم الأب الرباعي كاملاً');
      return;
    }

    const sanitizedMotherName = sanitizePlainText(motherName, 255);
    if (sanitizedMotherName.length < 3) {
      setError('يرجى إدخال اسم الأم');
      return;
    }

    const cleanStudentPhone = phoneNumber.replace(/\D/g, '');
    if (!/^01[0-9]{8,9}$/.test(cleanStudentPhone)) {
      setError('رقم هاتف الطالب غير صالح. يجب أن يبدأ بـ 01');
      return;
    }

    const cleanFatherPhone = fatherPhone.replace(/\D/g, '');
    if (!/^01[0-9]{8,9}$/.test(cleanFatherPhone)) {
      setError('رقم هاتف الأب غير صالح. يجب أن يبدأ بـ 01');
      return;
    }

    const cleanMotherPhone = motherPhone.replace(/\D/g, '');
    if (!/^01[0-9]{8,9}$/.test(cleanMotherPhone)) {
      setError('رقم هاتف الأم غير صالح. يجب أن يبدأ بـ 01');
      return;
    }

    // Student's number MUST differ from both the father's and the mother's.
    // (Father's == Mother's is allowed / normal.)
    if (cleanStudentPhone === cleanFatherPhone) {
      setError('رقم هاتف الطالب لا يمكن أن يكون هو نفسه رقم هاتف الأب');
      return;
    }
    if (cleanStudentPhone === cleanMotherPhone) {
      setError('رقم هاتف الطالب لا يمكن أن يكون هو نفسه رقم هاتف الأم');
      return;
    }

    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('كلمة المرور يجب أن تحتوي على حرف كبير وصغير ورقم');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      await signup({
        name: sanitizedName,
        email: cleanStudentPhone + '@mohamedatta.com',
        password,
        role: 'student',
        phoneNumber: cleanStudentPhone,
        nationalId: '',
        fatherName: sanitizedFatherName,
        motherName: sanitizedMotherName,
        fatherPhoneNumber: cleanFatherPhone,
        motherPhoneNumber: cleanMotherPhone,
      });
      showToast('تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول الآن', 'success');
      onNavigate('login');
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء إنشاء الحساب');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 bg-[#F5F5F7] dark:bg-white/[0.06] rounded-xl border-2 border-transparent text-[#191c1d] placeholder:text-[#737782] ' +
    'focus:bg-white focus:outline-none focus:border-[#1E3A8A]/30 ' +
    'transition-all duration-200 text-right';

  const labelClass = 'block text-xs font-semibold text-[#1e2a5c] mb-1.5 text-right';

  return (
    <AuthLayout mode="signup">
      <div className="gloss-card gloss-in bg-white/80 dark:bg-[#0d1f33]/80 p-6 md:p-8">
        <div className="text-center mb-7">
          <div className="w-14 h-14 bg-gradient-to-br from-[#DC2626] to-[#EF4444] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#DC2626]/25">
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-[#1e2a5c] mb-1 gloss-in gdelay-1">حساب طالب جديد</h1>
          <p className="text-sm text-[#434751] gloss-in gdelay-2">سجّل وابدأ تعلم العلوم معانا</p>
        </div>

        {error && (
          <div role="alert" className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="whitespace-pre-line">{error}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className={labelClass}>اسم الطالب الكامل</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="أدخل اسمك الكامل"
              autoComplete="name"
              className={inputClass}
            />
          </div>

          {/* Student Phone */}
          <div>
            <label htmlFor="phoneNumber" className={labelClass}>رقم هاتف الطالب</label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="01XXXXXXXXX"
              autoComplete="tel"
              dir="ltr"
              className={`${inputClass} text-left`}
            />
          </div>

          {/* Father Name */}
          <div>
            <label htmlFor="fatherName" className={labelClass}>اسم الأب الرباعي</label>
            <input
              type="text"
              id="fatherName"
              name="fatherName"
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
              placeholder="الاسم + الأب + الجد + العائلة"
              autoComplete="name"
              className={inputClass}
            />
            <p className="text-xs text-[#737782] mt-1 text-right">الاسم الرباعي الكامل للأب</p>
          </div>

          {/* Mother Name */}
          <div>
            <label htmlFor="motherName" className={labelClass}>اسم الأم</label>
            <input
              type="text"
              id="motherName"
              name="motherName"
              value={motherName}
              onChange={(e) => setMotherName(e.target.value)}
              placeholder="اسم الأم"
              autoComplete="name"
              className={inputClass}
            />
          </div>

          {/* Father Phone */}
          <div>
            <label htmlFor="fatherPhone" className={labelClass}>رقم هاتف الأب</label>
            <input
              type="tel"
              id="fatherPhone"
              name="fatherPhone"
              value={fatherPhone}
              onChange={(e) => setFatherPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              autoComplete="tel"
              dir="ltr"
              className={`${inputClass} text-left`}
            />
          </div>

          {/* Mother Phone */}
          <div>
            <label htmlFor="motherPhone" className={labelClass}>رقم هاتف الأم</label>
            <input
              type="tel"
              id="motherPhone"
              name="motherPhone"
              value={motherPhone}
              onChange={(e) => setMotherPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              autoComplete="tel"
              dir="ltr"
              className={`${inputClass} text-left`}
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className={labelClass}>كلمة المرور</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8 أحرف على الأقل"
              autoComplete="new-password"
              className={inputClass}
            />
            {password.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1" aria-hidden="true">
                  {[1, 2, 3, 4].map((level) => (
                    <div key={level} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${strength >= level ? strengthColors[strength] : 'bg-[#e5e7eb]'}`} />
                  ))}
                </div>
                <p className="text-xs text-[#737782]">كلمة مرور {strengthLabels[strength]}</p>
              </div>
            )}
          </div>

          {/* Terms */}
          <div className="flex items-start gap-3 pt-1">
            <input type="checkbox" id="terms" required className="w-4 h-4 mt-0.5 rounded border-[#c3c6d2] text-[#DC2626] focus:ring-[#DC2626] focus:ring-offset-0 cursor-pointer shrink-0" />
            <label htmlFor="terms" className="text-[#434751] text-xs leading-relaxed cursor-pointer">
              أوافق على{' '}
              <button type="button" className="text-[#DC2626] hover:underline font-medium">شروط الخدمة</button>
              {' '}و{' '}
              <button type="button" className="text-[#DC2626] hover:underline font-medium">سياسة الخصوصية</button>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 text-base font-bold text-white rounded-xl bg-gradient-to-l from-[#DC2626] to-[#EF4444] shadow-[0_12px_30px_-8px_rgba(220,38,38,0.6)] hover-shine disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            <span className="flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>جاري إنشاء الحساب...</span>
                </>
              ) : (
                'إنشاء حساب طالب'
              )}
            </span>
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-[#434751] text-sm">
            لديك حساب بالفعل؟{' '}
            <button type="button" onClick={() => onNavigate('login')} className="font-bold text-[#1E3A8A] hover:text-[#1e2a5c] hover:underline transition-colors duration-200 cursor-pointer">
              تسجيل الدخول
            </button>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SignUpForm;
