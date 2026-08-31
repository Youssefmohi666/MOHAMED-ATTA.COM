import React, { useRef, useEffect, useState } from 'react';

const FEATURES = [
  {
    title: 'شروحات بأحدث التقنيات',
    description: 'مساعد ذكي بيفهمك أي مفهوم صعب وبيشرحه بأسلوب مبسط ومواكب لأحدث الوسائل التعليمية.',
    color: '#DC2626',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        <path d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
  },
  {
    title: 'امتحانات ذكية',
    description: 'حدد أي جزء من المحاضرة واحصل على امتحان مخصص وجاهز خلال ثوانٍ.',
    color: '#1E3A8A',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'منهج محدث 2026',
    description: 'محتوى مطابق للمنهج المصري الحديث مع شروحات مبسطة وأمثلة محلولة.',
    color: '#7C3AED',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    title: 'خطة دراسية مقترحة',
    description: 'ادخل مستواك وأدائك واحصل على خطة مذاكرة مخصصة تناسبك خطوة بخطوة.',
    color: '#059669',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    title: 'تقارير شهرية',
    description: 'تتبع تقدمك مع تقارير شهرية شاملة تبعت لولي الأمر.',
    color: '#F59E0B',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    title: 'مجتمع طلابي',
    description: 'تفاعل مع آلاف الطلاب والمدرسين وشارك الأسئلة والإجابات.',
    color: '#0EA5E9',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
];

const FeatureItem: React.FC<{ feature: (typeof FEATURES)[number]; index: number }> = ({ feature, index }) => {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`group relative flex items-start gap-6 transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
      }`}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      {/* Timeline dot — sharp square, pops in */}
      <div
        className={`hidden lg:flex flex-shrink-0 w-14 h-14 items-center justify-center relative z-10 transition-all duration-500 ease-out ${
          visible ? 'rotate-0 scale-100' : 'rotate-12 scale-50'
        }`}
        style={{ background: feature.color, transitionDelay: `${index * 120 + 150}ms` }}
      >
        <span className="text-white font-black text-sm">{String(index + 1).padStart(2, '0')}</span>
      </div>

      {/* Content card — glossy frosted */}
      <div className="flex-1 gloss-card rounded-2xl p-6 group-hover:-translate-y-1 relative">
        {/* Left accent bar */}
        <div className="absolute top-0 right-0 rounded-r-2xl w-1 h-full transition-all duration-300 group-hover:w-1.5" style={{ background: feature.color }} />

        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
              visible ? 'group-hover:scale-110 group-hover:rotate-6' : ''
            }`}
            style={{ background: `${feature.color}18`, color: feature.color }}
          >
            {feature.icon}
          </div>
          <div>
            <h3 className="text-lg font-black text-[#0f172a] dark:text-white mb-1.5 group-hover:text-[#1E3A8A] transition-colors">
              {feature.title}
            </h3>
            <p className="text-[#64748b] dark:text-slate-300 text-sm leading-relaxed">
              {feature.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Features: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { setIsVisible(entry.isIntersecting); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section dir="rtl" ref={sectionRef} className="relative py-20 md:py-28 bg-[#FAF6EB] dark:bg-[#0a1628] overflow-hidden">
      {/* NO blobs — geometric dots */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #DC2626 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header — different style: left-aligned, not centered */}
        <div className={`flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} glow-ring`}>
          <div className="gloss-in gdelay-1">
            {/* Badge — glossy gradient pill */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] text-white font-bold text-xs mb-5 shadow-lg shadow-[#1E3A8A]/25">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              المميزات
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-[#0f172a] dark:text-white mb-3 leading-tight">
              ليه <span className="text-[#DC2626]">محمد عطا</span> مختلف؟
            </h2>
            <p className="text-lg text-[#64748b] dark:text-slate-300 max-w-xl">
              مش بس دورات عادية — عندنا أدوات بتخلي التعلم أسهل وأسرع
            </p>
          </div>
        </div>

        {/* Features — horizontal timeline-style, NOT grid of rounded cards */}
        <div className="relative">
          {/* Vertical line — horizontal timeline approach */}
          <div className="absolute top-0 bottom-0 right-[27px] w-0.5 bg-gray-200 dark:bg-white/10 hidden lg:block" />

          <div className="space-y-6">
            {FEATURES.map((feature, index) => (
              <FeatureItem key={feature.title} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;