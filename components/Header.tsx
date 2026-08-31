import React, { useState, useEffect, useRef } from 'react';
import { Page } from '../App';
import { NAV_LINKS } from '../constants';
import Logo from './Logo';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  onNavigate: (page: Page) => void;
  currentPage: Page;
}

// ── Inline SVG icons (24×24 viewBox, stroke-based) ──────────────────────────

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" aria-hidden="true">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ChevronDownIcon = ({ rotated }: { rotated: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
    className={`w-4 h-4 transition-transform duration-200 ${rotated ? 'rotate-180' : ''}`}
    aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
    <path d="M12 3a6 6 0 009 9 9 9 0 11-9-9z" />
  </svg>
);

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
      title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
      className="cursor-pointer w-9 h-9 flex items-center justify-center rounded-lg border border-[#DBEAFE]/60
        dark:border-white/10 text-[#1E3A8A] dark:text-slate-300
        hover:bg-[#DBEAFE]/30 dark:hover:bg-white/10 transition-colors duration-200"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
};

// ── Component ────────────────────────────────────────────────────────────────

const Header: React.FC<HeaderProps> = ({ onNavigate, currentPage }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const { user, isLoggedIn, logout } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const avatarBtnRef = useRef<HTMLButtonElement>(null);

  // Scroll-based glass effect
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        avatarBtnRef.current && !avatarBtnRef.current.contains(target)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    setIsMenuOpen(false);
    logout();
    onNavigate('home');
  };

  const getDashboardPage = (): Page => {
    if (user?.role === 'admin') return 'admin-dashboard';
    return user?.role === 'teacher' ? 'teacher-dashboard' : 'dashboard';
  };

  const handleDashboardClick = () => {
    setIsUserMenuOpen(false);
    setIsMenuOpen(false);
    onNavigate(getDashboardPage());
  };

  const handleSettingsClick = () => {
    setIsUserMenuOpen(false);
    setIsMenuOpen(false);
    onNavigate(getDashboardPage());
  };

  const toggleUserMenu = () => setIsUserMenuOpen(prev => !prev);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getRoleLabel = () => {
    if (user?.role === 'teacher') return 'معلم';
    if (user?.role === 'admin') return 'مدير';
    return 'طالب';
  };

  // ── Scroll-based header classes ──────────────────────────────────────────
  const headerClasses = isScrolled
    ? 'backdrop-blur-xl bg-[#FAF6EB]/70 dark:bg-[#0a1628]/70 shadow-[0_8px_32px_-8px_rgba(30,58,138,0.18)] border-b border-white/40 dark:border-white/10'
    : 'bg-transparent';

  return (
    <header
      dir="rtl"
      className={`sticky top-0 z-50 transition-all duration-300 ${headerClasses}`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo — right side in RTL */}
          <div className="flex-shrink-0">
            <button
              onClick={() => onNavigate('home')}
              className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] rounded-lg transition-colors duration-200"
              aria-label="الصفحة الرئيسية"
            >
              <Logo size="md" />
            </button>
          </div>

          {/* Desktop Navigation — center */}
          <nav className="hidden md:flex items-center gap-6" aria-label="التنقل الرئيسي">
            {NAV_LINKS.map(link => (
              <button
                key={link.name}
                onClick={() => onNavigate(link.page as Page)}
                className={`cursor-pointer text-base font-semibold transition-colors duration-200 px-2 py-1 rounded-md
                  ${currentPage === link.page
                    ? 'text-[#DC2626]'
                    : 'text-[#1E3A8A] hover:text-[#DC2626] hover:bg-[#DBEAFE]/30 dark:text-slate-200 dark:hover:bg-white/10'
                  }`}
              >
                {link.name}
              </button>
            ))}
          </nav>

          {/* Desktop Auth / User — left side in RTL */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {isLoggedIn && user ? (
              <div className="relative">
                <button
                  ref={avatarBtnRef}
                  id="user-avatar-btn"
                  onClick={toggleUserMenu}
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                  className="cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#DBEAFE]/60
                    hover:border-[#DC2626]/50 bg-white/80 hover:bg-[#DBEAFE]/20
                    transition-colors duration-200"
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#DC2626]
                    flex items-center justify-center text-white font-bold text-xs shadow-sm overflow-hidden">
                    {user.avatar
                      ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      : getInitials(user.name)
                    }
                  </div>
                  <span className="hidden lg:block text-sm font-semibold text-[#1E3A8A] dark:text-slate-200 max-w-[100px] truncate">
                    {user.name}
                  </span>
                  <ChevronDownIcon rotated={isUserMenuOpen} />
                </button>

                {/* Dropdown */}
                {isUserMenuOpen && (
                  <div
                    ref={dropdownRef}
                    id="user-dropdown"
                    role="menu"
                    aria-label="قائمة المستخدم"
                    className="absolute left-0 top-[calc(100%+8px)] w-64 bg-white/95 dark:bg-[#0d1f33]/95 backdrop-blur-2xl
                      border border-white/60 dark:border-white/10 rounded-2xl shadow-[0_24px_60px_-12px_rgba(30,58,138,0.3)] overflow-hidden z-[100]
                      animate-fade-in-down"
                  >
                    {/* User info header */}
                    <div className="p-4 bg-gradient-to-br from-[#1E3A8A]/5 to-[#DC2626]/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#DC2626]
                          flex items-center justify-center text-white font-bold text-sm shadow overflow-hidden">
                          {user.avatar
                            ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                            : getInitials(user.name)
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#1E3A8A] dark:text-slate-100 text-sm truncate">{user.name}</p>
                          <p className="text-xs text-[#1E3A8A]/50 dark:text-slate-400 truncate">{user.email}</p>
                          <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full
                            ${user.role === 'teacher'
                              ? 'bg-[#1E3A8A]/10 text-[#1E3A8A]'
                              : 'bg-[#DC2626]/10 text-[#DC2626]'
                            }`}>
                            {getRoleLabel()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-2 px-2">
                      <button
                        role="menuitem"
                        onClick={handleDashboardClick}
                        className="cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                          text-[#1E3A8A] hover:bg-[#DBEAFE]/30 transition-colors duration-200"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#1E3A8A]/5 flex items-center justify-center">
                          <DashboardIcon />
                        </div>
                        <span className="font-semibold text-sm">لوحة التحكم</span>
                      </button>

                      <button
                        role="menuitem"
                        onClick={handleSettingsClick}
                        className="cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                          text-[#1E3A8A] hover:bg-[#DBEAFE]/30 transition-colors duration-200"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#1E3A8A]/5 flex items-center justify-center">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                          </svg>
                        </div>
                        <span className="font-semibold text-sm">الإعدادات</span>
                      </button>
                    </div>

                    <div className="px-4 pb-2">
                      <div className="h-px bg-[#DBEAFE]/50 mb-2" />
                      <button
                        role="menuitem"
                        onClick={handleLogout}
                        className="cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                          text-red-500 hover:bg-red-50 transition-colors duration-200"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                          <LogoutIcon />
                        </div>
                        <span className="font-semibold text-sm">تسجيل الخروج</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={() => onNavigate('login')}
                  className="cursor-pointer text-sm font-semibold text-[#1E3A8A] dark:text-slate-200 hover:text-[#DC2626]
                    transition-colors duration-200 px-4 py-2 rounded-lg hover:bg-[#DBEAFE]/30 dark:hover:bg-white/10"
                >
                  تسجيل الدخول
                </button>
                <button
                  onClick={() => onNavigate('signup')}
                  className="cursor-pointer px-5 py-2 text-sm font-bold text-white rounded-xl shadow-[0_8px_20px_-6px_rgba(30,58,138,0.5)] hover:shadow-[0_12px_28px_-6px_rgba(30,58,138,0.6)] hover:-translate-y-0.5
                    bg-gradient-to-l from-[#1e2a5c] to-[#1E3A8A]
                    hover:from-[#1E3A8A] hover:to-[#0a458c]
                    transition-all duration-300"
                >
                  إنشاء حساب
                </button>
              </>
            )}
          </div>

          {/* Mobile: avatar + hamburger — visible at < 768px */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            {isLoggedIn && user && (
              <button
                onClick={toggleUserMenu}
                aria-label="قائمة المستخدم"
                className="cursor-pointer w-8 h-8 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#DC2626]
                  flex items-center justify-center text-white font-bold text-xs shadow overflow-hidden
                  transition-colors duration-200"
              >
                {user.avatar
                  ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  : getInitials(user.name)
                }
              </button>
            )}
            <button
              onClick={() => { setIsMenuOpen(prev => !prev); setIsUserMenuOpen(false); }}
              aria-label={isMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
              aria-expanded={isMenuOpen}
              className="cursor-pointer text-[#1E3A8A] p-2 rounded-lg hover:bg-[#DBEAFE]/30
                transition-colors duration-200"
            >
              {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu — hidden at >= 768px */}
      {isMenuOpen && (
        <div
          className="md:hidden backdrop-blur-md bg-white/90 dark:bg-[#0d1f33]/95 border-t border-[#DBEAFE]/40 dark:border-white/10"
          role="navigation"
          aria-label="القائمة المحمولة"
        >
          <nav className="flex flex-col items-center py-5 gap-1 px-4">
            {NAV_LINKS.map(link => (
              <button
                key={link.name}
                onClick={() => { onNavigate(link.page as Page); setIsMenuOpen(false); }}
                className={`cursor-pointer w-full text-center text-base font-semibold py-2.5 px-4 rounded-xl
                  transition-colors duration-200
                  ${currentPage === link.page
                    ? 'text-[#DC2626] bg-[#DBEAFE]/30 dark:bg-white/10'
                    : 'text-[#1E3A8A] hover:text-[#DC2626] hover:bg-[#DBEAFE]/20 dark:text-slate-200'
                  }`}
              >
                {link.name}
              </button>
            ))}

            <div className="w-full h-px bg-[#DBEAFE]/50 my-2" />

            {isLoggedIn && user ? (
              <>
                <div className="flex items-center gap-3 w-full px-4 py-3 bg-[#DBEAFE]/20 rounded-xl">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#DC2626]
                    flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                    {user.avatar
                      ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      : getInitials(user.name)
                    }
                  </div>
                  <div>
                    <p className="font-bold text-[#1E3A8A] text-sm">{user.name}</p>
                    <span className={`text-xs font-semibold ${user.role === 'teacher' ? 'text-[#1E3A8A]' : 'text-[#DC2626]'}`}>
                      {getRoleLabel()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => { handleDashboardClick(); setIsMenuOpen(false); }}
                  className="cursor-pointer w-full text-center text-base font-semibold text-[#1E3A8A]
                    hover:text-[#DC2626] py-2.5 px-4 rounded-xl hover:bg-[#DBEAFE]/20
                    transition-colors duration-200"
                >
                  لوحة التحكم
                </button>
                <button
                  onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                  className="cursor-pointer w-full py-3 text-base font-bold text-red-500
                    border border-red-200 rounded-xl hover:bg-red-50 transition-colors duration-200"
                >
                  تسجيل الخروج
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { onNavigate('login'); setIsMenuOpen(false); }}
                  className="cursor-pointer w-full text-center text-base font-semibold text-[#1E3A8A] dark:text-slate-200
                    hover:text-[#DC2626] py-2.5 px-4 rounded-xl hover:bg-[#DBEAFE]/20
                    transition-colors duration-200"
                >
                  تسجيل الدخول
                </button>
                <button
                  onClick={() => { onNavigate('signup'); setIsMenuOpen(false); }}
                  className="cursor-pointer w-full py-3 text-base font-bold text-white rounded-xl shadow-lg
                    bg-gradient-to-l from-[#1e2a5c] to-[#1E3A8A]
                    hover:from-[#1E3A8A] hover:to-[#0a458c]
                    transition-all duration-200"
                >
                  إنشاء حساب
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
