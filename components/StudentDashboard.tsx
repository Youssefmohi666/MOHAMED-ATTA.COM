import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Page } from '../App';
import { getProgress } from '../api/student.api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import StudentExamViewer from './StudentExamViewer';
import StreakBadge from './StreakBadge';
import { computeStreak, recordStudyDay } from '../utils/streak';

// ── Notification types ───────────────────────────────────────
type NotifType = 'payment' | 'lecture' | 'enrollment';
interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: number; // timestamp ms
  read: boolean;
}

const NOTIF_KEY = (userId: string) => `notifs_${userId}`;

function loadNotifs(userId: string): Notification[] {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY(userId)) || '[]'); }
  catch { return []; }
}
function saveNotifs(userId: string, notifs: Notification[]) {
  localStorage.setItem(NOTIF_KEY(userId), JSON.stringify(notifs.slice(0, 50)));
}
function addNotif(userId: string, n: Omit<Notification, 'id' | 'time' | 'read'>): Notification[] {
  const existing = loadNotifs(userId);
  const notif: Notification = { ...n, id: Date.now().toString(), time: Date.now(), read: false };
  const updated = [notif, ...existing];
  saveNotifs(userId, updated);
  return updated;
}
function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${Math.floor(h / 24)} يوم`;
}

const LECTURE_SNAP_KEY = (userId: string) => `lec_snap_${userId}`;

interface Props {
  onNavigate: (page: Page, payload?: { courseId?: number; tab?: string }) => void;
  initialTab?: string;
  refreshKey?: number;
}

type Tab = 'dashboard' | 'courses' | 'exams' | 'profile';

// ── Icons (line style, inherits currentColor) ────────────────
type IconProps = { size?: number; className?: string };
const S = (size = 18, className = '') => ({ width: size, height: size, className, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

const IconHome = ({ size, className }: IconProps) => <svg {...S(size, className)}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>;
const IconBookOpen = ({ size, className }: IconProps) => <svg {...S(size, className)}><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>;
const IconGrid = ({ size, className }: IconProps) => <svg {...S(size, className)}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
const IconUser = ({ size, className }: IconProps) => <svg {...S(size, className)}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconExam = ({ size, className }: IconProps) => <svg {...S(size, className)}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>;
const IconBell = ({ size, className }: IconProps) => <svg {...S(size, className)}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
const IconSearch = ({ size, className }: IconProps) => <svg {...S(size, className)}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>;
const IconSpark = ({ size, className }: IconProps) => <svg {...S(size, className)}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"/></svg>;
const IconPlay = ({ size, className }: IconProps) => <svg {...S(size, className)}><polygon points="5,3 19,12 5,21"/></svg>;
const IconArrowLeft = ({ size, className }: IconProps) => <svg {...S(size, className)}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/></svg>;
const IconLogout = ({ size, className }: IconProps) => <svg {...S(size, className)}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const IconCalendar = ({ size, className }: IconProps) => <svg {...S(size, className)}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;

// ── Notification Bell Dropdown ───────────────────────────────
const NotifIcon = ({ type }: { type: NotifType }) => {
  if (type === 'payment') return <svg {...S(16)}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
  if (type === 'lecture') return <svg {...S(16)}><polygon points="5,3 19,12 5,21"/></svg>;
  return <svg {...S(16)}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>;
};

const notifColors: Record<NotifType, string> = {
  payment: 'bg-red-50 text-red-500',
  lecture: 'bg-sky-50 text-sky-500',
  enrollment: 'bg-amber-50 text-amber-500',
};

const NotifDropdown = ({ notifs, onMarkAll, onClose }: {
  notifs: Notification[];
  onMarkAll: () => void;
  onClose: () => void;
}) => (
  <div className="absolute start-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-black/10 z-50 overflow-hidden animate-fade-in-down">
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
      <span className="text-sm font-extrabold text-[#1E3A8A]">الإشعارات</span>
      {notifs.some(n => !n.read) && (
        <button onClick={onMarkAll} className="text-xs text-[#1E3A8A] hover:text-[#DC2626] cursor-pointer transition-colors duration-150" aria-label="تحديد الكل كمقروء">
          تحديد الكل كمقروء
        </button>
      )}
    </div>
    <div className="max-h-80 overflow-y-auto">
      {notifs.length === 0 ? (
        <div className="py-10 text-center text-slate-400 text-sm">لا توجد إشعارات</div>
      ) : notifs.map(n => (
        <div key={n.id} className={`flex gap-3 px-4 py-3 border-b border-slate-50 transition-colors duration-150 ${n.read ? '' : 'bg-blue-50/40'}`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${notifColors[n.type]}`}>
            <NotifIcon type={n.type} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#0f2233]">{n.title}</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
            <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.time)}</p>
          </div>
          {!n.read && <span className="w-2 h-2 rounded-full bg-[#DC2626] shrink-0 mt-2" />}
        </div>
      ))}
    </div>
  </div>
);

