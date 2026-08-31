
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FILTER_LEVELS } from '../constants';
import CourseCard from './CourseCard';
import { getCourses } from '../api/courses.api';
import { Course } from '../types/types';
import { Page } from '../App';

interface CoursesPageProps {
  onNavigate?: (page: Page, payload?: any) => void;
  isTeacher?: boolean;
}

const PER_PAGE = 9;
const DEBOUNCE_MS = 400;

function mapCourseItem(item: any): Course {
  return {
    id: Number(item.id) || 0,
    guidId: typeof item.id === 'string' && item.id.includes('-') ? item.id : (item.guidId || undefined),
    title: item.title ?? '',
    category: item.category ?? 'عام',
    description: item.description ?? '',
    instructorName: item.instructorName ?? undefined,
    instructorId: typeof item.instructorId === 'number' ? item.instructorId : undefined,
    rating: typeof item.rating === 'number' ? item.rating : 4.5,
    duration: typeof item.duration === 'number' ? item.duration : undefined,
    lecturesCount: typeof item.lecturesCount === 'number' ? item.lecturesCount : undefined,
    level: item.level ?? undefined,
    language: item.language ?? 'العربية',
    students: typeof item.studentsCount === 'number' ? item.studentsCount : 0,
    price: typeof item.price === 'number' ? item.price : 0,
    isFree: item.price === 0,
    imageUrl: item.imageUrl || '/assets/courses/default.png',
    lastUpdated: item.createdAt ?? item.updatedAt ?? undefined,
  };
}

// Search icon SVG
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

// X icon SVG
const XIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

// Filter icon SVG
const FilterIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

// Chevron down icon SVG
const ChevronDownIcon = ({ rotated }: { rotated?: boolean }) => (
  <svg
    className={`w-4 h-4 transition-transform duration-200 ${rotated ? 'rotate-180' : ''}`}
    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

// Chevron left/right for pagination
const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6" />
  </svg>
);

// Skeleton card for loading state
const SkeletonCard = () => (
  <div className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
    <div className="h-44 bg-[#e2e2e9]" />
    <div className="p-5 space-y-3">
      <div className="h-4 bg-[#e2e2e9] rounded-full w-3/4" />
      <div className="h-3 bg-[#e2e2e9] rounded-full w-1/2" />
      <div className="h-3 bg-[#e2e2e9] rounded-full w-1/3" />
      <div className="flex justify-between items-center pt-2">
        <div className="h-5 bg-[#e2e2e9] rounded-full w-1/4" />
        <div className="h-8 bg-[#e2e2e9] rounded-xl w-1/3" />
      </div>
    </div>
  </div>
);

