import React, { useEffect, useState } from 'react';
import { fetchCourseById } from '../api/courses.api';
import { getInquiry } from '../api/orders.api';
import { Course } from '../types/types';
import { applySeo } from '../utils/seo';
import StarIcon from './icons/StarIcon';
import ClockIcon from './icons/ClockIcon';
import UsersIcon from './icons/UsersIcon';
import CheckBadgeIcon from './icons/CheckBadgeIcon';
import PlayIcon from './icons/PlayIcon';
import { useAuth } from '../contexts/AuthContext';
import { formatArabicDate } from '../utils/date';
import { WHATSAPP_FALLBACK_NUMBER } from '../constants';

interface CourseDetailPageProps {
    courseId: string | number;
    onNavigate?: (page: any, payload?: any) => void;
}

const CourseDetailPage: React.FC<CourseDetailPageProps> = ({ courseId, onNavigate }) => {
    const [course, setCourse] = useState<Course | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'curriculum'>('overview');
    const [isLoadingInquiry, setIsLoadingInquiry] = useState(false);
    const { user } = useAuth();
    const isTeacher = user?.role === 'teacher';

    useEffect(() => {
        setLoadError(false);
        fetchCourseById(courseId)
            .then(({ data }) => {
                setCourse(data);
                window.scrollTo(0, 0);
                applyCourseSeo(data);
            })
            .catch(() => setLoadError(true));
    }, [courseId]);

    // Apply rich course-level SEO (title, description, Course + Breadcrumb JSON-LD)
    const applyCourseSeo = (course: Course) => {
        const domain = (import.meta.env?.VITE_DOMAIN as string) || '';
        const origin = domain
            ? `https://${domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`
            : (typeof window !== 'undefined' ? window.location.origin : 'https://mohamed-atta.com');
        const path = course.guidId ? `/subject/${course.guidId}` : `/subject/${course.id}`;
        const url = `${origin}${path}`;
        const title = course.title || 'دورة تعليمية';
        const desc = course.description
            ? course.description.slice(0, 155)
            : `سجل الآن في دورة ${title} وتعلّم مع نخبة المعلمين.`;
        try {
            applySeo({
                title: `${title} - دورة تعليمية`,
                description: desc,
                canonical: url,
                image: course.imageUrl || undefined,
                ogType: 'article',
                jsonLd: [
                    {
                        '@context': 'https://schema.org',
                        '@type': 'Course',
                        name: title,
                        description: desc,
                        url,
                        image: course.imageUrl ? `${origin}${course.imageUrl.startsWith('/') ? course.imageUrl : `/${course.imageUrl}`}` : undefined,
                        provider: {
                            '@type': 'Organization',
                            name: 'محمد عطا',
                            url: origin,
                        },
                        ...(course.instructorName
                            ? {
                                  instructor: {
                                      '@type': 'Person',
                                      name: course.instructorName,
                                  },
                              }
                            : {}),
                        ...(typeof course.price === 'number'
                            ? {
                                  offers: {
                                      '@type': 'Offer',
                                      price: course.price,
                                      priceCurrency: 'SAR',
                                      availability: 'https://schema.org/InStock',
                                  },
                              }
                            : {}),
                    },
                    {
                        '@context': 'https://schema.org',
                        '@type': 'BreadcrumbList',
                        itemListElement: [
                            { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: origin },
                            { '@type': 'ListItem', position: 2, name: 'الدورات', item: `${origin}/courses` },
                            { '@type': 'ListItem', position: 3, name: title, item: url },
                        ],
                    },
                ],
            });
        } catch {
            /* structured data is best-effort */
        }
    };

    const handleWhatsAppInquiry = async () => {
        if (!course) return;
        setIsLoadingInquiry(true);
        try {
            const response = await getInquiry(course.guidId ?? String(course.id));
            const inquiry = response.data;
            const encodedMessage = encodeURIComponent(inquiry.preFormattedMessage);
            const whatsappUrl = `https://wa.me/${inquiry.whatsAppNumber.replace(/\D/g, '')}?text=${encodedMessage}`;
            window.open(whatsappUrl, '_blank');
        } catch (error) {
            console.error('Error fetching inquiry details:', error);
            const fallbackMessage = encodeURIComponent(`مرحبا، أنا مهتم بالاستفسار عن الدورة: ${course.title}`);
            window.open(`https://wa.me/${WHATSAPP_FALLBACK_NUMBER}?text=${fallbackMessage}`, '_blank');
        } finally {
            setIsLoadingInquiry(false);
        }
    };

    // Loading state
    if (!course && !loadError) {
        return (
            <div dir="rtl" className="min-h-screen bg-[#f9f9fc] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-[#1E3A8A]/20 border-t-[#DC2626] animate-spin" />
                    <p className="text-[#434751] text-sm font-medium">جاري تحميل الدورة...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (loadError) {
        return (
            <div dir="rtl" className="min-h-screen bg-[#f9f9fc] flex flex-col items-center justify-center gap-6 px-4">
                <div className="w-16 h-16 rounded-full bg-[#ffdad6] flex items-center justify-center">
                    <svg className="w-8 h-8 text-[#ba1a1a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-bold text-[#1a1c1e] mb-2">تعذّر تحميل الدورة</h2>
                    <p className="text-[#434751] text-sm mb-6">يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.</p>
                    <button
                        onClick={() => { setLoadError(false); fetchCourseById(courseId).then(({ data }) => setCourse(data)).catch(() => setLoadError(true)); }}
                        className="px-6 py-3 bg-[#1E3A8A] text-white font-semibold rounded-lg hover:bg-[#1e2a5c] transition-colors duration-200 cursor-pointer hover:shadow-lg hover:shadow-[#1E3A8A]/30 hover:-translate-y-0.5 hover-shine"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        );
    }

    if (!course) return null;

    const isFree = course.isFree || course.price === 0;
    const totalLectures = course.lecturesCount ?? course.curriculum?.reduce((s, sec) => s + sec.lectures.length, 0) ?? 0;

    return (
        <div dir="rtl" className="min-h-screen bg-[#f9f9fc] pb-20">

            {/* ── Hero / Course Image Banner ── */}
            <div className="relative w-full bg-[#1a1c1e] overflow-hidden" style={{ maxHeight: '480px' }}>
                <img
                    src={course.imageUrl}
                    alt={`صورة دورة ${course.title}`}
                    className="w-full h-full object-cover opacity-60"
                    style={{ maxHeight: '480px', minHeight: '180px' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1c1e] via-[#1a1c1e]/60 to-transparent" />

                {/* Overlay content */}
                <div className="absolute bottom-0 right-0 left-0 px-4 sm:px-6 pb-6 sm:pb-8 pt-4 container mx-auto max-w-6xl">
                    {/* Category badge */}
                    {course.category && (
                        <span className="inline-block mb-3 px-3 py-1 bg-[#DC2626]/90 text-white text-xs font-bold rounded-full gloss-in gdelay-1">
                            {course.category}
                        </span>
                    )}
                    {isFree && (
                        <span className="inline-block mb-3 mr-2 px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-full border border-white/30 gloss-in gdelay-2">
                            مجاني
                        </span>
                    )}

                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight mb-3 max-w-3xl gloss-in gdelay-2">
                        {course.title}
                    </h1>

                    <p className="text-white/80 text-base leading-relaxed max-w-2xl mb-4 line-clamp-2 gloss-in gdelay-3">
                        {course.description}
                    </p>

                    {/* Rating + students row */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-white/90">
                        <div className="flex items-center gap-1.5">
                            <div className="flex">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <StarIcon key={s} className={`w-4 h-4 ${s <= Math.round(course.rating) ? 'text-yellow-400 fill-current' : 'text-white/30'}`} />
                                ))}
                            </div>
                            <span className="font-bold text-yellow-400">{course.rating}</span>
                            <span className="text-white/60">({(course.students / 10).toFixed(0)} تقييم)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <UsersIcon className="w-4 h-4 text-[#DC2626]" />
                            <span>{course.students?.toLocaleString('ar-SA') ?? 0} طالب مسجل</span>
                        </div>
                        {course.language && (
                            <div className="flex items-center gap-1.5">
                                <svg className="w-4 h-4 text-[#DC2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                </svg>
                                <span>{course.language}</span>
                            </div>
                        )}
                        {course.lastUpdated && (
                            <div className="flex items-center gap-1.5">
                                <ClockIcon className="w-4 h-4 text-[#DC2626]" />
                                <span>آخر تحديث: {formatArabicDate(course.lastUpdated)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Main Content + Sidebar ── */}
            <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                    {/* ── Left: Main Content ── */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Instructor Card */}
                        <section className="gloss-card p-6">
                            <h2 className="text-lg font-bold text-[#1E3A8A] mb-4">المدرس</h2>
                            <div className="flex items-start gap-4">
                                {/* Avatar with initials fallback */}
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#DC2626] flex items-center justify-center text-white font-bold text-xl flex-shrink-0 ring-2 ring-[#DBEAFE] shadow-lg shadow-[#1E3A8A]/25">
                                    {(course.instructorName ?? 'م').charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-[#1a1c1e] text-base">{course.instructorName ?? 'معلم'}</p>
                                    <p className="text-[#434751] text-sm mt-1 leading-relaxed">
                                        {(course as any).instructorBio ?? 'مدرس متخصص في هذا المجال مع خبرة واسعة في التعليم الإلكتروني.'}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-[#434751]">
                                        <span className="flex items-center gap-1">
                                            <StarIcon className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                                            <span>{course.rating} تقييم المدرس</span>
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <UsersIcon className="w-3.5 h-3.5 text-[#DC2626]" />
                                            <span>{course.students?.toLocaleString('ar-SA') ?? 0} طالب</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Tabs: Overview / Curriculum */}
                        <section className="gloss-card overflow-hidden">
                            <div className="flex border-b border-[#eeeef0]">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`flex-1 py-4 text-center font-bold text-sm transition-colors duration-200 cursor-pointer border-b-2 ${
                                        activeTab === 'overview'
                                            ? 'border-[#DC2626] text-[#DC2626] bg-[#DC2626]/5'
                                            : 'border-transparent text-[#434751] hover:text-[#1E3A8A] hover:bg-[#f3f3f6]'
                                    }`}
                                >
                                    نظرة عامة
                                </button>
                                <button
                                    onClick={() => setActiveTab('curriculum')}
                                    className={`flex-1 py-4 text-center font-bold text-sm transition-colors duration-200 cursor-pointer border-b-2 ${
                                        activeTab === 'curriculum'
                                            ? 'border-[#DC2626] text-[#DC2626] bg-[#DC2626]/5'
                                            : 'border-transparent text-[#434751] hover:text-[#1E3A8A] hover:bg-[#f3f3f6]'
                                    }`}
                                >
                                    المنهج الدراسي
                                </button>
                            </div>

                            <div className="p-6 md:p-8">
                                {/* Overview Tab */}
                                {activeTab === 'overview' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-base font-bold text-[#1E3A8A] mb-3">وصف الدورة</h3>
                                            <p className="text-[#434751] leading-relaxed text-sm">{course.description}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-[#1E3A8A] mb-3">متطلبات الدورة</h3>
                                            <ul className="space-y-2">
                                                {(course.requirements || [
                                                    'لا توجد متطلبات مسبقة، الدورة تبدأ من الصفر',
                                                    'جهاز كمبيوتر واتصال بالإنترنت',
                                                    'الرغبة في التعلم والتطور',
                                                ]).map((req, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm text-[#434751]">
                                                        <CheckBadgeIcon className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-0.5" />
                                                        <span>{req}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {/* Curriculum Tab */}
                                {activeTab === 'curriculum' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between text-xs text-[#434751] mb-2">
                                            <span className="font-medium">{totalLectures} محاضرة</span>
                                            {course.duration ? (
                                                <span>{course.duration} ساعة إجمالية</span>
                                            ) : null}
                                        </div>

                                        {(!course.curriculum || course.curriculum.length === 0) ? (
                                            <div className="text-center py-12">
                                                <div className="w-14 h-14 rounded-full bg-[#eeeef0] flex items-center justify-center mx-auto mb-4">
                                                    <svg className="w-7 h-7 text-[#737782]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                                                    </svg>
                                                </div>
                                                <p className="font-semibold text-[#1a1c1e] mb-1">لم يتم إضافة محتوى بعد</p>
                                                <p className="text-sm text-[#434751]">سيتم إضافة المحاضرات قريباً</p>
                                            </div>
                                        ) : (
                                            course.curriculum.map((section, idx) => (
                                                <div key={idx} className="rounded-xl overflow-hidden bg-[#f3f3f6]">
                                                    <div className="px-4 py-3 flex items-center justify-between">
                                                        <span className="font-bold text-[#1E3A8A] text-sm">{section.section}</span>
                                                        <span className="text-xs text-[#737782] bg-white px-2 py-0.5 rounded-full">
                                                            {section.lectures.length} {section.lectures.length === 1 ? 'درس' : 'دروس'}
                                                        </span>
                                                    </div>
                                                    <div className="divide-y divide-[#eeeef0]">
                                                        {section.lectures.map((lecture, lIdx) => {
                                                            const mins = lecture.durationSeconds ? Math.floor(lecture.durationSeconds / 60) : null;
                                                            const secs = lecture.durationSeconds ? String(lecture.durationSeconds % 60).padStart(2, '0') : null;
                                                            return (
                                                                <div key={lIdx} className="px-4 py-3 flex items-center gap-3 bg-white hover:bg-[#f9f9fc] transition-colors duration-200">
                                                                    <PlayIcon className="w-4 h-4 text-[#DC2626] flex-shrink-0" />
                                                                    <span className="text-sm text-[#1a1c1e] flex-1">{lecture.title}</span>
                                                                    {mins !== null && (
                                                                        <span className="text-xs text-[#737782] bg-[#eeeef0] px-2 py-0.5 rounded flex-shrink-0 tabular-nums">
                                                                            {mins}:{secs}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* ── Right: Sticky CTA Sidebar ── */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24">
                            <div className="gloss-card overflow-hidden">

                                {/* Course thumbnail */}
                                <div className="relative aspect-video overflow-hidden group cursor-pointer hover-shine">
                                    <img
                                        src={course.imageUrl}
                                        alt={`معاينة دورة ${course.title}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center">
                                        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                            <PlayIcon className="w-7 h-7 text-white mr-[-2px]" />
                                        </div>
                                    </div>
                                    <div className="absolute bottom-2 inset-x-0 text-center">
                                        <span className="text-white text-xs font-semibold drop-shadow">معاينة هذه الدورة</span>
                                    </div>
                                </div>

                                <div className="p-5 space-y-4">
                                    {/* Price */}
                                    <div className="flex items-end gap-2">
                                        <span className="text-3xl font-black text-[#1E3A8A]">
                                            {isFree ? 'مجاني' : Number(course.price).toLocaleString('ar-SA')}
                                        </span>
                                        {!isFree && (
                                            <>
                                                <span className="text-base text-[#737782] line-through mb-1">
                                                    {Number(Math.round(Number(course.price) * 1.5)).toLocaleString('ar-SA')}
                                                </span>
                                                <span className="text-xs font-bold bg-gradient-to-l from-[#DC2626] to-[#EF4444] text-white px-2 py-0.5 rounded-full mb-1 shadow-[0_6px_16px_-6px_rgba(220,38,38,0.55)]">
                                                    خصم 33%
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* CTA Buttons */}
                                    {isTeacher ? (
                                        <div className="w-full py-3 text-center text-sm font-semibold text-[#737782] bg-[#eeeef0] rounded-xl">
                                            المدرسون لا يمكنهم شراء الكورسات
                                        </div>
                                    ) : isFree ? (
                                        <button
                                            onClick={() => onNavigate && onNavigate('checkout', { courseId: course.guidId ?? course.id })}
                                            className="w-full py-3.5 bg-gradient-to-l from-[#DC2626] to-[#EF4444] hover:bg-[#991B1B] text-white font-bold rounded-xl transition-all duration-200 cursor-pointer text-base shadow-[0_10px_26px_-8px_rgba(220,38,38,0.5)] hover:shadow-[0_16px_34px_-10px_rgba(220,38,38,0.55)] hover:-translate-y-0.5 hover-shine"
                                        >
                                            ابدأ مجاناً
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => onNavigate && onNavigate('checkout', { courseId: course.guidId ?? course.id })}
                                                className="w-full py-3.5 bg-[#1E3A8A] hover:bg-[#1e2a5c] text-white font-bold rounded-xl transition-colors duration-200 cursor-pointer text-base shadow-lg shadow-[#1E3A8A]/30 hover:shadow-xl hover:shadow-[#1E3A8A]/40 hover:-translate-y-0.5 hover-shine"
                                            >
                                                اشتر الآن
                                            </button>
                                            <button
                                                onClick={handleWhatsAppInquiry}
                                                disabled={isLoadingInquiry}
                                                className="w-full py-3 border-2 border-[#1E3A8A] text-[#1E3A8A] font-bold rounded-xl hover:bg-[#1E3A8A]/5 transition-colors duration-200 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover-shine"
                                            >
                                                {isLoadingInquiry ? (
                                                    <>
                                                        <div className="w-4 h-4 rounded-full border-2 border-[#1E3A8A]/30 border-t-[#1E3A8A] animate-spin" />
                                                        <span>جاري التحميل...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        {/* WhatsApp SVG icon */}
                                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                        </svg>
                                                        <span>استفسر عبر واتس</span>
                                                    </>
                                                )}
                                            </button>
                                        </>
                                    )}

                                    {/* Course includes */}
                                    <div className="pt-2 border-t border-[#eeeef0]">
                                        <h4 className="font-bold text-[#1E3A8A] text-sm mb-3">تحتوي هذه الدورة على:</h4>
                                        <ul className="space-y-2.5 text-sm text-[#434751]">
                                            <li className="flex items-center gap-2.5">
                                                <ClockIcon className="w-4 h-4 text-[#DC2626] flex-shrink-0" />
                                                <span>{typeof course.duration === 'number' ? course.duration : 0} ساعة فيديو حسب الطلب</span>
                                            </li>
                                            <li className="flex items-center gap-2.5">
                                                <svg className="w-4 h-4 text-[#DC2626] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                                <span>الوصول عن طريق الجوال والتلفاز</span>
                                            </li>
                                            <li className="flex items-center gap-2.5">
                                                <CheckBadgeIcon className="w-4 h-4 text-[#DC2626] flex-shrink-0" />
                                                <span>شهادة إتمام</span>
                                            </li>
                                            <li className="flex items-center gap-2.5">
                                                <svg className="w-4 h-4 text-[#DC2626] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>وصول مدى الحياة</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CourseDetailPage;
