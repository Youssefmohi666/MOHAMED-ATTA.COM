import React, { useState, useEffect, useCallback } from 'react';
import { getStats } from '../api/content.api';

const PLATFORM_FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
    title: 'ذكاء اصطناعي متقدم',
    desc: 'مساعد ذكي يشرحلك أي مفهوم صعب',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    title: 'مادة Science',
    desc: 'من الرابع الابتدائي حتى الأول الثانوي',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    title: 'مدرّس محترف',
    desc: 'خبرة سنين في تدريس العلوم',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    title: 'منهج محدث 2026',
    desc: 'مطابق للمنهج المصري الحديث',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v.375" />
      </svg>
    ),
    title: 'اختبارات ذكية',
    desc: 'اختبارات تقييمية مع تحليل الأداء',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
    title: 'شهادات إتمام',
    desc: 'احصل على شهادة بعد إنهاء كل دورة',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
    title: 'مجتمع طلابي',
    desc: 'تفاعل مع آلاف الطلاب والمدرسين',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'تعلم في أي وقت',
    desc: 'تعلم بالسرعة اللي تناسبك',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: 'تتبع التقدم',
    desc: 'تابع مستواك ونقاطك بشكل مباشر',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0116.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-5.541 0m5.541 0L12 14.25m0 0l-2.25-2.25m2.25 2.25V17.25" />
      </svg>
    ),
    title: 'جوايز وتحفيز',
    desc: 'اكسب نقاط وओسمات مع التقدم',
  },
];

interface AuthLayoutProps {
  children: React.ReactNode;
  mode: 'login' | 'signup';
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, mode }) => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [studentCount, setStudentCount] = useState<string | null>(null);

  useEffect(() => {
    getStats().then((json) => {
      const data = json?.data || json;
      if (data?.totalStudents) {
        const n = data.totalStudents;
        setStudentCount(n >= 1000 ? `+${(n / 1000).toFixed(0)}K` : `+${n}`);
      }
    }).catch(() => {});
  }, []);

  const next = useCallback(() => {
    setCurrent((i) => (i + 1) % PLATFORM_FEATURES.length);
  }, []);

  const prev = useCallback(() => {
    setCurrent((i) => (i - 1 + PLATFORM_FEATURES.length) % PLATFORM_FEATURES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 4000);
    return () => clearInterval(id);
  }, [paused, next]);

  return (
    <div dir="rtl" className="min-h-screen flex bg-white font-cairo">
      {/* Right side — Form */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-6 md:p-10 relative">
        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#DC2626]/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#1E3A8A]/5 rounded-full blur-3xl" />
        </div>
        <div className="w-full max-w-md relative z-10">{children}</div>
      </div>

      {/* Left side — Feature Slides (glossy glass) */}
      <div className="hidden lg:flex w-[45%] bg-gradient-to-br from-[#0f172a] via-[#1E3A8A] to-[#1e2a5c] relative overflow-hidden">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Glow spots */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-[#DC2626]/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 left-20 w-60 h-60 bg-[#93C5FD]/10 rounded-full blur-[80px]" />

        <div className="relative z-10 flex flex-col justify-center w-full p-10 xl:p-14">
          {/* Greeting */}
          <div className="gloss-in mb-8">
            <h1 className="text-white font-black text-3xl xl:text-4xl leading-tight mb-3">
              {mode === 'login'
                ? 'رجعت لنا؟ أهلاً بيك!'
                : 'ابدأ رحلتك العلمية الآن'}
            </h1>
            <p className="text-white/60 text-sm leading-relaxed max-w-md">
              {mode === 'login'
                ? 'سجّل دخولك وكمل منين ما وقفت. دروسك واختباراتك ومساعدك الذكي مستنيك.'
                : 'انضم لآلاف الطلاب اللي بيتعلموا العلوم بطريقة مختلفة. ذكاء اصطناعي، اختبارات ذكية، ومحتوى محدث.'}
            </p>
          </div>

          {/* Animated Feature Slides */}
          <div
            className="relative"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div className="relative min-h-[130px]">
              {PLATFORM_FEATURES.map((feat, idx) => (
                <div
                  key={idx}
                  className={`absolute inset-0 flex items-center gap-4 p-5 rounded-2xl glass-dark border border-white/10 transition-all duration-700 ease-in-out ${
                    idx === current
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-4 pointer-events-none'
                  }`}
                  aria-hidden={idx !== current}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#DC2626] to-[#EF4444] text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#DC2626]/30">
                    {feat.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-white font-bold text-base leading-tight mb-1">{feat.title}</h3>
                    <p className="text-white/50 text-sm leading-snug">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="mt-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={prev}
                  className="cursor-pointer w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                  aria-label="السابق"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={next}
                  className="cursor-pointer w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                  aria-label="التالي"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-2">
                {PLATFORM_FEATURES.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrent(idx)}
                    className={`cursor-pointer rounded-full transition-all duration-300 ${
                      idx === current
                        ? 'w-6 h-2 bg-gradient-to-r from-[#DC2626] to-[#EF4444]'
                        : 'w-2 h-2 bg-white/25 hover:bg-white/50'
                    }`}
                    aria-label={`شريحة ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Bottom trust */}
          <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse" aria-hidden="true" />
            <p className="text-white/80 text-xs font-bold">{studentCount ?? '...'} طالب مسجّل</p>
            <p className="text-white/40 text-[10px]">بيتعلم معانا دلوقتي</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;