import React, { useRef, useEffect, useState } from 'react';

interface Unit {
  title: string;
  points: string[];
}

const STAGES = [
  {
    grade: 'الصف الرابع والصف الخامس الابتدائي',
    color: '#DC2626',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" />
        <path d="M19 14l.75 2.25L22 17l-2.25.75L19 20l-.75-2.25L16 17l2.25-.75L19 14z" />
      </svg>
    ),
    units: [
      { title: 'البداية مع العلوم', points: ['مقدمة في المادة والتغيرات', 'يعلّم الطالب أساسيات الملاحظة والتجربة'] },
      { title: 'الطقس والبيئة', points: ['مفاهيم الطقس وتغير المناخ', 'تصنيف بسيط للموارد الطبيعية'] },
    ],
  },
  {
    grade: 'الصف السادس الابتدائي',
    color: '#1E3A8A',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 010 18M12 3v18" />
        <path d="M3 12h18" />
      </svg>
    ),
    units: [
      { title: 'الخلايا والكائنات الحية', points: ['مدخل لوحدة البناء (الخلية)', 'تصنيف الكائنات الحية'] },
      { title: 'الطاقة من حولنا', points: ['أشكال الطاقة وتحولاتها', 'تجارب علمية مبسطة'] },
    ],
  },
  {
    grade: 'الصف الأول الإعدادي',
    color: '#7C3AED',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    units: [
      { title: 'المادة وتركيبها', points: ['الذرة والعناصر', 'الخواص الفيزيائية والكيميائية'] },
      { title: 'الحركة والقوى', points: ['السرعة والحركة المستقيمة', 'القوى وتأثيرها على الأجسام'] },
    ],
  },
  {
    grade: 'الصف الثاني الإعدادي',
    color: '#059669',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4m0 0a4 4 0 014 4h-8a4 4 0 014-4zM12 6v4M4 14l2 2M20 14l-2 2M6 18l2-2m-2 2h12" />
      </svg>
    ),
    units: [
      { title: 'الكهرباء والضوء', points: ['التيار الكهربي والدوائر', 'المرايا والعدسات وانعكاس الضوء'] },
      { title: 'الغلاف الجوي', points: ['طبقات الغلاف الجوي', 'أهمية الهواء للحياة'] },
    ],
  },
  {
    grade: 'الصف الثالث الإعدادي',
    color: '#0EA5E9',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M16.5 6a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM3 20a9 9 0 0118 0" />
      </svg>
    ),
    units: [
      { title: 'الجينات والتكاثر', points: ['التكاثر في الكائنات الحية', 'مقدمة إلى الوراثة والجينات'] },
      { title: 'الكون والنظام الشمسي', points: ['المجموعة الشمسية', 'الحركة اليومية للأرض والقمر'] },
    ],
  },
  {
    grade: 'المرحلة الثانوية (أولى ثانوي)',
    color: '#F59E0B',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    units: [
      { title: 'المادة في المرحلة الثانوية', points: ['ربط فروع العلوم بعضها ببعض', 'المهارات الاستقصائية والمشاريع'] },
      { title: 'جاهزية الامتحانات', points: ['الامتحانات الذكية والمراجعة المركزة', 'التطبيق العملي والتفكير العلمي'] },
    ],
  },
];

const CurriculumContent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { setIsVisible(e.isIntersecting); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section dir="rtl" ref={sectionRef} className="py-20 md:py-28 px-4 bg-[#FAF6EB] dark:bg-[#0d1f33] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #1E3A8A 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      <div className="container mx-auto max-w-6xl relative z-10">
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="gloss-in gdelay-1">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] text-white font-bold text-xs mb-5 shadow-lg shadow-[#1E3A8A]/25">
            منهج Science
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-[#0f172a] dark:text-white mb-4 leading-tight">
            محتوى المنهج <span className="text-[#DC2626]">مرحلة بمرحلة</span>
          </h2>
          <p className="text-[#64748b] dark:text-slate-300 text-lg max-w-2xl mx-auto">
            رحلة تعليمية متكاملة من الصف الرابع الابتدائي حتى الأول الثانوي، كل مرحلة محتوى مبني على اللي قبلها
          </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {STAGES.map((stage, i) => (
            <div
              key={stage.grade}
              className={`group gloss-card rounded-2xl p-6 relative ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              {/* Colored top bar */}
              <div className="absolute top-0 right-0 left-0 rounded-t-2xl h-1" style={{ background: stage.color }} />

              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg" style={{ background: `${stage.color}18`, color: stage.color }}>
                  {stage.icon}
                </div>
                <h3 className="font-black text-[#0f172a] dark:text-white text-base leading-snug">{stage.grade}</h3>
              </div>

              {/* Units */}
              <div className="space-y-4">
                {stage.units.map((unit) => (
                  <div key={unit.title} className="border-r-2 pr-4" style={{ borderColor: `${stage.color}40` }}>
                    <p className="font-bold text-sm text-[#0f172a] dark:text-white mb-1.5">{unit.title}</p>
                    <ul className="space-y-1">
                      {unit.points.map((pt) => (
                        <li key={pt} className="flex items-start gap-2 text-[#64748b] dark:text-slate-300 text-xs leading-relaxed">
                          <span className="mt-1.5 w-1.5 h-1.5 flex-shrink-0" style={{ background: stage.color }} />
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CurriculumContent;
