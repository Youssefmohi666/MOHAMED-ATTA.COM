
import React, { useEffect, useState } from 'react';
import { fetchCourseById } from '../api/courses.api';
import { Course } from '../types/types';
import { Page, AccountType } from '../App';
import StarIcon from './icons/StarIcon';
import ClockIcon from './icons/ClockIcon';

interface PaymentSuccessPageProps {
    courseId: string | number;
    onNavigate: (page: Page, payload?: { accountType?: AccountType; courseId?: string | number }) => void;
}

const PaymentSuccessPage: React.FC<PaymentSuccessPageProps> = ({ courseId, onNavigate }) => {
    const [course, setCourse] = useState<Course | null>(null);
    const [showConfetti, setShowConfetti] = useState(true);
    const [animStep, setAnimStep] = useState(0);

    useEffect(() => {
        fetchCourseById(courseId).then(({ data }) => {
            setCourse(data);
            window.scrollTo(0, 0);
        });

        // Stagger the animations
        const timers = [
            setTimeout(() => setAnimStep(1), 300),
            setTimeout(() => setAnimStep(2), 700),
            setTimeout(() => setAnimStep(3), 1100),
            setTimeout(() => setAnimStep(4), 1500),
            setTimeout(() => setShowConfetti(false), 4000),
        ];
        return () => timers.forEach(clearTimeout);
    }, [courseId]);

    const orderNumber = `ELM-${Date.now().toString().slice(-8)}`;
    const orderDate = new Date().toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div dir="rtl" className="bg-[#FAF6EB] min-h-screen relative overflow-hidden font-cairo" style={{ fontFamily: "'Cairo', sans-serif" }}>
            {/* Confetti Effect */}
            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50">
                    {Array.from({ length: 50 }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-3 h-3 rounded-sm"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `-10%`,
                                backgroundColor: ['#DC2626', '#1E3A8A', '#FFD700', '#FF6B6B', '#EF4444', '#3B82F6'][Math.floor(Math.random() * 6)],
                                animation: `confettiFall ${2 + Math.random() * 3}s ease-in-out forwards`,
                                animationDelay: `${Math.random() * 1.5}s`,
                                transform: `rotate(${Math.random() * 360}deg)`,
                                opacity: 0.8,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#DC2626]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#1E3A8A]/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
                <div className="max-w-2xl mx-auto">

                    {/* Success Animation */}
                    <div className={`text-center mb-10 transition-all duration-700 ${animStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <div className="relative w-28 h-28 mx-auto mb-6">
                            {/* Outer Ring */}
                            <div className="absolute inset-0 rounded-full border-4 border-[#DC2626]/20" />
                            <div
                                className="absolute inset-0 rounded-full border-4 border-[#DC2626] transition-all duration-1000"
                                style={{
                                    clipPath: animStep >= 1 ? 'circle(50% at 50% 50%)' : 'circle(0% at 50% 0%)',
                                }}
                            />
                            {/* Inner Circle */}
                            <div className={`absolute inset-2 rounded-full bg-[#DC2626]/10 flex items-center justify-center transition-transform duration-500 ${animStep >= 1 ? 'scale-100' : 'scale-0'}`}>
                                <svg className={`w-14 h-14 text-[#DC2626] transition-all duration-500 ${animStep >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            {/* Spark Dots */}
                            {animStep >= 1 && (
                                <>
                                    <div className="absolute -top-2 left-1/2 w-2 h-2 bg-[#DC2626] rounded-full animate-ping" />
                                    <div className="absolute top-1/2 -right-2 w-2 h-2 bg-[#1E3A8A] rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
                                    <div className="absolute -bottom-2 left-1/3 w-2 h-2 bg-[#FFD700] rounded-full animate-ping" style={{ animationDelay: '0.6s' }} />
                                    <div className="absolute top-1/3 -left-2 w-2 h-2 bg-[#DC2626] rounded-full animate-ping" style={{ animationDelay: '0.9s' }} />
                                </>
                            )}
                        </div>

                        <h1 className="text-3xl md:text-4xl font-black text-[#1E3A8A] mb-3">تمت عملية الدفع بنجاح! 🎉</h1>
                        <p className="text-lg text-[#1E3A8A]/60">تهانينا! يمكنك الآن البدء في رحلة التعلم</p>
                    </div>

                    {/* Order Details Card */}
                    <div className={`bg-white rounded-3xl shadow-xl border border-[#DBEAFE]/50 overflow-hidden transition-all duration-700 ${animStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        {/* Top Gradient Bar */}
                        <div className="h-1.5 bg-gradient-to-l from-[#DC2626] via-[#1E3A8A] to-[#DC2626]" />

                        <div className="p-6 md:p-8">
                            {/* Order Info */}
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-[#DBEAFE]/50">
                                <div>
                                    <p className="text-xs text-[#1E3A8A]/40 mb-0.5">رقم الطلب</p>
                                    <p className="font-bold font-mono text-[#1E3A8A]" dir="ltr">#{orderNumber}</p>
                                </div>
                                <div className="text-left">
                                    <p className="text-xs text-[#1E3A8A]/40 mb-0.5">تاريخ الشراء</p>
                                    <p className="font-bold text-[#1E3A8A] text-sm">{orderDate}</p>
                                </div>
                                <div className="flex items-center gap-2 bg-[#DC2626]/10 px-4 py-2 rounded-full">
                                    <div className="w-2 h-2 bg-[#DC2626] rounded-full animate-pulse" />
                                    <span className="text-sm font-bold text-[#DC2626]">مفعّل</span>
                                </div>
                            </div>

                            {/* Course Info */}
                            {course && (
                                <div className="flex gap-4 mb-8">
                                    <div className="w-24 h-24 md:w-32 md:h-24 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                                        <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="inline-block px-2 py-0.5 bg-[#DC2626]/10 text-[#DC2626] text-xs font-bold rounded-lg mb-1.5">{course.category}</span>
                                        <h3 className="font-bold text-[#1E3A8A] text-lg leading-snug mb-2 line-clamp-2">{course.title}</h3>
                                        <div className="flex items-center gap-4 text-xs text-[#1E3A8A]/50">
                                            <div className="flex items-center gap-1">
                                                <ClockIcon className="w-3.5 h-3.5" />
                                                <span>{course.duration} ساعة</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-yellow-500">
                                                <StarIcon className="w-3.5 h-3.5 fill-current" />
                                                <span>{course.rating}</span>
                                            </div>
                                            <span>بواسطة {course.instructorName ?? 'معلم'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Payment Summary */}
                            <div className="bg-[#F8FAFA] rounded-2xl p-5 mb-8">
                                <h4 className="font-bold text-[#1E3A8A] mb-3 text-sm">تفاصيل الدفع</h4>
                                <div className="space-y-2.5 text-sm">
                                    <div className="flex items-center justify-between text-[#1E3A8A]/60">
                                        <span>سعر الدورة</span>
                                        <span className="font-bold">{typeof course?.price === 'number' ? course.price : 0} ج.م</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[#1E3A8A]/60">
                                        <span>طريقة الدفع</span>
                                        <span className="font-bold">بطاقة ائتمان</span>
                                    </div>
                                    <div className="border-t border-[#DBEAFE] pt-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-[#1E3A8A]">المبلغ المدفوع</span>
                                            <span className="font-black text-xl text-[#DC2626]">{typeof course?.price === 'number' ? course.price : 0} <span className="text-sm font-medium">ر.س</span></span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Email Notification */}
                            <div className="bg-[#1E3A8A]/5 rounded-xl p-4 flex items-start gap-3 mb-6">
                                <div className="w-10 h-10 bg-[#1E3A8A]/10 rounded-xl flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-[#1E3A8A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-[#1E3A8A] mb-0.5">تم إرسال تأكيد الطلب</p>
                                    <p className="text-xs text-[#1E3A8A]/50">تم إرسال تفاصيل الطلب إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* What's Next Section */}
                    <div className={`mt-8 transition-all duration-700 ${animStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <h3 className="text-lg font-bold text-[#1E3A8A] mb-4 text-center">الخطوات التالية</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                                {
                                    icon: (
                                        <svg className="w-7 h-7 text-[#DC2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    ),
                                    title: 'ابدأ التعلم',
                                    desc: 'ابدأ فوراً بمشاهدة الدروس من لوحة التحكم',
                                },
                                {
                                    icon: (
                                        <svg className="w-7 h-7 text-[#1E3A8A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                    ),
                                    title: 'حمّل المصادر',
                                    desc: 'حمّل الملفات والتمارين المرفقة مع الدورة',
                                },
                                {
                                    icon: (
                                        <svg className="w-7 h-7 text-[#FFB833]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                        </svg>
                                    ),
                                    title: 'احصل على شهادة',
                                    desc: 'أكمل الدورة واحصل على شهادة إتمام معتمدة',
                                },
                            ].map((item, idx) => (
                                <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-[#DBEAFE]/50 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                                    <div className="w-14 h-14 bg-[#F8FAFA] rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                        {item.icon}
                                    </div>
                                    <h4 className="font-bold text-[#1E3A8A] mb-1 text-sm">{item.title}</h4>
                                    <p className="text-xs text-[#1E3A8A]/50 leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className={`mt-8 flex flex-col sm:flex-row gap-4 max-w-md mx-auto transition-all duration-700 ${animStep >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <button
                            onClick={() => onNavigate('dashboard')}
                            className="flex-1 btn-primary py-4 text-white font-bold rounded-xl text-lg shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            ابدأ التعلم الآن
                        </button>
                        <button
                            onClick={() => onNavigate('courses')}
                            className="flex-1 py-4 border-2 border-[#DBEAFE] text-[#1E3A8A] font-bold rounded-xl hover:bg-white hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            تصفح المزيد
                        </button>
                    </div>
                </div>
            </div>

            {/* Confetti CSS */}
            <style>{`
                @keyframes confettiFall {
                    0% {
                        opacity: 0;
                        transform: translateY(-10vh) rotate(0deg) scale(0);
                    }
                    10% {
                        opacity: 1;
                        transform: translateY(0vh) rotate(45deg) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translateY(110vh) rotate(720deg) scale(0.5);
                    }
                }
            `}</style>
        </div>
    );
};

export default PaymentSuccessPage;
