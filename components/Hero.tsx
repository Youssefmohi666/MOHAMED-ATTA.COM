
import React, { useState, useEffect } from 'react';
import { Page } from '../App';
import { getStats } from '../api/content.api';

interface HeroProps {
  onNavigate: (page: Page) => void;
}

const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
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

  return (
    <div dir="rtl" className="relative overflow-hidden bg-gradient-to-b from-[#FBF5EF] via-[#FAF6EB] to-[#F3E6D8] dark:from-[#12233f] dark:via-[#0d1f33] dark:to-[#0a1628] dark:bg-gradient-to-b">
      {/* NO blobs — use geometric shapes instead */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Large diagonal red shape */}
        <div className="absolute -top-20 -left-20 w-[600px] h-[600px] bg-[#DC2626] opacity-[0.03] rotate-45 dark:opacity-[0.06]" />
        {/* Small blue rectangle */}
        <div className="absolute top-1/3 right-10 w-40 h-40 bg-[#1E3A8A] opacity-[0.04] rotate-12 dark:opacity-[0.12]" />
        {/* Dots grid pattern — NOT blurred */}
        <div className="absolute inset-0 opacity-[0.035] dark:opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle, #8a6a4a 1px, transparent 1px), radial-gradient(circle, #93c5fd 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-0 py-16 md:py-24 lg:py-28 min-h-[80vh]">

          {/* Right side — Content */}
          <div className="flex-1 lg:pl-16 text-center lg:text-right relative z-10">
            {/* Badge — glossy gradient pill */}
            <div className="gloss-in inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-l from-[#DC2626] to-[#EF4444] text-white font-bold text-sm mb-8 rounded-full shadow-lg shadow-[#DC2626]/25">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              أهلاً بيك يا بطلنا — الأستاذ محمد عطا — مادة Science
            </div>

            {/* Main Heading — bold, sharp, no gradient text */}
            <h1 className="gloss-in gdelay-1 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-[#0f172a] dark:text-white leading-[1.1] mb-6">
              اتعلم علوم
              <br />
              <span className="text-[#DC2626]">من غير ما تمل يا بطلنا</span>
            </h1>

            <p className="gloss-in gdelay-2 max-w-lg mx-auto lg:mx-0 text-lg md:text-xl text-[#64748b] dark:text-slate-300 mb-10 leading-relaxed">
              الأستاذ محمد عطا بيقدملك شرح مبسط للـ <strong className="text-[#1E3A8A]">Science</strong> من الرابع الابتدائي لغاية ما الأول الثانوي يا بطلنا
            </p>

            <div className="gloss-in gdelay-3 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <button
                onClick={() => onNavigate('courses')}
                className="cursor-pointer group w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-bold text-white bg-gradient-to-l from-[#DC2626] to-[#EF4444] hover:from-[#B91C1C] hover:to-[#DC2626] rounded-xl shadow-[0_12px_30px_-8px_rgba(220,38,38,0.6)] transition-all duration-200 hover:-translate-y-0.5"
              >
                <span>شوف الدورات</span>
                <svg className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-[-4px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => onNavigate('ai')}
                className="cursor-pointer group w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-bold text-[#1E3A8A] bg-white/70 backdrop-blur border border-[#1E3A8A]/15 hover:bg-[#1E3A8A]/5 rounded-xl shadow-md transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <span>جرّب المساعد الذكي</span>
              </button>
            </div>

            {/* Live stats indicator */}
            <div className="gloss-in gdelay-4 mt-12 flex flex-wrap items-center gap-5 justify-center lg:justify-start">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-[#DC2626] to-[#EF4444] rounded-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-3.13a4 4 0 10-6 0m8-2a4 4 0 11-2.93-1.34 4 4 0 011.9 3.34M5 8h4" />
                  </svg>
                </div>
                <div className="text-right">
                  <p className="text-[#0f172a] dark:text-white font-bold text-sm">{studentCount ?? '...'} طالب مسجّل</p>
                  <p className="text-[#94a3b8] dark:text-slate-400 text-xs">يتعلم معانا الآن</p>
                </div>
              </div>
            </div>
          </div>

          {/* Left side — Visual element (banner photo) */}
          <div className="flex-1 relative hidden lg:flex items-center justify-center">
            <div className="gloss-zoom relative w-full max-w-xl xl:max-w-3xl">
              {/* Warm decorative aura — matches image cream/terracotta/navy tones */}
              <div className="hero-aura absolute left-1/2 top-1/2 -z-10 w-[115%] aspect-square rounded-full"
                style={{ background: 'radial-gradient(circle at 35% 30%, rgba(213,168,138,0.55), rgba(248,246,235,0.4) 40%, rgba(30,58,138,0.12) 78%, transparent 100%)' }}
              />
              <div className="hero-aura dark:hidden absolute left-1/2 top-1/2 -z-10 w-[115%] aspect-square rounded-full"
                data-dark-aura
              />
              <style>{`
                html:not(.dark) [data-dark-aura] { display: none; }
              `}</style>
              {/* Terracotta accent circle */}
              <div className="absolute -left-6 -bottom-8 -z-10 w-40 h-40 rounded-full bg-[#E8B98A] opacity-40 blur-2xl dark:bg-[#3b2a1a] dark:opacity-60" aria-hidden="true" />
              {/* Navy accent circle */}
              <div className="absolute -right-8 -top-8 -z-10 w-44 h-44 rounded-full bg-[#1E3A8A] opacity-[0.14] blur-2xl dark:bg-[#2563EB] dark:opacity-[0.25]" aria-hidden="true" />

              {/* Main visual — uploaded banner photo (floating) */}
              <div className="hero-float relative rounded-3xl overflow-hidden shadow-[0_30px_70px_-15px_rgba(60,40,20,0.5)] border border-white/70 dark:border-white/10 dark:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.7)]">
                <img
                  src="/assets/hero-science-banner.png"
                  alt="اتعلم علوم من غير ما تمل يا بطلنا"
                  className="w-full h-auto object-cover"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom separator — sharp diagonal, NOT wave */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-[#FAF3E2] dark:bg-[#0a1628]" style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 0)' }} />
    </div>
  );
};

export default Hero;
