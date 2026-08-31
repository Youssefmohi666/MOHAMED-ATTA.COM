
import React, { useState, useEffect, useRef } from 'react';
import { getStats } from '../api/content.api';

interface StatItemProps {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  icon: React.ReactNode;
  delay?: number;
  color: string;
}

const StatItem: React.FC<StatItemProps> = ({ value, suffix = '', prefix = '', label, icon, delay = 0, color }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { setIsVisible(entry.isIntersecting); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const duration = 2000;
    const steps = 60;
    const stepValue = value / steps;
    let currentStep = 0;
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        currentStep++;
        setCount(Math.min(Math.round(stepValue * currentStep), value));
        if (currentStep >= steps) clearInterval(interval);
      }, duration / steps);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [isVisible, value, delay]);

  const formatNumber = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(num >= 10000 ? 0 : 1) + 'K';
    return num.toLocaleString('ar-SA');
  };

  return (
    <div
      ref={ref}
      className={`text-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Icon — glossy rounded */}
      <div className="mb-4 inline-flex">
        <div className="w-14 h-14 flex items-center justify-center rounded-2xl" style={{ background: `${color}20` }}>
          <div style={{ color }}>{icon}</div>
        </div>
      </div>

      {/* Value */}
      <div className="text-4xl md:text-5xl font-black text-white mb-2">
        <span style={{ color }}>{prefix}</span>
        {count >= 1000 ? formatNumber(count) : count.toLocaleString('ar-SA')}
        <span style={{ color }}>{suffix}</span>
      </div>

      {/* Label */}
      <p className="text-white/50 font-medium text-sm">{label}</p>
    </div>
  );
};

const Stats: React.FC = () => {
  const [students, setStudents] = useState(0);
  const [courses, setCourses] = useState(0);
  const [enrollments, setEnrollments] = useState(0);

  useEffect(() => {
    getStats()
      .then((json) => {
        const data = json?.data || json;
        if (data) {
          setStudents(data.totalStudents ?? 0);
          setCourses(data.totalSubjects ?? 0);
          setEnrollments(data.totalEnrollments ?? 0);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section dir="rtl" className="relative py-16 md:py-24 overflow-hidden bg-[#0f172a]">
      {/* Geometric background — NOT blobs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Diagonal lines */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 40px, white 40px, white 41px)' }} />
        {/* Large geometric shapes */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#DC2626] opacity-[0.06] rotate-45" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#1E3A8A] opacity-[0.08] rotate-12" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12 gloss-in gdelay-1">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] text-white font-bold text-xs mb-4 shadow-lg shadow-[#1E3A8A]/25">
            الأرقام
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3">أرقام نفتخر بيها</h2>
          <p className="text-white/40 text-lg">نمو مستمر وثقة متزايدة</p>
        </div>

        <div className="grid grid-cols-3 gap-6 lg:gap-10">
          <StatItem
            value={students}
            prefix="+"
            label="طالب نشط"
            delay={0}
            color="#DC2626"
            icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          />
          <StatItem
            value={courses}
            prefix="+"
            label="دورة تعليمية"
            delay={200}
            color="#3B82F6"
            icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
          />
          <StatItem
            value={enrollments}
            prefix="+"
            label="تسجيل في الدورات"
            delay={400}
            color="#93C5FD"
            icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
          />
        </div>
      </div>
    </section>
  );
};

export default Stats;
