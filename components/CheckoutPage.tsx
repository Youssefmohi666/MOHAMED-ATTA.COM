import React, { useState, useEffect } from 'react';
import { initiatePaymobPayment, validateCoupon, placeOrder } from '../api/orders.api';
import { apiRequest } from '../api/client';
import { fetchCourseById } from '../api/courses.api';
import { Course } from '../types/types';
import { Page, AccountType } from '../App';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import CheckBadgeIcon from './icons/CheckBadgeIcon';
import ClockIcon from './icons/ClockIcon';
import StarIcon from './icons/StarIcon';

interface CheckoutPageProps {
    courseId: string | number;
    onNavigate: (page: Page, payload?: { accountType?: AccountType; courseId?: string | number }) => void;
}

type PaymentMethod = 'card' | 'wallet';

const CheckoutPage: React.FC<CheckoutPageProps> = ({ courseId, onNavigate }) => {
    const { showToast } = useToast();
    const { user } = useAuth();
    const [course, setCourse] = useState<Course | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
    const [isProcessing, setIsProcessing] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [couponApplied, setCouponApplied] = useState(false);
    const [couponError, setCouponError] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchCourseById(courseId).then(({ data }) => {
            setCourse(data);
            window.scrollTo(0, 0);
            if (user) {
                setFormData(prev => ({
                    ...prev,
                    fullName: user.name || '',
                    email: user.email || '',
                    phone: user.phoneNumber || '',
                }));
            }
        });
    }, [courseId, user]);

    const originalPrice = typeof course?.price === 'number' ? course.price : 0;
    const finalPrice = Math.max(0, originalPrice - discountAmount);

    const handleInput = (field: string, value: string) => {
        let v = value;
        if (field === 'phone') v = value.replace(/\D/g, '').slice(0, 11);
        setFormData(prev => ({ ...prev, [field]: v }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const applyCoupon = async () => {
        try {
            setCouponError('');
            const data = await validateCoupon(couponCode, course?.guidId || courseId.toString());
            if (data?.isValid) {
                setCouponApplied(true);
                const discAmt = data.discountAmount || (originalPrice * ((data.discountPercentage || 15) / 100));
                setDiscountAmount(discAmt);
            } else {
                setCouponError(data?.message || 'كود الخصم غير صالح أو منتهي');
                setCouponApplied(false);
                setDiscountAmount(0);
            }
        } catch {
            setCouponError('تعذر التحقق من الكود');
        }
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!formData.fullName.trim()) e.fullName = 'الاسم الكامل مطلوب';
        if (!formData.email.trim()) e.email = 'البريد الإلكتروني مطلوب';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'بريد إلكتروني غير صالح';
        if (paymentMethod === 'wallet') {
            if (!formData.phone.trim()) e.phone = 'رقم الهاتف مطلوب للدفع بالمحفظة';
            else if (!/^01[0-9]{8,9}$/.test(formData.phone)) e.phone = 'رقم هاتف مصري غير صالح';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setIsProcessing(true);
        try {
            const result = await initiatePaymobPayment({
                subjectId: course?.guidId || courseId.toString(),
                paymentMethod,
                couponCode: couponApplied ? couponCode : undefined,
                billingFullName: formData.fullName,
                billingEmail: formData.email,
                billingPhone: formData.phone,
            });
            const redirectUrl = result?.redirectUrl || result?.data?.redirectUrl;
            if (typeof redirectUrl === 'string' && /^https:\/\/accept\.paymob\.com\//.test(redirectUrl)) {
                window.location.assign(redirectUrl);
            } else {
                throw new Error('لم يتم استلام رابط الدفع');
            }
        } catch (error: any) {
            setIsProcessing(false);
            const msg = error?.message || 'تعذر إنشاء الطلب، يرجى المحاولة مرة أخرى.';
            if (msg.includes('ALREADY_ENROLLED') || msg.includes('مسجل بالفعل')) {
                showToast('أنت مسجل بالفعل في هذه المادة', 'info');
                onNavigate('dashboard');
            } else {
                showToast(msg, 'error');
            }
        }
    };

    // Loading state while course data is being fetched
    if (!course) {
        return (
            <div dir="rtl" className="min-h-screen flex items-center justify-center bg-[#FAF6EB]">
                <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full border-4 border-[#DBEAFE]" />
                        <div className="absolute inset-0 rounded-full border-4 border-t-[#DC2626] animate-spin" />
                    </div>
                    <p className="text-[#1E3A8A]/60 text-sm">جارٍ تحميل بيانات الدورة...</p>
                </div>
            </div>
        );
    }

    // Free course state
    if (course.isFree || course.price === 0) {
        const handleFreeEnroll = async () => {
            setIsProcessing(true);
            try {
                await apiRequest('/student/enroll-free', {
                    method: 'POST',
                    body: JSON.stringify({ subjectId: course.guidId || courseId.toString() }),
                });
                showToast('تم التسجيل في الدورة بنجاح!', 'success');
                onNavigate('dashboard');
            } catch (error: any) {
                const msg = error?.message || '';
                if (msg.includes('ALREADY_ENROLLED') || msg.includes('مسجل بالفعل')) {
                    showToast('أنت مسجل بالفعل في هذه المادة', 'info');
                    onNavigate('dashboard');
                } else {
                    showToast(msg || 'تعذر التسجيل، يرجى المحاولة مرة أخرى', 'error');
                    setIsProcessing(false);
                }
            }
        };

        return (
            <div dir="rtl" className="min-h-screen flex items-center justify-center bg-[#FAF6EB] py-20 px-4">
                <div className="gloss-card gloss-in bg-white/80 dark:bg-[#0d1f33]/80 p-10 text-center max-w-md w-full">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#DC2626] to-[#EF4444] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#DC2626]/25">
                        <CheckBadgeIcon className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#1E3A8A] mb-3">هذه الدورة مجانية!</h2>
                    <p className="text-[#1E3A8A]/60 mb-8">يمكنك البدء في التعلم الآن بدون أي تكاليف.</p>
                    <button
                        onClick={handleFreeEnroll}
                        disabled={isProcessing}
                        className="w-full py-4 bg-gradient-to-l from-[#DC2626] to-[#EF4444] text-white font-bold rounded-xl text-lg shadow-[0_12px_30px_-8px_rgba(220,38,38,0.6)] hover-shine cursor-pointer transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>جارٍ التسجيل...</span>
                            </>
                        ) : 'ابدأ التعلم الآن'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div dir="rtl" className="bg-[#FAF6EB] min-h-screen pb-20">

            {/* Processing Overlay */}
            {isProcessing && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-white rounded-2xl p-10 text-center max-w-sm mx-4 shadow-2xl">
                        <div className="relative w-16 h-16 mx-auto mb-6">
                            <div className="absolute inset-0 rounded-full border-4 border-[#DBEAFE]" />
                            <div className="absolute inset-0 rounded-full border-4 border-t-[#DC2626] animate-spin" />
                        </div>
                        <h3 className="text-xl font-bold text-[#1E3A8A] mb-2">جارٍ تجهيز الدفع...</h3>
                        <p className="text-[#1E3A8A]/60 text-sm">سيتم تحويلك لصفحة الدفع الآمنة</p>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <div className="bg-[#1E3A8A] text-white py-8 relative overflow-hidden">
                <div className="absolute -top-16 -left-16 w-56 h-56 bg-[#DC2626]/15 rounded-full blur-3xl pointer-events-none" />
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => onNavigate('course-detail', { courseId })}
                            aria-label="العودة لصفحة الدورة"
                            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors duration-200 cursor-pointer"
                        >
                            {/* Arrow pointing left in RTL = forward/back */}
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">إتمام الشراء</h1>
                            <p className="text-white/60 text-sm mt-0.5">أكمل بيانات الدفع لتفعيل اشتراكك</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/*
                  RTL two-column layout:
                  - Right column (col-span-1): Order Summary card
                  - Left column (col-span-2): Billing info + Payment method
                  In RTL grid, first child renders on the right.
                */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">

                    {/* RIGHT COLUMN — Order Summary (renders first = right in RTL) */}
                    <div className="lg:col-span-1 order-first lg:order-none">
                        <div className="gloss-card gloss-in bg-white/80 dark:bg-[#0d1f33]/80 p-6 sticky top-24">

                            {/* Section heading */}
                            <div className="flex items-center gap-2 mb-5">
                                <div className="w-8 h-8 bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] rounded-2xl flex items-center justify-center shadow-lg shadow-[#1E3A8A]/25">
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <h3 className="font-bold text-[#1E3A8A] text-base">ملخص الطلب</h3>
                            </div>

                            {/* Course info */}
                            <div className="flex gap-3 mb-5 pb-5 border-b border-[#F3F4F5]">
                                <img
                                    src={course.imageUrl}
                                    alt={course.title}
                                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                                    onError={e => { (e.currentTarget as HTMLImageElement).src = '/assets/courses/default.png'; }}
                                />
                                <div className="min-w-0">
                                    <p className="font-bold text-[#1E3A8A] text-sm line-clamp-2 leading-relaxed">{course.title}</p>
                                    <p className="text-xs text-[#1E3A8A]/50 mt-1">{course.instructorName ?? 'معلم'}</p>
                                    <div className="flex items-center gap-2 mt-1.5 text-xs text-[#1E3A8A]/50">
                                        <ClockIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span>{course.duration ?? 0} ساعة</span>
                                        <StarIcon className="w-3.5 h-3.5 text-yellow-400 fill-current flex-shrink-0" />
                                        <span>{course.rating}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Coupon input */}
                            <div className="mb-5">
                                <label htmlFor="coupon-input" className="block text-xs font-bold text-[#1E3A8A]/70 mb-2">
                                    كود الخصم
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        id="coupon-input"
                                        type="text"
                                        value={couponCode}
                                        onChange={e => setCouponCode(e.target.value)}
                                        placeholder="أدخل الكود"
                                        dir="ltr"
                                        className="flex-1 px-3 py-2 bg-[#F5F5F7] dark:bg-white/[0.06] rounded-xl text-sm text-[#1E3A8A] focus:bg-white focus:outline-none border-2 border-transparent focus:border-[#1E3A8A]/30 transition-colors duration-200"
                                    />
                                    <button
                                        onClick={applyCoupon}
                                        className="px-4 py-2 bg-gradient-to-l from-[#1E3A8A] to-[#3B82F6] hover-shine text-white text-sm font-bold rounded-xl shadow-lg shadow-[#1E3A8A]/25 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                                    >
                                        تطبيق
                                    </button>
                                </div>
                                {couponError && (
                                    <p role="alert" className="text-red-500 text-xs mt-1.5">{couponError}</p>
                                )}
                                {couponApplied && (
                                    <p className="text-[#DC2626] text-xs mt-1.5 font-bold flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                        تم تطبيق الخصم بنجاح
                                    </p>
                                )}
                            </div>

                            {/* Pricing breakdown */}
                            <div className="space-y-2.5 text-sm">
                                <div className="flex justify-between text-[#1E3A8A]/60">
                                    <span>سعر الدورة</span>
                                    <span>{originalPrice.toLocaleString('ar-SA')} ج.م</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-[#DC2626]">
                                        <span>الخصم</span>
                                        <span>- {discountAmount.toLocaleString('ar-SA')} ج.م</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-black text-[#1E3A8A] text-base pt-3 border-t border-[#F3F4F5]">
                                    <span>الإجمالي</span>
                                    <span className="text-[#DC2626] text-xl">{finalPrice.toLocaleString('ar-SA')} ج.م</span>
                                </div>
                            </div>

                            {/* Security badge */}
                            <div className="mt-5 pt-4 border-t border-[#F3F4F5] flex items-center gap-2 text-xs text-[#1E3A8A]/40">
                                <svg className="w-4 h-4 text-[#DC2626] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                الدفع مشفر وآمن عبر بوابة Paymob
                            </div>
                        </div>
                    </div>

                    {/* LEFT COLUMN — Billing + Payment (renders second = left in RTL) */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Billing Information Card */}
                        <div className="gloss-card gloss-in bg-white/80 dark:bg-[#0d1f33]/80 p-4 sm:p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#1E3A8A]/25">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[#1E3A8A]">بيانات الفاتورة</h2>
                                    <p className="text-xs text-[#1E3A8A]/50">ستُستخدم لإرسال تأكيد الطلب</p>
                                </div>
                            </div>

                            <div className="space-y-5">
                                {/* Full Name */}
                                <div>
                                    <label htmlFor="billing-fullname" className="block text-sm font-bold text-[#1E3A8A] mb-1.5">
                                        الاسم الكامل <span className="text-red-500" aria-hidden="true">*</span>
                                    </label>
                                    <input
                                        id="billing-fullname"
                                        type="text"
                                        value={formData.fullName}
                                        onChange={e => handleInput('fullName', e.target.value)}
                                        placeholder="أدخل الاسم الكامل"
                                        autoComplete="name"
                                        aria-required="true"
                                        aria-invalid={!!errors.fullName}
                                        aria-describedby={errors.fullName ? 'fullname-error' : undefined}
                                        className={`w-full px-4 py-3 border-2 rounded-xl bg-[#F5F5F7] dark:bg-white/[0.06] text-[#1E3A8A] placeholder-[#1E3A8A]/30 focus:bg-white focus:outline-none transition-colors duration-200 ${errors.fullName ? 'border-red-400' : 'border-transparent focus:border-[#1E3A8A]/30'}`}
                                    />
                                    {errors.fullName && (
                                        <p id="fullname-error" role="alert" className="text-red-500 text-xs mt-1.5">{errors.fullName}</p>
                                    )}
                                </div>

                                {/* Email */}
                                <div>
                                    <label htmlFor="billing-email" className="block text-sm font-bold text-[#1E3A8A] mb-1.5">
                                        البريد الإلكتروني <span className="text-red-500" aria-hidden="true">*</span>
                                    </label>
                                    <input
                                        id="billing-email"
                                        type="email"
                                        value={formData.email}
                                        onChange={e => handleInput('email', e.target.value)}
                                        placeholder="example@email.com"
                                        dir="ltr"
                                        autoComplete="email"
                                        aria-required="true"
                                        aria-invalid={!!errors.email}
                                        aria-describedby={errors.email ? 'email-error' : undefined}
                                        className={`w-full px-4 py-3 border-2 rounded-xl bg-[#F5F5F7] dark:bg-white/[0.06] text-[#1E3A8A] placeholder-[#1E3A8A]/30 focus:bg-white focus:outline-none transition-colors duration-200 ${errors.email ? 'border-red-400' : 'border-transparent focus:border-[#1E3A8A]/30'}`}
                                    />
                                    {errors.email && (
                                        <p id="email-error" role="alert" className="text-red-500 text-xs mt-1.5">{errors.email}</p>
                                    )}
                                </div>

                                {/* Phone */}
                                <div>
                                    <label htmlFor="billing-phone" className="block text-sm font-bold text-[#1E3A8A] mb-1.5">
                                        رقم الهاتف{' '}
                                        {paymentMethod === 'wallet'
                                            ? <span className="text-red-500" aria-hidden="true">*</span>
                                            : <span className="text-[#1E3A8A]/40 font-normal text-xs">(اختياري)</span>
                                        }
                                    </label>
                                    <input
                                        id="billing-phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={e => handleInput('phone', e.target.value)}
                                        placeholder="01XXXXXXXXX"
                                        dir="ltr"
                                        autoComplete="tel"
                                        aria-required={paymentMethod === 'wallet'}
                                        aria-invalid={!!errors.phone}
                                        aria-describedby={errors.phone ? 'phone-error' : undefined}
                                        className={`w-full px-4 py-3 border-2 rounded-xl bg-[#F5F5F7] dark:bg-white/[0.06] text-[#1E3A8A] placeholder-[#1E3A8A]/30 focus:bg-white focus:outline-none transition-colors duration-200 ${errors.phone ? 'border-red-400' : 'border-transparent focus:border-[#1E3A8A]/30'}`}
                                    />
                                    {errors.phone && (
                                        <p id="phone-error" role="alert" className="text-red-500 text-xs mt-1.5">{errors.phone}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Payment Method Card */}
                        <div className="gloss-card gloss-in bg-white/80 dark:bg-[#0d1f33]/80 p-4 sm:p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-gradient-to-br from-[#DC2626] to-[#EF4444] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#DC2626]/25">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[#1E3A8A]">طريقة الدفع</h2>
                                    <p className="text-xs text-[#1E3A8A]/50">ستُكمل بيانات الدفع على صفحة Paymob الآمنة</p>
                                </div>
                            </div>

                            <fieldset>
                                <legend className="sr-only">اختر طريقة الدفع</legend>
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Credit Card option */}
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('card')}
                                        aria-pressed={paymentMethod === 'card'}
                                        className={`relative p-4 rounded-xl border-2 transition-colors duration-200 text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:ring-offset-2 ${paymentMethod === 'card' ? 'border-[#DC2626] bg-[#DC2626]/5' : 'border-[#DBEAFE] hover:border-[#DC2626]/50'}`}
                                    >
                                        {paymentMethod === 'card' && (
                                            <span className="absolute -top-2 -left-2 w-5 h-5 bg-[#DC2626] rounded-full flex items-center justify-center">
                                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </span>
                                        )}
                                        <svg className={`w-8 h-8 mx-auto mb-2 ${paymentMethod === 'card' ? 'text-[#DC2626]' : 'text-[#1E3A8A]/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                        </svg>
                                        <span className={`text-xs font-bold ${paymentMethod === 'card' ? 'text-[#DC2626]' : 'text-[#1E3A8A]/60'}`}>بطاقة ائتمان</span>
                                    </button>

                                    {/* Mobile Wallet option */}
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('wallet')}
                                        aria-pressed={paymentMethod === 'wallet'}
                                        className={`relative p-4 rounded-xl border-2 transition-colors duration-200 text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:ring-offset-2 ${paymentMethod === 'wallet' ? 'border-[#DC2626] bg-[#DC2626]/5' : 'border-[#DBEAFE] hover:border-[#DC2626]/50'}`}
                                    >
                                        {paymentMethod === 'wallet' && (
                                            <span className="absolute -top-2 -left-2 w-5 h-5 bg-[#DC2626] rounded-full flex items-center justify-center">
                                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </span>
                                        )}
                                        <svg className={`w-8 h-8 mx-auto mb-2 ${paymentMethod === 'wallet' ? 'text-[#DC2626]' : 'text-[#1E3A8A]/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                        <span className={`text-xs font-bold ${paymentMethod === 'wallet' ? 'text-[#DC2626]' : 'text-[#1E3A8A]/60'}`}>محفظة إلكترونية</span>
                                    </button>
                                </div>
                            </fieldset>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isProcessing}
                            className="w-full py-4 bg-gradient-to-l from-[#1E3A8A] to-[#1e2a5c] hover:from-[#023070] hover:to-[#001f4d] text-white font-bold rounded-xl text-lg shadow-lg cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-3"
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>جارٍ التحويل...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <span className="text-sm sm:text-base">ادفع {finalPrice.toLocaleString('ar-SA')} ج.م عبر Paymob</span>
                                </>
                            )}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