// ── Progress Ring ────────────────────────────────────────────
const ProgressRing = ({ pct, size = 64, stroke = 6, color = '#1E3A8A', track = '#E2E8F0' }: { pct: number; size?: number; stroke?: number; color?: string; track?: string }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
    </svg>
  );
};

// ── Subject Card ─────────────────────────────────────────────
const SubjectCard = ({ subject, onNavigate, featured = false }: { subject: any; onNavigate: Props['onNavigate']; featured?: boolean }) => {
  const pct = Math.min(100, Math.round(subject.progress || 0));
  const lastDate = subject.lastAccessed
    ? new Date(subject.lastAccessed).toLocaleDateString('ar-SA')
    : 'لم يبدأ بعد';
  if (featured) {
    return (
      <div className="bg-gradient-to-l from-[#0d1f33] to-[#1E3A8A] rounded-3xl p-6 sm:p-7 text-white shadow-xl shadow-[#1E3A8A]/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/[0.04] -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/[0.03] translate-y-12 -translate-x-10" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-300/80 tracking-wide mb-1">استمر في التعلم</p>
            <h3 className="text-xl font-extrabold truncate">{subject.name}</h3>
            <p className="text-xs text-slate-300/70 mt-1.5 flex items-center gap-1.5"><IconCalendar size={13} /> آخر تفاعل: {lastDate}</p>
            <div className="mt-4 max-w-xs">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300/70">نسبة الإنجاز</span>
                <span className="font-bold text-slate-100">{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-l from-[#DC2626] to-[#EF4444] transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:flex flex-col items-center gap-1">
              <ProgressRing pct={pct} size={84} stroke={7} color="#EF4444" track="rgba(255,255,255,0.18)" />
              <span className="text-lg font-extrabold">{pct}%</span>
            </div>
            <button
              onClick={() => onNavigate('video-viewer', { courseId: subject.id })}
              className="flex items-center gap-2 bg-white text-[#1E3A8A] text-sm font-extrabold px-6 py-3.5 rounded-2xl hover:bg-slate-100 transition-colors duration-200 cursor-pointer shadow-lg shadow-black/20"
            >
              <IconPlay size={15} /> تابع الآن
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="group bg-white border border-slate-200/80 rounded-3xl p-5 hover:shadow-lg hover:shadow-[#1E3A8A]/5 hover:-translate-y-0.5 transition-all duration-200 cursor-default">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1E3A8A] to-[#0d1f33] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#1E3A8A]/20">
            <IconBookOpen size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-extrabold text-[#0f2233] truncate">{subject.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><IconCalendar size={12} /> {lastDate}</p>
          </div>
        </div>
        <div className="relative shrink-0">
          <ProgressRing pct={pct} size={52} stroke={5} />
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold text-[#1E3A8A]">{pct}%</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-5">
        <div className="h-full rounded-full bg-gradient-to-l from-[#1E3A8A] to-[#DC2626] transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <button
        onClick={() => onNavigate('video-viewer', { courseId: subject.id })}
        className="w-full flex items-center justify-center gap-2 bg-[#1E3A8A]/[0.06] hover:bg-[#1E3A8A]/[0.12] border border-[#1E3A8A]/15 rounded-2xl py-2.5 text-[#1E3A8A] text-sm font-bold transition-colors duration-200 cursor-pointer"
      >
        <IconPlay size={14} />
        مواصلة التعلم
      </button>
    </div>
  );
};

// ── Stat Card ────────────────────────────────────────────────
const StatCard = ({ label, value, icon, tint, valueColor }: {
  label: string; value: string; icon: React.ReactNode; tint: string; valueColor: string;
}) => (
  <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:shadow-lg hover:shadow-[#1E3A8A]/5 hover:-translate-y-0.5 transition-all duration-200">
    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 ${tint}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className={`text-xl sm:text-2xl font-black ${valueColor} leading-none`}>{value}</p>
      <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1.5 truncate">{label}</p>
    </div>
  </div>
);

// ── Empty State ──────────────────────────────────────────────
const EmptyState = ({ onNavigate }: { onNavigate: Props['onNavigate'] }) => (
  <div data-testid="empty-state" className="flex flex-col items-center justify-center py-16 sm:py-20 px-6 text-center bg-white border border-dashed border-slate-300 rounded-3xl">
    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#1E3A8A]/10 to-[#DC2626]/10 border border-[#1E3A8A]/15 flex items-center justify-center mb-5 text-[#1E3A8A]">
      <IconBookOpen size={34} />
    </div>
    <h3 className="text-lg font-extrabold text-[#0f2233] mb-2">لا توجد كورسات مسجلة</h3>
    <p className="text-sm text-slate-500 mb-6 max-w-xs">ابدأ رحلتك التعليمية واستكشف مجموعتنا من الدورات التدريبية</p>
    <button
      onClick={() => onNavigate('courses')}
      className="flex items-center gap-2 bg-gradient-to-l from-[#1E3A8A] to-[#0566d9] text-white text-sm font-bold px-6 py-3 rounded-2xl hover:opacity-90 transition-opacity duration-200 cursor-pointer shadow-lg shadow-[#1E3A8A]/25"
    >
      تصفح الكورسات
    </button>
  </div>
);

// ── Skeleton ─────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="animate-pulse bg-white border border-slate-200/60 rounded-3xl h-44" />
);

// ── Selling CTA band ─────────────────────────────────────────
const SellingBand = ({ onNavigate }: { onNavigate: Props['onNavigate'] }) => (
  <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-sm">
    <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-[#1E3A8A]/[0.05]" />
    <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-[#DC2626]/[0.05]" />
    <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
      <div>
        <p className="text-sm font-black text-[#0f2233] flex items-center gap-2 mb-1"><span className="text-base">🎯</span> ليه محمد عطا هو خيارك الصح؟</p>
        <p className="text-xs text-slate-500 mb-3">الشرح كامل والنتيجة مضمونة طول ما انت واصل — ومش بس المحاضرات!</p>
        <div className="flex flex-wrap gap-2.5 text-[11px] sm:text-xs font-bold">
          <span className="bg-[#1E3A8A]/[0.07] text-[#1E3A8A] rounded-full px-3 py-1.5 inline-flex items-center gap-1.5">📺 شرح مبسط خطوة بخطوة</span>
          <span className="bg-[#DC2626]/[0.06] text-[#DC2626] rounded-full px-3 py-1.5 inline-flex items-center gap-1.5">📝 امتحانات وتدريبات لكل درس</span>
          <span className="bg-amber-50 text-amber-600 rounded-full px-3 py-1.5 inline-flex items-center gap-1.5">⏰ متابعة وتذكير مستمر</span>
        </div>
      </div>
      <button
        onClick={() => onNavigate('courses')}
        className="shrink-0 flex items-center justify-center gap-2 bg-gradient-to-l from-[#1E3A8A] to-[#0566d9] text-white text-sm font-extrabold px-7 py-3.5 rounded-2xl hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#1E3A8A]/25 transition-all duration-200 cursor-pointer shadow-lg shadow-[#1E3A8A]/20"
      >
        اشترك في مادة جديدة <IconArrowLeft size={15} />
      </button>
    </div>
  </div>
);

// ── Main Component ───────────────────────────────────────────
const StudentDashboard: React.FC<Props> = ({ onNavigate, initialTab, refreshKey = 0 }) => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>((initialTab as Tab) || 'dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ totalCourses: 0, totalLectures: 0, completedLectures: 0, overallProgress: 0 });
  const [subjects, setSubjects] = useState<any[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);
  const userId = user?.id || 'guest';
  const unreadCount = notifs.filter(n => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setNotifs(loadNotifs(userId)); }, [userId]);

  useEffect(() => {
    if (!userId || userId === 'guest') { setStreak(0); return; }
    setStreak(computeStreak(userId));
    const t = setTimeout(() => setStreak(recordStudyDay(userId)), 500);
    return () => clearTimeout(t);
  }, [userId]);

  const pushNotif = useCallback((n: Omit<Notification, 'id' | 'time' | 'read'>) => {
    setNotifs(addNotif(userId, n));
  }, [userId]);

  const markAllRead = useCallback(() => {
    const updated = notifs.map(n => ({ ...n, read: true }));
    saveNotifs(userId, updated);
    setNotifs(updated);
  }, [notifs, userId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const subjectName = params.get('subject') || 'المادة';
    const amount = params.get('amount');
    if (payment === 'success') {
      showToast('تمت عملية الدفع بنجاح! تم تسجيلك في المادة.', 'success');
      pushNotif({ type: 'payment', title: 'تم الدفع بنجاح', body: `تم تسجيلك في ${subjectName}${amount ? ` · المبلغ: ${amount} ج.م` : ''}` });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (payment === 'failed') {
      showToast('فشلت عملية الدفع. يرجى المحاولة مرة أخرى.', 'error');
      pushNotif({ type: 'payment', title: 'فشل الدفع', body: `لم تكتمل عملية الدفع لـ ${subjectName}. يرجى المحاولة مرة أخرى.` });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (payment === 'declined') {
      showToast('تم رفض البطاقة. تأكد من بيانات البطاقة وحاول مرة أخرى.', 'error');
      pushNotif({ type: 'payment', title: 'تم رفض البطاقة', body: 'تأكد من بيانات البطاقة وحاول مرة أخرى.' });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('enrolled') === 'true') {
      showToast('تم تسجيلك في المادة بنجاح!', 'success');
      pushNotif({ type: 'enrollment', title: 'تم التسجيل', body: `تم تسجيلك في ${subjectName} بنجاح. ابدأ التعلم الآن!` });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [showToast, pushNotif]);

  useEffect(() => {
    setIsLoading(true);
    getProgress().then((res: any) => {
      const data = res?.data ?? res;
      if (data) {
        setStats({
          totalCourses: data.totalSubjects || data.totalCourses || 0,
          totalLectures: data.totalLectures || 0,
          completedLectures: data.completedLectures || 0,
          overallProgress: data.overallProgress || 0,
        });
        if (Array.isArray(data.subjects)) {
          setSubjects(data.subjects);
          const snapRaw = localStorage.getItem(LECTURE_SNAP_KEY(userId));
          const snap: Record<string, number> = snapRaw ? JSON.parse(snapRaw) : {};
          const newSnap: Record<string, number> = {};
          data.subjects.forEach((s: any) => {
            const prev = snap[s.id];
            const curr = s.totalLectures ?? s.lectureCount ?? 0;
            newSnap[s.id] = curr;
            if (prev !== undefined && curr > prev) {
              const added = curr - prev;
              pushNotif({ type: 'lecture', title: 'محاضرات جديدة', body: `تمت إضافة ${added} محاضرة${added > 1 ? '' : ''} جديدة إلى "${s.name}"` });
            }
          });
          localStorage.setItem(LECTURE_SNAP_KEY(userId), JSON.stringify(newSnap));
        }
      }
    }).catch(console.error).finally(() => setIsLoading(false));
  }, [refreshKey, userId, pushNotif]);

  const studentName = user?.name || 'طالب';
  const studentInitials = studentName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const filteredSubjects = subjects.filter(s => s.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  const sortedSubjects = [...filteredSubjects].sort((a, b) => (b.progress || 0) - (a.progress || 0));
  const featuredSubject = sortedSubjects[0];

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'لوحة التحكم', icon: <IconGrid size={16} /> },
    { key: 'courses', label: 'كورساتي', icon: <IconBookOpen size={16} /> },
    { key: 'exams', label: 'الاختبارات', icon: <IconExam size={16} /> },
    { key: 'profile', label: 'الملف الشخصي', icon: <IconUser size={16} /> },
  ];

  const renderStats = () => (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
      <StatCard
        label="عدد الكورسات"
        value={String(stats.totalCourses)}
        tint="bg-amber-50 text-amber-500"
        valueColor="text-amber-500"
        icon={<IconBookOpen size={20} />}
      />
      <StatCard
        label="إجمالي المحاضرات"
        value={String(stats.totalLectures)}
        tint="bg-sky-50 text-sky-500"
        valueColor="text-sky-500"
        icon={<IconPlay size={20} />}
      />
      <StatCard
        label="نسبة الإنجاز"
        value={`${Math.round(stats.overallProgress)}%`}
        tint="bg-red-50 text-[#DC2626]"
        valueColor="text-[#DC2626]"
        icon={<IconGrid size={20} />}
      />
      <StatCard
        label="محاضرات مكتملة"
        value={String(stats.completedLectures)}
        tint="bg-purple-50 text-purple-500"
        valueColor="text-purple-500"
        icon={<IconExam size={20} />}
      />
    </div>
  );

  const renderSubjectsGrid = (list: any[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {list.map(s => <SubjectCard key={s.id} subject={s} onNavigate={onNavigate} />)}
    </div>
  );

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAF6EB] font-cairo text-[#0f2233]">
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-3">
            {/* Brand + greeting */}
            <button
              onClick={() => onNavigate('home')}
              className="cursor-pointer bg-transparent border-none flex items-center gap-2.5 shrink-0"
              aria-label="الموقع الرئيسي"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1E3A8A] to-[#0d1f33] text-white flex items-center justify-center shadow-md shadow-[#1E3A8A]/20">
                <IconBookOpen size={18} />
              </div>
              <span className="text-base font-extrabold text-[#1E3A8A]">محمد عطا</span>
            </button>

            {/* Tabs (desktop) */}
            <nav className="hidden lg:flex items-center gap-1 bg-slate-100/70 rounded-2xl p-1" aria-label="أقسام لوحة التحكم">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer border-none
                    ${activeTab === t.key
                      ? 'bg-white text-[#1E3A8A] shadow-sm shadow-black/5'
                      : 'bg-transparent text-slate-500 hover:text-[#1E3A8A]'}`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('home')}
                className="hidden md:flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-500 text-xs font-semibold hover:bg-slate-50 hover:text-[#1E3A8A] transition-all duration-200 cursor-pointer"
              >
                <IconHome size={14} /> الموقع الرئيسي
              </button>
              <button
                onClick={() => onNavigate('ai')}
                className="flex items-center gap-1.5 bg-gradient-to-l from-[#DC2626] to-[#991B1B] rounded-xl px-3 py-2 text-white text-xs font-bold shadow-md shadow-[#DC2626]/25 hover:shadow-[#DC2626]/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              >
                <IconSpark size={14} /> <span className="hidden sm:inline">المساعد الذكي</span><span className="sm:hidden">AI</span>
              </button>
              <div className="relative hidden md:flex items-center">
                <input
                  type="text"
                  placeholder="البحث..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl py-2 pr-4 pl-9 text-slate-700 text-xs w-36 sm:w-44 outline-none focus:border-[#1E3A8A]/40 focus:ring-2 focus:ring-[#1E3A8A]/10 focus:w-44 sm:focus:w-56 transition-all duration-200 placeholder:text-slate-400"
                />
                <span className="absolute left-3 pointer-events-none text-slate-400"><IconSearch size={14} /></span>
              </div>
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen(o => !o)}
                  className="relative bg-white border border-slate-200 rounded-xl p-2 text-slate-500 cursor-pointer hover:bg-slate-50 hover:text-[#1E3A8A] transition-colors duration-200"
                  aria-label="الإشعارات"
                >
                  <IconBell size={17} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-[#DC2626] border-2 border-white text-[10px] font-bold text-white flex items-center justify-center px-0.5">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <NotifDropdown notifs={notifs} onMarkAll={markAllRead} onClose={() => setNotifOpen(false)} />
                )}
              </div>
              {/* Avatar */}
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1E3A8A] to-[#DC2626] flex items-center justify-center text-white text-xs font-extrabold shadow-md shadow-[#1E3A8A]/20 ring-2 ring-white">
                {studentInitials}
              </div>
            </div>
          </div>

          {/* Tabs (mobile) */}
          <nav className="lg:hidden flex items-center gap-1 overflow-x-auto pb-3 -mx-1 px-1" aria-label="أقسام لوحة التحكم">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-bold whitespace-nowrap transition-all duration-200 cursor-pointer border-none
                  ${activeTab === t.key
                    ? 'bg-[#1E3A8A] text-white shadow-md shadow-[#1E3A8A]/25'
                    : 'bg-slate-100/70 text-slate-500 hover:text-[#1E3A8A]'}`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* ── Dashboard Tab ── */}
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in space-y-6">
            {/* Hero greeting */}
            <div className="bg-gradient-to-l from-[#0d1f33] via-[#13264d] to-[#1E3A8A] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-[#1E3A8A]/20 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-white/[0.04] -translate-x-24 -translate-y-24" />
              <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full bg-[#DC2626]/10 translate-x-16 translate-y-16" />
              <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="max-w-lg">
                  <p className="text-sm font-bold text-sky-200/80 mb-1 flex items-center gap-2"><StreakBadge days={streak} variant="dark" /> <span className="hidden sm:inline text-amber-300/90">الاستمرارية سر النجاح</span></p>
                  <h1 className="text-2xl sm:text-3xl font-black font-cairo mt-2">{studentName}، جهّز نفسك لميستري النهاردة 💪</h1>
                  <p className="text-sm text-slate-300/80 mt-2 leading-relaxed">
                    عندك {stats.totalCourses} مادة و{stats.totalLectures} محاضرة واختبارات جاهزة — كل اللي عليك إنك تكمّل وتلم النقاط. شرح وافي بالتفصيل، بالساينس على طول.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-5">
                    <button
                      onClick={() => featuredSubject
                        ? onNavigate('video-viewer', { courseId: featuredSubject.id })
                        : onNavigate('courses')}
                      className="flex items-center gap-2 bg-gradient-to-l from-[#DC2626] to-[#991B1B] text-white text-sm font-extrabold px-6 py-3 rounded-2xl hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#DC2626]/30 transition-all duration-200 cursor-pointer shadow-lg shadow-[#DC2626]/25"
                    >
                      <IconPlay size={15} /> ابدأ محاضرة النهاردة
                    </button>
                    <button
                      onClick={() => onNavigate('courses')}
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/15 text-white text-sm font-bold px-5 py-3 rounded-2xl transition-all duration-200 cursor-pointer"
                    >
                      استكشف المزيد <IconArrowLeft size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-5 shrink-0">
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <ProgressRing pct={Math.round(stats.overallProgress)} size={92} stroke={8} color="#EF4444" track="rgba(255,255,255,0.18)" />
                      <span className="absolute inset-0 flex items-center justify-center text-2xl font-black">{Math.round(stats.overallProgress)}%</span>
                    </div>
                    <span className="text-[11px] text-slate-300/80 mt-1 font-semibold">الإنجاز العام</span>
                  </div>
                  <div className="h-14 w-px bg-white/15 hidden sm:block" />
                  <div className="hidden sm:flex flex-col gap-2 text-xs text-slate-300/80">
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> تابع محاضراتك ولا تفوّت أي شرح</div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-sky-300" /> راجع امتحاناتك لتثبيت المعلومة</div>
                  </div>
                </div>
              </div>
            </div>

            {renderStats()}

            <SellingBand onNavigate={onNavigate} />

            {/* Continue learning + subjects */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : subjects.length === 0 ? (
              <EmptyState onNavigate={onNavigate} />
            ) : (
              <div className="space-y-6">
                {featuredSubject && (
                  <SubjectCard subject={featuredSubject} onNavigate={onNavigate} featured />
                )}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-extrabold text-[#0f2233] flex items-center gap-2"><IconGrid size={18} className="text-[#1E3A8A]" /> محتواي التعليمي</h2>
                    <span className="text-xs text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1 font-semibold">
                      {filteredSubjects.length} مواد
                    </span>
                  </div>
                  {renderSubjectsGrid(filteredSubjects)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Courses Tab ── */}
        {activeTab === 'courses' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <h2 className="text-xl font-extrabold text-[#0f2233] flex items-center gap-2"><IconBookOpen size={20} className="text-[#1E3A8A]" /> كورساتي</h2>
              <div className="md:hidden relative flex items-center">
                <input
                  type="text"
                  placeholder="البحث..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl py-2 pr-4 pl-9 text-slate-700 text-xs w-40 outline-none focus:border-[#1E3A8A]/40"
                />
                <span className="absolute left-3 pointer-events-none text-slate-400"><IconSearch size={14} /></span>
              </div>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filteredSubjects.length === 0 ? (
              <EmptyState onNavigate={onNavigate} />
            ) : (
              renderSubjectsGrid(filteredSubjects)
            )}
          </div>
        )}

        {/* ── Exams Tab ── */}
        {activeTab === 'exams' && (
          <div className="animate-fade-in">
            <StudentExamViewer />
          </div>
        )}

        {/* ── Profile Tab ── */}
        {activeTab === 'profile' && (
          <div className="animate-fade-in max-w-2xl mx-auto">
            <h2 className="text-xl font-extrabold text-[#0f2233] flex items-center gap-2 mb-5"><IconUser size={20} className="text-[#1E3A8A]" /> الملف الشخصي</h2>
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-8">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#1E3A8A] to-[#DC2626] flex items-center justify-center text-3xl font-extrabold text-white shadow-lg shadow-[#1E3A8A]/25 ring-4 ring-[#1E3A8A]/10">
                  {studentInitials}
                </div>
                <div>
                  <p className="text-lg font-extrabold text-[#0f2233]">{studentName}</p>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5"><IconUser size={13} /> عضو مسجّل — طالب</p>
                </div>
                <div className="sm:ms-auto flex flex-col gap-1.5 text-xs font-bold">
                  <span className="bg-sky-50 text-sky-600 rounded-full px-3 py-1.5 inline-flex items-center gap-1.5"><IconBookOpen size={13} /> {stats.totalCourses} مواد مسجلة</span>
                  <span className="bg-red-50 text-[#DC2626] rounded-full px-3 py-1.5 inline-flex items-center gap-1.5"><IconExam size={13} /> {stats.completedLectures} محاضرة مكتملة</span>
                </div>
              </div>
              <div className="flex flex-col gap-5">
                {[
                  { label: 'الاسم الكامل', value: studentName, type: 'text', id: 'profile-name' },
                  { label: 'البريد الإلكتروني', value: user?.email || '', type: 'email', id: 'profile-email' },
                ].map((f) => (
                  <div key={f.id}>
                    <label htmlFor={f.id} className="block text-xs font-bold text-slate-500 mb-1.5">{f.label}</label>
                    <input
                      id={f.id}
                      defaultValue={f.value}
                      type={f.type}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[#0f2233] text-sm outline-none focus:border-[#1E3A8A]/40 focus:ring-2 focus:ring-[#1E3A8A]/10 transition-all duration-200 font-cairo"
                    />
                  </div>
                ))}
                <div className="flex flex-wrap gap-3 pt-1">
                  <button className="bg-gradient-to-l from-[#1E3A8A] to-[#0566d9] border-none rounded-2xl px-7 py-3 text-white text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity duration-200 shadow-lg shadow-[#1E3A8A]/25 font-cairo">
                    حفظ التغييرات
                  </button>
                  <button
                    onClick={() => { logout(); onNavigate('home'); }}
                    className="flex items-center gap-2 bg-red-50 hover:bg-red-100 border border-red-100 rounded-2xl px-6 py-3 text-[#DC2626] text-sm font-bold cursor-pointer transition-colors duration-200 border-none"
                  >
                    <IconLogout size={15} /> تسجيل الخروج
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;