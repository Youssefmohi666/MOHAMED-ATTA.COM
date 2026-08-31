import React, { useRef, useEffect, useState } from 'react';
import { getStats } from '../api/content.api';

interface Testimonial {
  name: string;
  role: string;
  rating: number;
  text: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'محمد العمري',
    role: 'طلاب الصف الخامس الابتدائي',
    rating: 5,
    text: 'غيّرت طريقة تعلمي للعلوم. الشرح المبسط جعل الفهم أسهل بكثير.',
  },
  {
    name: 'سارة الزهراني',
    role: 'طالبة أولى ثانوي',
    rating: 5,
    text: 'تجربة تعليمية استثنائية! الخطة الدراسية ساعدتني على فهم المادة وتحسين درجاتي بشكل ملحوظ.',
  },
  {
    name: 'أحمد الشمري',
    role: 'طالب علوم',
    rating: 5,
    text: 'أفضل استثمار قمت به. الامتحانات تجعل مراجعة مادة العلوم سهلة ومركزة، والشرح واضح في كل المستويات.',
  },
  {
    name: 'نورة القحطاني',
    role: 'ولي أمر',
    rating: 5,
    text: 'التقارير الشهرية بتديني رؤية واضحة عن تقدم ابني. أقدر اهتمام المعلم بكل طالب.',
  },
  {
    name: 'عبدالله المطيري',
    role: 'طالب ثانوي',
    rating: 5,
    text: 'تجمع بين الجودة والسهولة. أتمكن من مشاهدة الفيديوهات وحل الامتحانات في أي وقت.',
  },
  {
    name: 'ريم الدوسري',
    role: 'طالبة ثانوي',
    rating: 5,
    text: 'استفدت كثيراً من الخطة الدراسية المقترحة. الأستاذ يشرح بطريقة مبسطة وواضحة.',
  },
];

const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex items-center gap-0.5" role="img" aria-label={`تقييم ${rating} من 5 نجوم`}>
    {Array.from({ length: 5 }).map((_, i) => (
      <svg
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400' : 'text-gray-200 dark:text-slate-600'}`}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ))}
  </div>
);

const useInView = (threshold = 0.15) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
};

const TestimonialCard: React.FC<{ testimonial: Testimonial; index: number }> = ({ testimonial, index }) => {
  const { ref, visible } = useInView();
  const colors = ['#DC2626', '#1E3A8A', '#3B82F6', '#7C3AED', '#059669', '#F59E0B'];
  const accentColor = colors[index % colors.length];

  return (
    <div
      ref={ref}
      className={`group gloss-card rounded-2xl p-6 relative ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      {/* Top accent bar — colored, NOT quote mark */}
      <div className="absolute top-0 right-0 left-0 rounded-t-2xl h-1" style={{ background: accentColor }} />

      {/* Rating */}
      <div className="mb-4">
        <StarRating rating={testimonial.rating} />
      </div>

      {/* Text */}
      <p className="text-[#334155] dark:text-slate-300 text-sm leading-relaxed mb-5">
        {testimonial.text}
      </p>

      {/* Divider */}
      <div className="h-px bg-gray-100 dark:bg-white/10 mb-4" aria-hidden="true" />

      {/* Student info */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 flex items-center justify-center text-white text-sm font-bold" style={{ background: accentColor }}>
          {testimonial.name.charAt(0)}
        </div>
        <div>
          <p className="font-bold text-[#0f172a] dark:text-white text-sm">{testimonial.name}</p>
          <span className="text-xs font-medium" style={{ color: accentColor }}>{testimonial.role}</span>
        </div>
      </div>
    </div>
  );
};

const Testimonials: React.FC = () => {
  const { ref: headerRef, visible: headerVisible } = useInView(0.1);
  const [stats, setStats] = useState<{ value: string; label: string; color: string }[]>([
    { value: '...', label: 'طالب مسجّل', color: '#DC2626' },
    { value: '...', label: 'دورة تعليمية', color: '#3B82F6' },
    { value: '...', label: 'تسجيل في الدورات', color: '#93C5FD' },
  ]);

  useEffect(() => {
    getStats().then((json) => {
      const data = json?.data || json;
      if (data) {
        const students: number = data.totalStudents ?? 0;
        const subjects: number = data.totalSubjects ?? 0;
        const enrollments: number = data.totalEnrollments ?? 0;
        const fmt = (n: number) => (n >= 1000 ? `+${(n / 1000).toFixed(0)}K` : `+${n}`);
        setStats([
          { value: fmt(students), label: 'طالب مسجّل', color: '#DC2626' },
          { value: fmt(subjects), label: 'دورة تعليمية', color: '#3B82F6' },
          { value: fmt(enrollments), label: 'تسجيل في الدورات', color: '#93C5FD' },
        ]);
      }
    }).catch(() => {});
  }, []);

  return (
    <section dir="rtl" className="py-20 md:py-28 px-4 bg-[#FAF3E2] dark:bg-[#0a1628] relative overflow-hidden">
      {/* NO blobs — geometric dots */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'radial-gradient(circle, #DC2626 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      </div>

      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Header — sharp badge */}
        <div ref={headerRef} className={`text-center mb-16 transition-all duration-700 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="gloss-in gdelay-1">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-gradient-to-br from-[#DC2626] to-[#EF4444] text-white font-bold text-xs mb-5 shadow-lg shadow-[#DC2626]/25">
            آراء طلابنا
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-[#0f172a] dark:text-white mb-4 leading-tight">
            طلابنا <span className="text-[#DC2626]">بيقولوا إيه</span>
          </h2>
          <p className="text-[#64748b] dark:text-slate-300 text-lg max-w-xl mx-auto">
            تجارب حقيقية من طلاب اشتركوا معنا
          </p>
          </div>
        </div>

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {TESTIMONIALS.map((testimonial, i) => (
            <TestimonialCard key={testimonial.name} testimonial={testimonial} index={i} />
          ))}
        </div>

        {/* Bottom CTA — dark bg, sharp corners, NOT rounded */}
        <div className={`mt-16 glass-dark rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-700 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '400ms' }}>
          <div className="text-center md:text-right">
            <h3 className="text-2xl font-black text-white mb-2">جاهز تبدأ؟</h3>
            <p className="text-white/50 text-sm">انضم لآلاف الطلاب اللي بيتعلموا معانا</p>
          </div>
          <div className="flex flex-wrap gap-8 justify-center">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-white/40 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
