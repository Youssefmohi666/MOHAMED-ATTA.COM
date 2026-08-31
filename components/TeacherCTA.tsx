
import React, { useRef, useEffect, useState } from 'react';
import { Page, AccountType } from '../App';

interface TeacherCTAProps {
  onNavigate: (page: Page, payload?: { accountType: AccountType }) => void;
}

const TeacherCTA: React.FC<TeacherCTAProps> = ({ onNavigate }) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="container mx-auto px-4 sm:px-6 lg:px-8 my-20 md:my-32">
      <div className={`cta-premium relative rounded-3xl overflow-hidden transform transition-all duration-700 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A8A] via-[#3B82F6] to-[#1E3A8A] animate-gradient" style={{ backgroundSize: '200% 200%' }} />

        {/* Decorative pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>

        {/* Floating decorative elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-[#DC2626]/20 rounded-full blur-2xl animate-pulse-gentle" />
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl animate-pulse-gentle" style={{ animationDelay: '1s' }} />

        {/* Content */}
        <div className="relative z-10 text-center p-12 md:p-20">
          {/* Badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6 transform transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
            <span className="w-2 h-2 bg-[#DC2626] rounded-full animate-pulse" />
            <span className="text-white/90 font-medium text-sm">انضم لفريق المدرسين معانا</span>
          </div>

          {/* Heading */}
          <h2 className={`text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 transform transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
            هل أنت{' '}
            <span className="relative inline-block">
              <span className="text-[#EF4444]">مدرس علوم</span>
              <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 100 8" preserveAspectRatio="none">
                <path d="M0,4 Q25,0 50,4 T100,4" fill="none" stroke="#EF4444" strokeWidth="3" opacity="0.6" />
              </svg>
            </span>
            ؟
          </h2>

          {/* Description */}
          <p className={`text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed transform transition-all duration-700 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
            انضم لآلاف المدرسين وابدأ بمشاركة معرفتك مع العالم. نقدم لك الأدوات اللازمة لإنشاء وبيع دوراتك بسهولة.
          </p>

          {/* Features */}
          <div className={`flex flex-wrap items-center justify-center gap-6 mb-10 transform transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
            {[
              { icon: '💰', text: 'دخل إضافي' },
              { icon: '🎥', text: 'بث مباشر' },
              { icon: '📊', text: 'تحليلات متقدمة' },
              { icon: '🌍', text: 'وصول عالمي' }
            ].map((feature) => (
              <div key={feature.text} className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/10">
                <span className="text-xl">{feature.icon}</span>
                <span className="text-white/90 font-medium text-sm">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <button
            onClick={() => onNavigate('signup', { accountType: 'teacher' })}
            className={`group relative inline-flex items-center gap-3 px-10 py-5 bg-white text-[#1E3A8A] font-bold text-lg rounded-2xl shadow-2xl hover:shadow-glow transform hover:-translate-y-1 transition-all duration-300 overflow-hidden ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            style={{ transitionDelay: '600ms' }}
          >
            {/* Button shine effect */}
            <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-[#DC2626]/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

            <span className="relative z-10">ابدأ التدريس الآن</span>
            <svg className="w-5 h-5 relative z-10 transform rotate-180 group-hover:-translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>

          {/* Trust text */}
          <p className={`mt-6 text-white/50 text-sm transform transition-all duration-700 delay-700 ${isVisible ? 'opacity-100' : 'opacity-0'
            }`}>
            لا حاجة لبطاقة ائتمان • ابدأ مجاناً
          </p>
        </div>
      </div>
    </section>
  );
};

export default TeacherCTA;
