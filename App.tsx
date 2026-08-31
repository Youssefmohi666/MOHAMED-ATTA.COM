
import React, { useState, useCallback, useEffect, useRef, Suspense } from 'react';

// ── URL ↔ Page mapping ────────────────────────────────────────
const PATH_TO_PAGE: Record<string, Page> = {
  '/': 'home',
  '/courses': 'courses',
  '/signup': 'signup',
  '/login': 'login',
  '/subject': 'course-detail',
  '/about': 'about',
  '/ai': 'ai',
  '/pricing': 'pricing',
  '/blog': 'blog',
  '/support': 'support',
  '/privacy': 'privacy',
  '/dashboard': 'dashboard',
  '/contact': 'contact',
  '/instructor': 'instructor',
  '/checkout': 'checkout',
  '/payment-success': 'payment-success',
  '/payment-failed': 'payment-failed',
  '/watch': 'video-viewer',
  '/teacher': 'teacher-dashboard',
  '/admin': 'admin-dashboard',
  '/verify-email': 'verify-email',
  '/forgot-password': 'forgot-password',
};

const PAGE_TO_PATH: Record<Page, string> = Object.fromEntries(
  Object.entries(PATH_TO_PAGE).map(([path, page]) => [page, path])
) as Record<Page, string>;

function parsePath(): { page: Page; courseId: string | null } {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  // match /course/123 or /watch/123 or /checkout/123 etc.
  const match = path.match(/^(\/[^/]+)(?:\/(.+))?$/);
  const base = match?.[1] ?? '/';
  const id = match?.[2] ?? new URLSearchParams(window.location.search).get('id');
  const page = PATH_TO_PAGE[base] ?? 'home';
  return { page, courseId: id };
}
// Eagerly loaded — needed on every page or on initial render
import Header from './components/Header';
import Footer from './components/Footer';
import Hero from './components/Hero';
import Stats from './components/Stats';
import Features from './components/Features';
import PopularCourses from './components/PopularCourses';
import Testimonials from './components/Testimonials';
import CurriculumContent from './components/CurriculumContent';
import HomeComments from './components/HomeComments';
import { useAuth } from './contexts/AuthContext';
import ToastContainer from './contexts/ToastContext';
import { useSeo } from './hooks/useSeo';
import { getSeoFor } from './utils/seoConfig';

// Lazily loaded — split into separate chunks, loaded on demand
const CoursesPage = React.lazy(() => import('./components/CoursesPage'));
const SignUpForm = React.lazy(() => import('./components/SignUpForm'));
const LoginPage = React.lazy(() => import('./components/LoginPage'));
const CourseDetailPage = React.lazy(() => import('./components/CourseDetailPage'));
const AboutPage = React.lazy(() => import('./components/AboutPage'));
const AIPage = React.lazy(() => import('./components/AIPage'));
const PricingPage = React.lazy(() => import('./components/PricingPage'));
const BlogPage = React.lazy(() => import('./components/BlogPage'));
const SupportPage = React.lazy(() => import('./components/SupportPage'));
const PrivacyPage = React.lazy(() => import('./components/PrivacyPage'));
const StudentDashboard = React.lazy(() => import('./components/StudentDashboard'));
const ContactPage = React.lazy(() => import('./components/ContactPage'));
const InstructorProfile = React.lazy(() => import('./components/InstructorProfile'));
const CheckoutPage = React.lazy(() => import('./components/CheckoutPage'));
const PaymentSuccessPage = React.lazy(() => import('./components/PaymentSuccessPage'));
const PaymentFailedPage = React.lazy(() => import('./components/PaymentFailedPage'));
const VideoViewer = React.lazy(() => import('./components/VideoViewer'));
const TeacherDashboard = React.lazy(() => import('./components/TeacherDashboard'));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));
const VerifyEmailPage = React.lazy(() => import('./components/VerifyEmailPage'));
const ForgotPasswordPage = React.lazy(() => import('./components/ForgotPasswordPage'));

export type Page = 'home' | 'courses' | 'signup' | 'login' | 'course-detail' | 'about' | 'ai' | 'pricing' | 'blog' | 'support' | 'privacy' | 'dashboard' | 'contact' | 'instructor' | 'checkout' | 'payment-success' | 'payment-failed' | 'video-viewer' | 'teacher-dashboard' | 'admin-dashboard' | 'verify-email' | 'forgot-password';
export type AccountType = 'student' | 'teacher' | 'admin';

const roleFor = (role: AccountType): Page =>
  role === 'admin' ? 'admin-dashboard' : role === 'teacher' ? 'teacher-dashboard' : 'dashboard';

