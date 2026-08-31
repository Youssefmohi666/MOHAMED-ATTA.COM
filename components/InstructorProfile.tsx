import React, { useState, useEffect } from 'react';
import { Page, AccountType } from '../App';
import { Course } from '../types/types';
import { fetchCourses } from '../api/courses.api';
import { getStats } from '../api/content.api';
import StarIcon from './icons/StarIcon';

interface InstructorProfileProps {
    onNavigate: (page: Page, payload?: { accountType?: AccountType; courseId?: number | string }) => void;
    instructorName?: string;
}

const InstructorProfile: React.FC<InstructorProfileProps> = ({ onNavigate }) => {
    const [activeTab, setActiveTab] = useState<'courses' | 'about'>('courses');
    const [instructorCourses, setInstructorCourses] = useState<Course[]>([]);
    const [studentCount, setStudentCount] = useState<string | null>(null);

    useEffect(() => {
        fetchCourses().then(({ data }) => {
            setInstructorCourses(data);
        });
        getStats().then((json) => {
            const data = json?.data || json;
            if (data?.totalStudents) {
                const n = data.totalStudents;
                setStudentCount(n >= 1000 ? `+${(n / 1000).toFixed(0)}K` : `+${n}`);
            }
        }).catch(() => {});
    }, []);

    const about = [
        { label: 'الاسم الكامل', value: 'الأستاذ محمد عطا' },
        { label: 'المسمى الوظيفي', value: 'معلم مادة Science' },
        { label: 'التخصص', value: 'Science من الرابع الابتدائي حتى الأول الثانوي' },
        { label: 'أسلوب التدريس', value: 'شرح مبسط بأحدث التقنيات وامتحانات ذكية مخصصة' },
    ];

    return (
        <div dir="rtl" className="bg-[#FAF6EB] dark:bg-[#0a1628] min-h-screen" style={{ fontFamily: "'Cairo', sans-serif" }}>
            {/* Cover Image */}
            <div className="relative h-64 md:h-80 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A8A] via-[#1e2a5c] to-[#0d1f33]" />
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'radial-gradient(circle, #DC2626 1px, transparent 1px)',
                    backgroundSize: '28px 28px'
                }} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1E3A8A]/90 via-transparent to-transparent" />
            </div>

            {/* Profile Header */}
            <div className="container mx-auto max-w-6xl px-4 -mt-24 relative z-10">
                <div className="gloss-card rounded-3xl p-6 md:p-8">
                    <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
                        {/* Avatar */}
                        <div className="relative -mt-20 md:-mt-24">
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br from-[#1E3A8A] via-[#3B82F6] to-[#DC2626] flex items-center justify-center ring-4 ring-white dark:ring-[#0d1f33] shadow-2xl shadow-[#1E3A8A]/30">
                                <span className="text-5xl md:text-6xl font-black text-white">م ع</span>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center md:text-right">
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                                <h1 className="text-2xl md:text-3xl font-black text-[#1E3A8A] dark:text-white">الأستاذ محمد عطا</h1>
                                <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <p className="text-[#DC2626] font-semibold mb-2">معلم مادة Science</p>
                            <p className="text-[#1E3A8A]/50 dark:text-slate-400 text-sm max-w-2xl">
                                متخصص في تدريس مادة Science من الرابع الابتدائي حتى الأول الثانوي. شرح مبسط، امتحانات ذكية، وخطة دراسية مخصصة — وسهولة في الفهم والمراجعة.
                            </p>
                        </div>

                        {/* Live student count */}
                        {studentCount && (
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-gradient-to-br from-[#DC2626] to-[#EF4444] flex items-center justify-center text-white rounded-xl shadow-lg shadow-[#DC2626]/25">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-3.13a4 4 0 10-6 0m8-2a4 4 0 11-2.93-1.34 4 4 0 011.9 3.34M5 8h4" />
                                    </svg>
                                </div>
                                <div className="text-center md:text-right">
                                    <div className="text-lg font-black text-[#1E3A8A] dark:text-white">{studentCount}</div>
                                    <div className="text-xs text-[#1E3A8A]/40 dark:text-slate-400">طالب مسجّل</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Specialties */}
                    <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-2">
                        {[
                            'مادة Science',
                            'شروحات مبسطة',
                            'امتحانات ذكية',
                            'خطة دراسية مخصصة',
                            'بث مباشر',
                            'مساعد ذكي',
                        ].map((spec, idx) => (
                            <span
                                key={idx}
                                className="bg-[#EFF6FF] dark:bg-white/5 text-[#DC2626] dark:text-sky-400 text-sm font-semibold px-4 py-1.5 rounded-full border border-[#DC2626]/20"
                            >
                                {spec}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Tabs */}
                <div className="mt-8 mb-6">
                    <div className="gloss-card rounded-2xl p-2 inline-flex gap-2">
                        {[
                            { key: 'courses' as const, label: 'الدورات', icon: '📚' },
                            { key: 'about' as const, label: 'نبذة', icon: '👤' },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${activeTab === tab.key
                                    ? 'bg-[#1E3A8A] text-white shadow-lg shadow-[#1E3A8A]/30'
                                    : 'text-[#1E3A8A]/60 hover:bg-[#EFF6FF] hover:text-[#1E3A8A] dark:text-slate-300 dark:hover:bg-white/5'
                                    }`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="pb-16">
                    {activeTab === 'courses' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
                            {instructorCourses.length > 0 ? instructorCourses.map((course) => (
                                <div
                                    key={course.id}
                                    onClick={() => onNavigate('course-detail', { courseId: course.guidId || course.id })}
                                    className="bg-white dark:bg-[#0d1f33] rounded-2xl shadow-sm border border-[#DBEAFE]/30 dark:border-white/10 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1"
                                >
                                    <div className="relative h-48 overflow-hidden">
                                        <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-[#1E3A8A]">
                                            {course.category}
                                        </div>
                                        {(course.isFree || course.price === 0) && (
                                            <div className="absolute top-3 right-3 bg-[#DC2626] text-white px-3 py-1 rounded-full text-xs font-bold">
                                                مجاناً
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-5">
                                        <h3 className="font-bold text-[#1E3A8A] dark:text-white mb-2 group-hover:text-[#DC2626] transition-colors line-clamp-2">{course.title}</h3>
                                        <div className="flex items-center gap-4 text-sm text-[#1E3A8A]/50 dark:text-slate-400 mb-3">
                                            <span className="flex items-center gap-1">
                                                <StarIcon className="w-4 h-4 text-yellow-400" />
                                                {course.rating}
                                            </span>
                                            <span>{course.duration} ساعة</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-lg font-black text-[#DC2626]">
                                                {(course.isFree || course.price === 0) ? 'مجاناً' : `${Number(course.price).toLocaleString('ar-SA')} ج.م`}
                                            </span>
                                            <button className="text-[#1E3A8A] dark:text-sky-400 font-bold text-sm hover:text-[#DC2626] transition-colors">
                                                عرض التفاصيل ←
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-3 text-center py-16">
                                    <div className="text-6xl mb-4">📚</div>
                                    <h3 className="text-xl font-bold text-[#1E3A8A] dark:text-white mb-2">جاري إضافة الدورات</h3>
                                    <p className="text-[#1E3A8A]/50 dark:text-slate-400">سيتم إضافة دورات جديدة قريباً</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
                            <div className="bg-white dark:bg-[#0d1f33] rounded-2xl shadow-sm border border-[#DBEAFE]/30 dark:border-white/10 p-8">
                                <h3 className="text-xl font-bold text-[#1E3A8A] dark:text-white mb-6">👨‍🏫 معلومات شخصية</h3>
                                <div className="space-y-4">
                                    {about.map((info, idx) => (
                                        <div key={idx} className="flex justify-between items-center py-3 border-b border-[#DBEAFE]/30 dark:border-white/10 last:border-0 gap-4">
                                            <span className="text-[#1E3A8A]/50 dark:text-slate-400 text-sm">{info.label}</span>
                                            <span className="font-semibold text-[#1E3A8A] dark:text-white text-sm text-left">{info.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-[#0d1f33] rounded-2xl shadow-sm border border-[#DBEAFE]/30 dark:border-white/10 p-8">
                                <h3 className="text-xl font-bold text-[#1E3A8A] dark:text-white mb-6">🧪 عن أسلوبنا</h3>
                                <p className="text-[#1E3A8A]/70 dark:text-slate-300 text-sm leading-relaxed mb-4">
                                    نقدم شرحاً مبسطاً لمادة Science من الرابع الابتدائي حتى الأول الثانوي، مع تركيز على الفهم قبل الحفظ. كل درس مدعوم بتجارب علمية وامتحانات ذكية تقيس مدى استيعابك أولاً بأول.
                                </p>
                                <p className="text-[#1E3A8A]/70 dark:text-slate-300 text-sm leading-relaxed mb-4">
                                    مساعد الذكاء الاصطناعي يجيب على أسئلتك فوراً، وخطة دراسية مقترحة تنظم مذاكرتك وتحقق أفضل النتائج.
                                </p>
                                <button
                                    onClick={() => onNavigate('courses')}
                                    className="bg-[#DC2626] hover:bg-[#991B1B] text-white px-6 py-3 rounded-xl font-bold transition-all duration-200 shadow-lg shadow-[#DC2626]/30 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
                                >
                                    استكشف الدورات
                                </button>
                            </div>

                            <div className="md:col-span-2 bg-gradient-to-l from-[#1E3A8A] to-[#1e2a5c] rounded-2xl p-8 text-white shadow-xl">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div>
                                        <h3 className="text-xl font-bold mb-2">جاهز تبدأ رحلتك التعليمية؟</h3>
                                        <p className="text-white/60">سجل الآن يا بطلنا وابدأ مذاكرة Science بطريقة ممتعة ومبسطة</p>
                                    </div>
                                    <button
                                        onClick={() => onNavigate('courses')}
                                        className="bg-[#DC2626] hover:bg-[#991B1B] text-white px-8 py-4 rounded-xl font-bold transition-all duration-200 shadow-lg shadow-[#DC2626]/30 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
                                    >
                                        ابدأ التعلم الآن
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InstructorProfile;