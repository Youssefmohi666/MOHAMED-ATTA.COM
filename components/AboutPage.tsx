
import React, { useRef, useEffect, useState } from 'react';
import { Page } from '../App';
import { getStats } from '../api/content.api';

interface AboutPageProps {
  onNavigate: (page: Page) => void;
}

const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const [stats, setStats] = useState<{ num: string; label: string }[]>([
    { num: '...', label: 'طالب مسجل' },
    { num: '...', label: 'دورة تعليمية' },
    { num: '...', label: 'تسجيل في الدورات' },
  ]);

  useEffect(() => {
    getStats().then((json) => {
      const data = json?.data || json;
      if (data) {
        const students: number = data.totalStudents ?? 0;
        const courses: number = data.totalSubjects ?? 0;
        const enrollments: number = data.totalEnrollments ?? 0;
        setStats([
          { num: students >= 1000 ? `+${(students / 1000).toFixed(0)}K` : `+${students}`, label: 'طالب مسجل' },
          { num: `+${courses}`, label: 'دورة تعليمية' },
          { num: `+${enrollments}`, label: 'تسجيل في الدورات' },
        ]);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div dir="rtl" className="bg-[#FAF6EB] min-h-screen font-cairo">
      {/* Hero Section — different style: asymmetric split */}
      <div className="relative min-h-[60vh] flex items-center overflow-hidden bg-[#0f172a]">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        {/* Gradient orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#DC2626]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#1E3A8A]/30 rounded-full blur-[100px]" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-20 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/10 gloss-in gdelay-1">
                <span className="w-2 h-2 bg-[#DC2626] rounded-full animate-pulse" />
                <span className="text-white/80 text-sm font-medium">تعرف علينا</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white leading-tight gloss-in gdelay-2">
                تعلم مع
                <span className="block text-[#DC2626]">محمد عطا</span>
              </h1>
              <p className="text-xl text-white/70 leading-relaxed max-w-lg gloss-in gdelay-3">
                أكثر من منصة تعليمية — نحن شريكك في رحلة إتقان مادة Science.
              </p>
              <div className="flex flex-wrap gap-4 gloss-in gdelay-3">
                <button
                  onClick={() => onNavigate('courses')}
                  className="px-8 py-4 bg-gradient-to-l from-[#DC2626] to-[#EF4444] text-white font-bold rounded-xl shadow-lg shadow-[#DC2626]/25 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer hover-shine"
                >
                  ابدأ التعلم الآن
                </button>
                <button
                  onClick={() => onNavigate('contact')}
                  className="px-8 py-4 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all duration-200 cursor-pointer backdrop-blur-sm border border-white/10 hover:-translate-y-0.5 hover-shine"
                >
                  تواصل معنا
                </button>
              </div>
            </div>

            {/* Visual element — floating cards */}
            <div className="relative hidden lg:flex items-center justify-center h-[400px]">
              <div className="absolute top-10 right-0 w-64 gloss-card p-5 border border-white/10 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-[#DC2626] to-[#EF4444] rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-[#DC2626]/25">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-white font-bold mb-1">ذكاء اصطناعي</h3>
                <p className="text-white/60 text-sm">تعلم تفاعلي مع مساعد ذكي</p>
              </div>

              <div className="absolute bottom-10 left-0 w-56 gloss-card p-5 border border-white/10 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-[#1E3A8A]/25">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-white font-bold mb-1">مادة واحدة متكاملة</h3>
                <p className="text-white/60 text-sm">العلوم من رابعة ابتدائي حتى أولى ثانوي</p>
              </div>

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-br from-[#DC2626] to-[#1E3A8A] rounded-3xl flex items-center justify-center transform rotate-6 hover:rotate-0 transition-transform duration-300 shadow-2xl">
                <span className="text-6xl font-black text-white">م ع</span>
              </div>
            </div>
          </div>
        </div>

        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 105C120 90 240 60 360 52.5C480 45 600 60 720 67.5C840 75 960 75 1080 67.5C1200 60 1320 45 1380 37.5L1440 30V120H0Z" fill="white" />
          </svg>
        </div>
      </div>

      {/* Mission & Vision — asymmetric cards */}
      <section ref={sectionRef} className="py-20 container mx-auto px-4">
        <div className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Mission */}
            <div className="group relative gloss-card p-8 md:p-10 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#DC2626]/10 rounded-full blur-2xl group-hover:bg-[#DC2626]/20 transition-colors duration-300" />
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-[#DC2626] to-[#EF4444] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#DC2626]/25">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-black text-[#1E3A8A] mb-4">مهمتنا</h2>
                <p className="text-[#434751] leading-relaxed text-lg">
                  تمكين الطلاب من تعلم العلوم بطريقة مبتكرة وتفاعلية. نستخدم أحدث تقنيات الذكاء الاصطناعي لتقديم تجربة تعليمية فريدة تساعد الطلاب على فهم العالم من حولهم.
                </p>
              </div>
            </div>

            {/* Vision */}
            <div className="group relative gloss-card p-8 md:p-10 overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 bg-[#1E3A8A]/10 rounded-full blur-2xl group-hover:bg-[#1E3A8A]/20 transition-colors duration-300" />
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#1E3A8A]/25">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-black text-[#1E3A8A] mb-4">رؤيتنا</h2>
                <p className="text-[#434751] leading-relaxed text-lg">
                  أن نكون الخيار الأول في مصر والعالم العربي لتعليم مادة Science بالطريقة الحديثة، ونصنع جيلاً من الطلاب المستقلين في التعلم والتفكير العلمي.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values — numbered cards with different styles */}
      <section className="py-20 bg-[#0f172a] relative overflow-hidden">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16 gloss-in gdelay-1">
            <span className="inline-block px-4 py-2 bg-white/10 rounded-full text-white/80 font-medium text-sm mb-4">
              لماذا نحن
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">ما يميزنا عن غيرنا</h2>
            <p className="text-white/60 max-w-xl mx-auto">نجمع بين الخبرة التعليمية والتقنية لنقدم لك أفضل تجربة تعلم ممكنة</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                title: 'محتوى علمي موثوق',
                desc: 'جميع الدورات مراجعة من متخصصين في العلوم وفق المنهج المصري الحديث.',
                color: 'from-[#DC2626] to-[#991B1B]',
              },
              {
                num: '02',
                title: 'تعلم بالذكاء الاصطناعي',
                desc: 'مساعد ذكي يجيب على أسئلتك فوراً ويساعدك على فهم المفاهيم الصعبة.',
                color: 'from-[#1E3A8A] to-[#3B82F6]',
              },
              {
                num: '03',
                title: 'مجتمع تفاعلي',
                desc: 'انضم لمجتمع طلاب يدعم بعضهم البعض ويشارك الموارد والمعرفة.',
                color: 'from-[#DC2626] to-[#1E3A8A]',
              },
            ].map((value, idx) => (
              <div
                key={idx}
                className={`group relative gloss-card p-8 hover:bg-white/10 transition-all duration-300 reveal reveal-delay-${idx + 1}`}
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${value.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#1E3A8A]/25`}>
                  <span className="text-2xl font-black text-white">{value.num}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{value.title}</h3>
                <p className="text-white/60 leading-relaxed">{value.desc}</p>
                {/* Bottom accent line */}
                <div className="absolute bottom-0 right-0 left-0 h-1 bg-gradient-to-r ${value.color} rounded-b-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats — clean horizontal layout */}
      <section className="py-16 border-b border-[#e5e7eb] dark:border-white/10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-center">
            {stats.map((stat, idx) => (
              <div key={idx} className={`gloss-in gdelay-${idx + 1}`}>
                <div className="text-3xl md:text-4xl font-black text-[#DC2626] mb-2">{stat.num}</div>
                <div className="text-[#434751] font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team CTA — different style */}
      <section className="py-20 container mx-auto px-4">
        <div className="relative bg-gradient-to-br from-[#1E3A8A] to-[#1e2a5c] rounded-3xl p-12 md:p-16 text-center overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#DC2626]/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl" />

          <div className="relative z-10">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/20 gloss-in gdelay-1">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4 gloss-in gdelay-2">جاهز تبدأ رحلتك العلمية؟</h2>
            <p className="text-white/70 mb-8 max-w-xl mx-auto text-lg gloss-in gdelay-3">
              الأستاذ محمد عطا هنا لمساعدتك. سواء عندك سؤال عن مادة أو محتاج نصيحة، تواصل معنا وسنساعدك.
            </p>
            <div className="flex flex-wrap justify-center gap-4 gloss-in gdelay-3">
              <button
                onClick={() => onNavigate('contact')}
                className="px-8 py-4 bg-white text-[#1E3A8A] font-bold rounded-xl hover:bg-[#DBEAFE] transition-all duration-200 flex items-center gap-2 cursor-pointer hover:-translate-y-0.5 shadow-lg hover-shine"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                تواصل معنا
              </button>
              <button
                onClick={() => onNavigate('pricing')}
                className="px-8 py-4 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all duration-200 cursor-pointer backdrop-blur-sm border border-white/20 hover:-translate-y-0.5 hover-shine"
              >
                شاهد الباقات
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
