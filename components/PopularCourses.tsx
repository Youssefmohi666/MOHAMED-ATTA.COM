import React, { useRef, useEffect, useState } from 'react';
import { getPopularCourses } from '../api/courses.api';
import { Course } from '../types/types';
import CourseCard from './CourseCard';
import { Page } from '../App';
import ArrowLeftIcon from './icons/ArrowLeftIcon';

interface PopularCoursesProps {
  onNavigate: (page: Page, payload?: any) => void;
}

const FALLBACK_COURSES: Course[] = [];

const PopularCourses: React.FC<PopularCoursesProps> = ({ onNavigate }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [courses, setCourses] = useState<Course[]>(FALLBACK_COURSES);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    getPopularCourses()
      .then((json: unknown) => {
        const raw = Array.isArray(json) ? json : ((json as { data?: unknown })?.data ?? []);
        const items = (Array.isArray(raw) ? raw : []).map((item: Record<string, unknown>) => ({
          id: Number(item['id']),
          guidId: String(item['id']),
          title: (item['title'] ?? item['name'] ?? '') as string,
          category: (item['category'] ?? 'عام') as string,
          description: (item['description'] ?? '') as string,
          instructorName: item['instructorName'] as string | undefined,
          rating: typeof item['rating'] === 'number' ? item['rating'] : 4.5,
          duration: typeof item['duration'] === 'number' ? item['duration'] : undefined,
          lecturesCount: typeof item['lecturesCount'] === 'number' ? item['lecturesCount'] : undefined,
          level: item['level'] as string | undefined,
          language: (item['language'] ?? 'العربية') as string,
          students: typeof item['studentsCount'] === 'number' ? item['studentsCount'] : 0,
          price: typeof item['price'] === 'number' ? item['price'] : 0,
          isFree: item['price'] === 0,
          imageUrl: (item['imageUrl'] as string) || '/assets/courses/default.png',
          lastUpdated: item['createdAt'] as string | undefined,
        }));
        if (items.length > 0) setCourses(items);
      })
      .catch((err) => {
        console.warn('Failed to load popular courses:', err);
      });

    const observer = new IntersectionObserver(
      ([entry]) => { setIsVisible(entry.isIntersecting); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section dir="rtl" ref={sectionRef} className="relative py-20 md:py-28 overflow-hidden bg-[#FAF6EB] dark:bg-[#0d1f33]">
      {/* NO blobs — geometric dots */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, #1E3A8A 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header — glossy badge */}
        <div className={`flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-12 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="gloss-in gdelay-1">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-gradient-to-br from-[#DC2626] to-[#EF4444] text-white font-bold text-xs mb-5 shadow-lg shadow-[#DC2626]/25">
              الأكثر طلباً
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-[#0f172a] dark:text-white mb-3 leading-tight">
              الدورات <span className="text-[#DC2626]">الأشهر</span>
            </h2>
            <p className="text-[#64748b] dark:text-slate-300 text-lg max-w-xl">
              اكتشف الدورات اللي حققت أعلى تقييمات من طلابنا
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('courses')}
            className="group flex items-center gap-3 px-6 py-3 rounded-xl text-white font-bold bg-gradient-to-l from-[#1E3A8A] to-[#3B82F6] shadow-[0_12px_30px_-8px_rgba(30,58,138,0.6)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer hover-shine"
          >
            <span>عرض كل الدورات</span>
            <div className="w-8 h-8 bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors rounded-lg">
              <ArrowLeftIcon className="w-4 h-4 text-white" />
            </div>
          </button>
        </div>

        {/* Courses Grid */}
        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.slice(0, 3).map((course, index) => (
              <div
                key={course.id}
                className={`transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${(index + 1) * 100}ms` }}
              >
                <CourseCard
                  course={course}
                  onClick={() => onNavigate('course-detail', { courseId: course.guidId || course.id })}
                  onEnroll={() => onNavigate('checkout', { courseId: course.guidId || course.id })}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className={`text-center py-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-300 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[#0f172a] dark:text-white mb-3">لا توجد دورات متاحة حالياً</h3>
            <p className="text-[#64748b] dark:text-slate-300 text-sm mb-6 max-w-sm mx-auto">نعمل على إضافة دورات جديدة قريباً.</p>
            <button
              onClick={() => onNavigate('courses')}
              className="px-6 py-3 rounded-xl text-white font-bold bg-gradient-to-l from-[#DC2626] to-[#EF4444] shadow-[0_12px_30px_-8px_rgba(220,38,38,0.6)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer hover-shine"
            >
              تصفح جميع الدورات
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default PopularCourses;