const CoursesPage: React.FC<CoursesPageProps> = ({ onNavigate, isTeacher = false }) => {

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showFiltersOnMobile, setShowFiltersOnMobile] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [courses, setCourses] = useState<Course[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const loadCourses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = { page: currentPage, per_page: PER_PAGE };
      if (searchQuery) params.search = searchQuery;
      if (selectedLevel && selectedLevel !== 'جميع المستويات') params.level = selectedLevel;
      if (selectedCategory) params.category = selectedCategory;

      const json = await getCourses(params);
      const raw = Array.isArray(json) ? json : (json.data ?? []);
      const items: Course[] = (Array.isArray(raw) ? raw : []).map(mapCourseItem);
      setCourses(items);

      if (json.meta) {
        const total = json.meta.total ?? 0;
        const perPage = json.meta.perPage ?? PER_PAGE;
        setTotalCount(total);
        setTotalPages(Math.max(1, Math.ceil(total / perPage)));
      } else {
        setTotalCount(items.length);
        setTotalPages(1);
      }

      if (!selectedCategory && !selectedLevel && !searchQuery && currentPage === 1) {
        const cats = [...new Set(items.map(c => c.category).filter(Boolean))];
        if (cats.length) setAllCategories(cats);
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Network request failed')) {
        setError('تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.');
      } else {
        setError(msg || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, selectedLevel, selectedCategory]);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Debounced search input
  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      setSearchQuery(value);
    }, DEBOUNCE_MS);
  };

  const handleLevelChange = (level: string) => {
    setSelectedLevel(prev => prev === level ? '' : level);
    setCurrentPage(1);
  };

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(prev => prev === cat ? '' : cat);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSelectedLevel('');
    setSelectedCategory('');
    setSearchInput('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const hasActiveFilters = selectedLevel || selectedCategory || searchQuery;

  return (
    <div className="min-h-screen bg-[#f9f9ff]" dir="rtl">

      {/* Page Header */}
      <div className="bg-gradient-to-bl from-[#1E3A8A] to-[#1e2a5c] py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-block px-4 py-1.5 bg-white/10 rounded-full text-white/80 font-medium text-sm mb-4 tracking-wide gloss-in gdelay-1">
              اكتشف الدورات
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight gloss-in gdelay-2">
              استكشف{' '}
              <span className="text-[#FCA5A5]">الدورات العلمية</span>
            </h1>
            <p className="text-white/70 text-lg mb-8 gloss-in gdelay-3">
              {totalCount > 0
                ? `${totalCount} دورة تعليمية في مختلف المجالات`
                : 'أكثر من 1,200 دورة تعليمية في مختلف المجالات'}
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative gloss-in gdelay-4">
              <label htmlFor="courses-search" className="sr-only">ابحث عن دورة</label>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1E3A8A]/50 pointer-events-none">
                <SearchIcon />
              </div>
              <input
                id="courses-search"
                type="text"
                placeholder="ابحث عن دورة..."
                value={searchInput}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                className="w-full pr-12 pl-12 py-4 bg-white rounded-2xl text-[#1a1c20] placeholder:text-[#737782] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/40 shadow-lg transition-all duration-200 text-base"
              />
              {searchInput && (
                <button
                  onClick={() => handleSearchInputChange('')}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#737782] hover:text-[#1a1c20] transition-colors duration-200 cursor-pointer"
                  aria-label="مسح البحث"
                >
                  <XIcon />
                </button>
              )}
            </div>
          </div>

          {/* Quick Category Tags */}
          {allCategories.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              <button
                onClick={() => handleCategoryClick('')}
                className={`px-4 py-1.5 font-medium rounded-full text-sm transition-colors duration-200 cursor-pointer ${
                  !selectedCategory
                    ? 'bg-white text-[#1E3A8A]'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                الكل
              </button>
              {allCategories.slice(0, 5).map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryClick(cat)}
                  className={`px-4 py-1.5 font-medium rounded-full text-sm transition-colors duration-200 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-white text-[#1E3A8A]'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Mobile Filter Toggle */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => setShowFiltersOnMobile(!showFiltersOnMobile)}
            className="w-full flex items-center justify-between px-5 py-3.5 bg-white rounded-xl shadow-sm border border-[#c3c6d2]/30 cursor-pointer transition-colors duration-200 hover:bg-[#ededf4]"
          >
            <span className="flex items-center gap-2 text-[#1E3A8A] font-semibold">
              <FilterIcon />
              الفلاتر
              {hasActiveFilters && (
                <span className="w-5 h-5 bg-[#1E3A8A] text-white text-xs rounded-full flex items-center justify-center">
                  {[selectedLevel, selectedCategory, searchQuery].filter(Boolean).length}
                </span>
              )}
            </span>
            <ChevronDownIcon rotated={showFiltersOnMobile} />
          </button>
        </div>

        {/* Main layout: RTL — sidebar on right, grid on left */}
        <div className="flex flex-col lg:flex-row-reverse gap-8">

          {/* Filter Sidebar (right in RTL) */}
          <aside className={`w-full lg:w-72 xl:w-80 flex-shrink-0 ${showFiltersOnMobile ? 'block' : 'hidden lg:block'}`}>
            <div className="gloss-card p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-[#1a1c20]">الفلاتر</h3>
                {hasActiveFilters && (
                  <button
                    onClick={handleReset}
                    className="text-sm text-[#DC2626] font-medium hover:underline cursor-pointer transition-colors duration-200"
                  >
                    إعادة تعيين
                  </button>
                )}
              </div>

              {/* Level Filter */}
              <div className="mb-7">
                <h4 className="text-sm font-bold text-[#434751] uppercase tracking-wider mb-4">
                  المستوى
                </h4>
                <div className="space-y-3">
                  {FILTER_LEVELS.map((level) => {
                    const inputId = `level-${level}`;
                    return (
                      <label key={level} htmlFor={inputId} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          id={inputId}
                          type="radio"
                          name="level"
                          checked={selectedLevel === level}
                          onChange={() => handleLevelChange(level)}
                          className="w-4 h-4 text-[#1E3A8A] focus:ring-[#1E3A8A] border-[#c3c6d2] cursor-pointer"
                        />
                        <span className="text-[#434751] group-hover:text-[#1a1c20] transition-colors duration-200 text-sm">
                          {level}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-[#ededf4] mb-7" />

              {/* Category Filter */}
              {allCategories.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-[#434751] uppercase tracking-wider mb-4">
                    التصنيف
                  </h4>
                  <div className="space-y-3">
                    {allCategories.map((cat) => {
                      const inputId = `cat-${cat}`;
                      return (
                        <label key={cat} htmlFor={inputId} className="flex items-center gap-3 cursor-pointer group">
                          <input
                            id={inputId}
                            type="checkbox"
                            checked={selectedCategory === cat}
                            onChange={() => handleCategoryClick(cat)}
                            className="w-4 h-4 text-[#1E3A8A] rounded focus:ring-[#1E3A8A] border-[#c3c6d2] cursor-pointer"
                          />
                          <span className="text-[#434751] group-hover:text-[#1a1c20] transition-colors duration-200 text-sm">
                            {cat}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Courses Grid (left in RTL) */}
          <div className="flex-1 min-w-0">

            {/* Results count */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <p className="text-[#434751] text-sm">
                عرض{' '}
                <span className="font-bold text-[#1a1c20]">{totalCount}</span>{' '}
                دورة
                {totalPages > 1 && (
                  <span className="mr-2 text-xs text-[#737782]">
                    (صفحة {currentPage} من {totalPages})
                  </span>
                )}
              </p>
            </div>

            {/* Loading State */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: PER_PAGE }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : error ? (
              /* Error State */
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#DC2626] to-[#EF4444] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-[#DC2626]/25">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-[#1a1c20] mb-2">فشل تحميل الدورات</h3>
                <p className="text-[#737782] text-sm mb-6 max-w-xs">{error}</p>
                <button
                  onClick={loadCourses}
                  className="px-6 py-2.5 bg-[#1E3A8A] text-white font-semibold rounded-xl hover:bg-[#1e2a5c] transition-colors duration-200 cursor-pointer hover:shadow-lg hover:shadow-[#1E3A8A]/30 hover:-translate-y-0.5 hover-shine"
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : courses.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-[#1E3A8A]/25">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-[#1a1c20] mb-2">لا توجد دورات مطابقة</h3>
                <p className="text-[#737782] text-sm mb-6 max-w-xs">
                  جرّب تغيير معايير البحث أو إعادة تعيين الفلاتر
                </p>
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 bg-[#1E3A8A] text-white font-semibold rounded-xl hover:bg-[#1e2a5c] transition-colors duration-200 cursor-pointer hover:shadow-lg hover:shadow-[#1E3A8A]/30 hover:-translate-y-0.5 hover-shine"
                >
                  إعادة تعيين الفلاتر
                </button>
              </div>
            ) : (
              /* Courses Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {courses.map((course, index) => (
                  <div
                    key={course.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <CourseCard
                      course={course}
                      onClick={() => onNavigate && onNavigate('course-detail', { courseId: course.guidId || course.id })}
                      onEnroll={() => onNavigate && onNavigate('checkout', { courseId: course.guidId || course.id })}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {!isLoading && !error && totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-12">
                {/* Previous (in RTL: right arrow goes to previous) */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="الصفحة السابقة"
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#c3c6d2]/50 text-[#434751] hover:bg-[#ededf4] hover:text-[#1E3A8A] transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRightIcon />
                </button>

                {getPageNumbers().map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-[#737782] text-sm">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p as number)}
                      aria-label={`الصفحة ${p}`}
                      aria-current={currentPage === p ? 'page' : undefined}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-medium transition-colors duration-200 cursor-pointer ${
                        currentPage === p
                          ? 'bg-[#1E3A8A] text-white shadow-sm'
                          : 'border border-[#c3c6d2]/50 text-[#434751] hover:bg-[#ededf4] hover:text-[#1E3A8A]'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

                {/* Next */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="الصفحة التالية"
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#c3c6d2]/50 text-[#434751] hover:bg-[#ededf4] hover:text-[#1E3A8A] transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeftIcon />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FAB: teacher → "Create Course", others → Back to Top (after scroll) */}
      {isTeacher ? (
        <button
          onClick={() => onNavigate && onNavigate('teacher-dashboard')}
          className="fixed bottom-8 left-8 z-50 flex items-center gap-2 px-5 py-3.5 bg-gradient-to-l from-[#DC2626] to-[#EF4444] text-white font-bold rounded-2xl shadow-[0_10px_26px_-8px_rgba(220,38,38,0.5)] hover:shadow-[0_16px_34px_-10px_rgba(220,38,38,0.55)] transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover-shine"
          aria-label="إنشاء دورة جديدة"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>إنشاء دورة</span>
        </button>
      ) : showBackToTop ? (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 left-8 z-50 w-12 h-12 bg-[#1E3A8A] text-white rounded-2xl shadow-2xl hover:bg-[#1e2a5c] transition-colors duration-200 cursor-pointer flex items-center justify-center"
          aria-label="العودة للأعلى"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>
      ) : null}
    </div>
  );
};

export default CoursesPage;