const App: React.FC = () => {
  const initial = parsePath();
  const [currentPage, setCurrentPage] = useState<Page>(initial.page);
  const [initialAccountType, setInitialAccountType] = useState<AccountType>('student');
  const [selectedCourseId, setSelectedCourseId] = useState<number | string | null>(initial.courseId);
  const [initialDashboardTab, setInitialDashboardTab] = useState<string | undefined>(undefined);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState<string>('');
  const { user, isLoggedIn } = useAuth();
  const prevLoggedIn = useRef(isLoggedIn);

  // Per-page SEO (title, meta, JSON-LD) on every route change
  useSeo(getSeoFor(currentPage, { courseId: selectedCourseId }));

  // Handle browser back/forward
  useEffect(() => {
    const onPop = () => {
      const { page, courseId } = parsePath();
      setCurrentPage(page);
      if (courseId) setSelectedCourseId(courseId);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Auto-redirect on login/logout
  useEffect(() => {
    if (isLoggedIn && !prevLoggedIn.current && user) {
      const pending = sessionStorage.getItem('pendingRedirect');
      if (pending) {
        sessionStorage.removeItem('pendingRedirect');
        try {
          const { page, courseId } = JSON.parse(pending);
          setSelectedCourseId(courseId || selectedCourseId);
          setCurrentPage(page as Page);
          const cp = courseId || selectedCourseId;
          const url = cp ? `${PAGE_TO_PATH[page as Page] ?? '/'}/${cp}` : (PAGE_TO_PATH[page as Page] ?? '/');
          window.history.pushState({ page, courseId: cp }, '', url);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        } catch {}
      }
      const target: Page = user.role === 'admin' ? 'admin-dashboard' : (user.role === 'teacher' ? 'teacher-dashboard' : 'dashboard');
      const path = PAGE_TO_PATH[target] ?? '/';
      window.history.pushState({ page: target }, '', path);
      setCurrentPage(target);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (!isLoggedIn && prevLoggedIn.current) {
      window.history.pushState({ page: 'home' }, '', '/');
      setCurrentPage('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    prevLoggedIn.current = isLoggedIn;
  }, [isLoggedIn, user]);

  // Auth + role-based access guard
  useEffect(() => {
    const protectedPages: Page[] = ['dashboard', 'teacher-dashboard', 'admin-dashboard', 'video-viewer', 'checkout', 'payment-success', 'ai'];

    // Unauthenticated — redirect to login
    if (!isLoggedIn || !user) {
      if (protectedPages.includes(currentPage)) {
        sessionStorage.setItem('pendingRedirect', JSON.stringify({ page: currentPage, courseId: selectedCourseId }));
        window.history.replaceState({ page: 'login' }, '', PAGE_TO_PATH['login']);
        setCurrentPage('login');
      }
      return;
    }

    // Authenticated — never keep a logged-in user on login/signup pages
    // (prevents the login page flashing while a session is still active)
    if (currentPage === 'login' || currentPage === 'signup') {
      const target: Page = roleFor(user.role);
      window.history.replaceState({ page: target }, '', PAGE_TO_PATH[target]);
      setCurrentPage(target);
      return;
    }

    // Authenticated — enforce role boundaries
    const role = user.role;
    if (currentPage === 'dashboard' && role !== 'student') {
      const target: Page = role === 'admin' ? 'admin-dashboard' : 'teacher-dashboard';
      window.history.replaceState({ page: target }, '', PAGE_TO_PATH[target]);
      setCurrentPage(target);
    } else if (currentPage === 'teacher-dashboard' && role !== 'teacher') {
      const target: Page = role === 'admin' ? 'admin-dashboard' : 'dashboard';
      window.history.replaceState({ page: target }, '', PAGE_TO_PATH[target]);
      setCurrentPage(target);
    } else if (currentPage === 'admin-dashboard' && role !== 'admin') {
      const target: Page = role === 'teacher' ? 'teacher-dashboard' : 'dashboard';
      window.history.replaceState({ page: target }, '', PAGE_TO_PATH[target]);
      setCurrentPage(target);
    }
  }, [currentPage, isLoggedIn, user]);

  const navigateTo = useCallback((page: Page, payload?: { accountType?: AccountType; courseId?: number | string; tab?: string; email?: string }) => {
    if (page === 'signup' && payload?.accountType) {
      setInitialAccountType(payload.accountType);
    }
    if (page === 'verify-email' && payload?.email) {
      setPendingVerifyEmail(payload.email);
    }
    const courseId = payload?.courseId ?? null;
    if (courseId) setSelectedCourseId(courseId);
    setInitialDashboardTab(payload?.tab);
    setCurrentPage(page);

    // Increment refresh key whenever navigating to dashboard so it re-fetches
    if (page === 'dashboard') {
      setDashboardRefreshKey(k => k + 1);
    }

    // Build URL
    const basePath = PAGE_TO_PATH[page] ?? '/';
    const url = courseId ? `${basePath}/${courseId}` : basePath;
    window.history.pushState({ page, courseId }, '', url);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <>
            <Hero onNavigate={navigateTo} />
            <Stats />
            <Features />
            <PopularCourses onNavigate={navigateTo} />
            <CurriculumContent />
            <Testimonials />
            <HomeComments onNavigate={navigateTo} />
          </>
        );
      case 'courses':
        return <CoursesPage onNavigate={navigateTo} isTeacher={user?.role === 'teacher'} />;
      case 'signup':
        return <SignUpForm onNavigate={navigateTo} />;
      case 'login':
        return <LoginPage onNavigate={navigateTo} />;
      case 'course-detail':
        return selectedCourseId ? (
          <CourseDetailPage courseId={selectedCourseId} onNavigate={navigateTo} />
        ) : (
          <Hero onNavigate={navigateTo} />
        );
      case 'ai':
        return <AIPage onNavigate={navigateTo} />;
      case 'pricing':
        return <PricingPage onNavigate={navigateTo} />;
      case 'blog':
        return <BlogPage onNavigate={navigateTo} />;
      case 'support':
        return <SupportPage onNavigate={navigateTo} />;
      case 'privacy':
        return <PrivacyPage onNavigate={navigateTo} />;
      case 'dashboard':
        return <StudentDashboard onNavigate={navigateTo} initialTab={initialDashboardTab} refreshKey={dashboardRefreshKey} />;
      case 'video-viewer':
        return <VideoViewer onNavigate={navigateTo} courseId={selectedCourseId} />;
      case 'contact':
        return <ContactPage onNavigate={navigateTo} />;
      case 'instructor':
        return <InstructorProfile onNavigate={navigateTo} />;
      case 'teacher-dashboard':
        return <TeacherDashboard onNavigate={navigateTo} initialTab={initialDashboardTab} />;
      case 'admin-dashboard':
        return <AdminDashboard onNavigate={navigateTo} />;
      case 'checkout':
        return selectedCourseId ? (
          <CheckoutPage courseId={selectedCourseId} onNavigate={navigateTo} />
        ) : (
          <Hero onNavigate={navigateTo} />
        );
      case 'payment-success':
        return selectedCourseId ? (
          <PaymentSuccessPage courseId={selectedCourseId} onNavigate={navigateTo} />
        ) : (
          <Hero onNavigate={navigateTo} />
        );
      case 'payment-failed':
        return <PaymentFailedPage onNavigate={navigateTo} />;
      case 'about':
        return <AboutPage onNavigate={navigateTo} />;
      case 'verify-email':
        return <VerifyEmailPage email={pendingVerifyEmail} onNavigate={navigateTo} />;
      case 'forgot-password':
        return <ForgotPasswordPage onNavigate={navigateTo} />;
      default:
        return <Hero onNavigate={navigateTo} />;
    }
  };

  return (
    <>
      <ToastContainer />
      <div className="bg-[#FEFEFE] dark:bg-[#0d1f33] min-h-screen flex flex-col text-[#1E3A8A] dark:text-slate-200 overflow-x-hidden">
        {currentPage !== 'dashboard' && currentPage !== 'video-viewer' && currentPage !== 'teacher-dashboard' && currentPage !== 'admin-dashboard' && currentPage !== 'ai' && (
          <Header onNavigate={navigateTo} currentPage={currentPage} />
        )}
        <main className={`flex-grow ${currentPage !== 'dashboard' && currentPage !== 'video-viewer' && currentPage !== 'teacher-dashboard' && currentPage !== 'admin-dashboard' && currentPage !== 'ai' ? 'pt-[82px]' : ''}`}>
          <div key={currentPage} className="page-enter">
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-[#1E3A8A]/20 border-t-[#1E3A8A] rounded-full animate-spin" />
              </div>
            }>
              {renderPage()}
            </Suspense>
          </div>
        </main>
        {currentPage !== 'dashboard' && currentPage !== 'video-viewer' && currentPage !== 'teacher-dashboard' && currentPage !== 'admin-dashboard' && currentPage !== 'ai' && (
          <Footer onNavigate={navigateTo} />
        )}
      </div>
    </>
  );
};

export default App;
