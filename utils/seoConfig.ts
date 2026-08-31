import { SeoConfig } from './seo';

// ── Centralized per-page SEO configuration ────────────────────
// Each entry can be a static config or a function receiving
// dynamic data (e.g. courseId) so titles/descriptions stay fresh.

type PageKey =
  | 'home' | 'courses' | 'signup' | 'login' | 'course-detail' | 'about'
  | 'ai' | 'pricing' | 'blog' | 'support' | 'privacy'
  | 'dashboard' | 'contact' | 'instructor' | 'checkout' | 'payment-success'
  | 'payment-failed' | 'video-viewer' | 'teacher-dashboard' | 'admin-dashboard'
  | 'verify-email' | 'forgot-password';

const configs: Record<PageKey, SeoConfig | ((ctx: { courseId?: string | number | null; courseTitle?: string }) => SeoConfig)> = {
  home: {
    title: 'محمد عطا | شرح Science',
    description: 'محمد عطا لتعليم مادة Science للصفوف من الرابع الابتدائي حتى الأول الثانوي. شرح مبسط، تجارب علمية، امتحانات، وخطة دراسية مخصصة.',
    ogType: 'website',
  },
  courses: {
    title: 'مادة Science',
    description: 'تعلّم مادة Science من الصف الرابع الابتدائي حتى الأول الثانوي مع الأستاذ محمد عطا. شرح شامل ومبسط للجميع.',
    ogType: 'website',
  },
  'course-detail': {
    title: 'مادة Science',
    description: 'شرح مادة Science: المحتوى، المنهج، المدرس، والامتحانات.',
    ogType: 'article',
  },
  signup: {
    title: 'إنشاء حساب',
    description: 'أنشئ حسابك وابدأ تعلم مادة Science اليوم مع الأستاذ محمد عطا. تسجيل مجاني للمبتدئين.',
    robots: 'noindex, follow',
  },
  login: {
    title: 'تسجيل الدخول',
    description: 'سجل دخولك لمتابعة دروسك وامتحاناتك.',
    robots: 'noindex, follow',
  },
  about: {
    title: 'من نحن',
    description: 'تعرّف على الأستاذ محمد عطا: رؤيتنا، رسالتنا، وأسلوبنا في تدريس مادة Science.',
    ogType: 'website',
  },
  ai: {
    title: 'مساعد الذكاء الاصطناعي',
    description: 'استخدم مساعد الذكاء الاصطناعي للإجابة على أسئلتك العلمية، حل المسائل، وتجهيز خطة دراسية مخصصة لك.',
    ogType: 'website',
  },
  pricing: {
    title: 'الأسعار والاشتراكات',
    description: 'خطط اشتراك مرنة تناسب الجميع. اطلع على أسعار الدورات والاشتراكات الشهرية والسنوية.',
    ogType: 'website',
  },
  blog: {
    title: 'المدونة والمقالات',
    description: 'مقالات تعليمية ونصائح للطلاب وأولياء الأمور حول التفوق في العلوم وطرق المذاكرة الفعالة.',
    ogType: 'website',
  },
  support: {
    title: 'الدعم الفني',
    description: 'مركز المساعدة والدعم الفني. احصل على إجابات لأسئلتك ومساعدة سريعة.',
    robots: 'index, follow',
  },
  privacy: {
    title: 'سياسة الخصوصية',
    description: 'تعرف على سياسة الخصوصية وشروط الاستخدام الخاصة بمنصة محمد عطا.',
    robots: 'index, follow',
  },
  dashboard: {
    title: 'لوحة التحكم',
    description: 'لوحة التحكم الخاصة بك: تتبع تقدمك، دوراتك، امتحاناتك وحضورك.',
    robots: 'noindex, nofollow',
  },
  contact: {
    title: 'اتصل بنا',
    description: 'تواصل معنا عبر البريد الإلكتروني أو الواتساب. يسعدنا خدمتك والإجابة على استفساراتك.',
    ogType: 'website',
  },
  instructor: {
    title: 'الملف الشخصي للمدرس',
    description: 'تعرّف على الأستاذ محمد عطا وخبرته وأسلوبه في تدريس مادة Science.',
    robots: 'index, follow',
  },
  checkout: {
    title: 'إتمام الشراء',
    description: 'أكمل عملية الدفع لدورتك الدراسية بأمان.',
    robots: 'noindex, nofollow',
  },
  'payment-success': {
    title: 'تم الدفع بنجاح',
    description: 'تمت عملية الدفع بنجاح. مرحباً بك في دورتك الدراسية!',
    robots: 'noindex, nofollow',
  },
  'payment-failed': {
    title: 'فشل الدفع',
    description: 'تعذرت عملية الدفع. حاول مرة أخرى أو تواصل مع الدعم الفني.',
    robots: 'noindex, nofollow',
  },
  'video-viewer': {
    title: 'مشاهدة الدرس',
    description: 'مشاهدة محتوى الدرس التعليمي.',
    robots: 'noindex, nofollow',
  },
  'teacher-dashboard': {
    title: 'لوحة تحكم المدرس',
    description: 'إدارة موادك، محاضراتك، طلابك وإحصائياتك.',
    robots: 'noindex, nofollow',
  },
  'admin-dashboard': {
    title: 'لوحة تحكم الإدارة',
    description: 'إدارة النظام بالكامل.',
    robots: 'noindex, nofollow',
  },
  'verify-email': {
    title: 'تأكيد البريد الإلكتروني',
    description: 'أكد بريدك الإلكتروني لتفعيل حسابك.',
    robots: 'noindex, nofollow',
  },
  'forgot-password': {
    title: 'استعادة كلمة المرور',
    description: 'استعد كلمة المرور الخاصة بحسابك.',
    robots: 'noindex, nofollow',
  },
};

// Special dynamic config for course detail — never rendered as a bare "course-detail" string
export function getCourseSeo(courseId: string | number | null, courseTitle?: string): SeoConfig {
  return {
    title: courseTitle ? `${courseTitle} - دورة تعليمية` : 'تفاصيل الدورة',
    description: courseTitle
      ? `سجل الآن في دورة ${courseTitle} وتعلّم مادة Science من الصف الرابع الابتدائي حتى الأول الثانوي مع الأستاذ محمد عطا.`
      : 'مادة Science: المحتوى، المنهج، المدرس، والامتحانات.',
    ogType: 'article',
  };
}

export function getSeoFor(page: string, ctx?: { courseId?: string | number | null; courseTitle?: string }): SeoConfig {
  // Course detail is always dynamic
  if (page === 'course-detail') {
    return getCourseSeo(ctx?.courseId ?? null, ctx?.courseTitle);
  }
  const key = page as PageKey;
  const cfg = configs[key];
  if (typeof cfg === 'function') {
    return cfg(ctx || {});
  }
  return cfg || { title: '', description: '' };
}
