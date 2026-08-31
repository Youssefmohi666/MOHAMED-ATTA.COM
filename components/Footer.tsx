import React from 'react';
import { Page } from '../App';
import { WHATSAPP_FALLBACK_NUMBER } from '../constants';

interface FooterProps {
  onNavigate?: (page: Page) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const currentYear = new Date().getFullYear();

  const quickLinks: { name: string; page: Page }[] = [
    { name: 'الرئيسية', page: 'home' },
    { name: 'الدورات', page: 'courses' },
    { name: 'التسعير', page: 'pricing' },
    { name: 'تواصل معنا', page: 'contact' },
    { name: 'المساعد الذكي', page: 'ai' },
  ];

  const socialLinks = [
    {
      name: 'Twitter',
      href: '#',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
        </svg>
      ),
    },
    {
      name: 'YouTube',
      href: '#',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
    {
      name: 'Instagram',
      href: '#',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
    },
  ];

  return (
    <footer dir="rtl" className="relative bg-[#0f172a] text-white overflow-hidden">
      {/* Top accent — sharp red line, NOT gradient */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#DC2626]" aria-hidden="true" />

      {/* NO blobs — geometric pattern */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      <div className="container mx-auto px-6 lg:px-12 relative z-10">
        <div className="py-16 grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16">
          {/* Column 1 — Logo + Description */}
          <div className="gloss-in gdelay-1">
            <p className="text-white/50 text-sm mb-6 leading-relaxed">
              الأستاذ محمد عطا — متخصص في تدريس مادة Science من الرابع الابتدائي حتى الأول الثانوي.
            </p>
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  aria-label={social.name}
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:bg-gradient-to-br hover:from-[#DC2626] hover:to-[#EF4444] hover:border-transparent hover:shadow-[0_8px_20px_-6px_rgba(220,38,38,0.5)] flex items-center justify-center text-white/50 hover:text-white cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Column 2 — Navigation Links */}
          <div className="gloss-in gdelay-2">
            <h3 className="font-black text-white text-base mb-6 tracking-wide">
              روابط سريعة
            </h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate(link.page)}
                    className="group text-white/50 hover:text-[#DC2626] text-sm cursor-pointer transition-colors duration-200 inline-flex items-center gap-2"
                  >
                    <span className="w-1 h-1 bg-white/20 group-hover:bg-[#DC2626] transition-colors" />
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — Contact Info */}
          <div className="gloss-in gdelay-3">
            <h3 className="font-black text-white text-base mb-6 tracking-wide">
              تواصل معنا
            </h3>
            <ul className="space-y-4">
              <li>
                <a
                  href="mailto:info@mohamed-atta.com"
                  className="flex items-center gap-3 text-white/50 hover:text-white text-sm cursor-pointer transition-colors duration-200 group"
                >
                  <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 group-hover:bg-gradient-to-br group-hover:from-[#DC2626] group-hover:to-[#EF4444] group-hover:border-transparent flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:shadow-[0_8px_20px_-6px_rgba(220,38,38,0.5)] group-hover:-translate-y-0.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <span>info@mohamed-atta.com</span>
                </a>
              </li>
              <li>
                <a
                  href={`tel:+${WHATSAPP_FALLBACK_NUMBER}`}
                  className="flex items-center gap-3 text-white/50 hover:text-white text-sm cursor-pointer transition-colors duration-200 group"
                >
                  <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 group-hover:bg-gradient-to-br group-hover:from-[#DC2626] group-hover:to-[#EF4444] group-hover:border-transparent flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:shadow-[0_8px_20px_-6px_rgba(220,38,38,0.5)] group-hover:-translate-y-0.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.08 6.08l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </span>
                  <span dir="ltr">+{WHATSAPP_FALLBACK_NUMBER.replace(/(\d{3})(\d{2})(\d{4})/, '$1 $2 $3')}</span>
                </a>
              </li>
              <li>
                <div className="flex items-center gap-3 text-white/50 text-sm">
                  <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </span>
                  <span>مصر</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider — sharp, NOT subtle */}
        <div className="h-px bg-white/10" />

        {/* Copyright bar */}
        <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/30 text-sm text-center sm:text-right">
            &copy; {currentYear} محمد عطا. جميع الحقوق محفوظة.
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('privacy')}
              className="text-white/30 hover:text-white/60 text-xs cursor-pointer transition-colors duration-200"
            >
              سياسة الخصوصية
            </button>
            <span className="text-white/10" aria-hidden="true">|</span>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('privacy')}
              className="text-white/30 hover:text-white/60 text-xs cursor-pointer transition-colors duration-200"
            >
              الشروط والأحكام
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
