import React, { useState, useEffect, useCallback } from 'react';
import { Page } from '../App';
import { useAuth } from '../contexts/AuthContext';
import SelectField from './SelectField';
import {
    getAdminStats, getStudents, deleteStudent, updateStudent,
    getTeachers, deleteTeacher, updateTeacher,
    getAdminCourses, deleteCourse, createAdminCourse, updateAdminCourse, publishAdminCourse,
    getAdminOrders, deleteOrder,
    getEnrollments, enrollStudent, deleteEnrollment,
    createUser, toggleUserActive,
    getSubjectsList, getStudentsList, getTeachersList,
} from '../api/admin.api';
import AccountingTab from './AccountingTab';
import AttendanceTab from './AttendanceTab';
import EmployeesTab from './EmployeesTab';
import TasksTab from './TasksTab';
import StreakBadge from './StreakBadge';
import { computeStreak, recordStudyDay } from '../utils/streak';

type Tab = 'overview' | 'students' | 'teachers' | 'courses' | 'enrollments' | 'orders' | 'accounting' | 'attendance' | 'employees' | 'tasks';
interface AdminDashboardProps { onNavigate: (page: Page) => void; }

// ── Icons ──────────────────────────────────────────────────────
const Icons = {
    home: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,
    students: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    teachers: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5"/></svg>,
    courses: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
    enrollments: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>,
    orders: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>,
    accounting: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
    attendance: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>,
    employees: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>,
    tasks: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
    logout: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    back: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/></svg>,
    search: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    close: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    warning: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>,
    menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
    chevronLeft: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,18 15,12 9,6"/></svg>,
};

// ── Shared UI Components ───────────────────────────────────────

function Btn({ children, onClick, variant = 'primary', small = false, disabled = false, className = '' }: {
    children: React.ReactNode; onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost';
    small?: boolean; disabled?: boolean; className?: string;
}) {
    const styles: Record<string, string> = {
        primary: 'bg-[#1E3A8A] hover:bg-[#0d1f33] text-white border-[#1E3A8A]/30',
        secondary: 'bg-[#1E3A8A]/[0.06] hover:bg-[#1E3A8A]/[0.12] text-[#1E3A8A] border-[#1E3A8A]/15',
        danger: 'bg-red-50 hover:bg-red-100 text-[#DC2626] border-red-100',
        success: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-100',
        warning: 'bg-amber-50 hover:bg-amber-100 text-amber-600 border-amber-100',
        ghost: 'bg-transparent hover:bg-slate-100 text-slate-500 border-transparent',
    };
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`font-cairo cursor-pointer transition-all duration-150 rounded-lg font-semibold border ${small ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-[13px]'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${styles[variant]} ${className}`}
        >
            {children}
        </button>
    );
}

function StatCard({ label, value, icon, color, sub }: { label: string; value: number | string; icon: React.ReactNode; color: string; sub?: string }) {
    return (
        <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 hover:shadow-lg hover:shadow-[#1E3A8A]/5 hover:border-slate-300 transition-all duration-200 group">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[12px] text-slate-500 font-medium m-0">{label}</p>
                    <p className="text-2xl font-extrabold text-[#0f2233] mt-1 m-0">{value}</p>
                    {sub && <p className="text-[11px] text-slate-500 mt-1 m-0">{sub}</p>}
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, color }}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

function Table({ headers, children, loading }: { headers: string[]; children: React.ReactNode; loading?: boolean }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr className="border-b border-slate-100">
                        {headers.map(h => (
                            <th key={h} className="font-cairo px-4 py-3 text-left text-[11px] text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <>
                            {[1, 2, 3, 4, 5].map(i => (
                                <tr key={i} className="border-b border-slate-100">
                                    {headers.map((_, j) => (
                                        <td key={j} className="px-4 py-3">
                                            <div className="animate-pulse bg-slate-200/60 rounded-lg h-4 w-full" />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </>
                    ) : children}
                </tbody>
            </table>
        </div>
    );
}

function TR({ children }: { children: React.ReactNode }) {
    return (
        <tr className="border-b border-slate-100 hover:bg-[#1E3A8A]/[0.03] transition-colors duration-100">
            {children}
        </tr>
    );
}

function TD({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <td className={`px-4 py-3 text-slate-600 align-middle ${className}`}>{children}</td>;
}

function Badge({ text, variant = 'default' }: { text: string; variant?: 'default' | 'success' | 'danger' | 'warning' | 'info' }) {
    const styles: Record<string, string> = {
        default: 'bg-slate-100 text-slate-600 border-slate-200',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        danger: 'bg-red-50 text-[#DC2626] border-red-100',
        warning: 'bg-amber-50 text-amber-600 border-amber-100',
        info: 'bg-sky-50 text-sky-700 border-sky-100',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${styles[variant]}`}>
            {text}
        </span>
    );
}

function Modal({ title, onClose, children, maxWidth = 'max-w-lg' }: { title: string; onClose: () => void; children: React.ReactNode; maxWidth?: string }) {
    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" dir="rtl">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative z-10 bg-white border border-slate-200 rounded-2xl p-6 w-full ${maxWidth} max-h-[90vh] overflow-y-auto shadow-2xl`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-cairo text-[#0f2233] text-base font-bold m-0">{title}</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-[#0f2233] cursor-pointer transition-colors border-none" aria-label="إغلاق">
                        {Icons.close}
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

function Field({ label, children, required = false }: { label: string; children: React.ReactNode; required?: boolean }) {
    return (
        <div className="mb-4">
            <label className="font-cairo block text-[12px] text-slate-600 mb-1.5 font-medium">
                {label} {required && <span className="text-[#DC2626]">*</span>}
            </label>
            {children}
        </div>
    );
}

const inputCls = "font-cairo w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-[#0f2233] text-sm outline-none focus:border-[#1E3A8A]/40 focus:ring-2 focus:ring-[#1E3A8A]/10 transition-all duration-150 placeholder:text-slate-400";
const selectCls = `${inputCls} appearance-none cursor-pointer`;

// ── Sidebar Nav Items ──────────────────────────────────────────
const NAV_ITEMS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'نظرة عامة', icon: Icons.home },
    { key: 'students', label: 'الطلاب', icon: Icons.students },
    { key: 'teachers', label: 'المدرسون', icon: Icons.teachers },
    { key: 'courses', label: 'المواد', icon: Icons.courses },
    { key: 'enrollments', label: 'التسجيلات', icon: Icons.enrollments },
    { key: 'orders', label: 'الطلبات', icon: Icons.orders },
    { key: 'accounting', label: 'الحسابات', icon: Icons.accounting },
    { key: 'attendance', label: 'الحضور والغياب', icon: Icons.attendance },
    { key: 'employees', label: 'الموظفون', icon: Icons.employees },
    { key: 'tasks', label: 'المهام', icon: Icons.tasks },
];

// ── Main Component ─────────────────────────────────────────────

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
    const { user, logout } = useAuth();
    const [tab, setTab] = useState<Tab>('overview');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [data, setData] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [confirm, setConfirm] = useState<{ id: string | number; label: string; onConfirm: () => void } | null>(null);
    const [modal, setModal] = useState<'createUser' | 'editUser' | 'createCourse' | 'editCourse' | 'enroll' | null>(null);
    const [editTarget, setEditTarget] = useState<any>(null);
    const [form, setForm] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const [teachersList, setTeachersList] = useState<any[]>([]);
    const [studentsList, setStudentsList] = useState<any[]>([]);
    const [subjectsList, setSubjectsList] = useState<any[]>([]);
    const [streak, setStreak] = useState(0);

    const showToast = (msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        getAdminStats().then(r => setStats(r?.data || r)).catch(() => {});
    }, []);

    useEffect(() => {
        const uid = user?.id;
        if (!uid || uid === 'guest') { setStreak(0); return; }
        setStreak(computeStreak(uid));
        const t = setTimeout(() => setStreak(recordStudyDay(uid)), 500);
        return () => clearTimeout(t);
    }, [user?.id]);

    const loadTab = useCallback(async (t: Tab, p = 1) => {
        setLoading(true);
        try {
            let r: any;
            if (t === 'students') r = await getStudents(p);
            else if (t === 'teachers') r = await getTeachers(p);
            else if (t === 'courses') r = await getAdminCourses(p);
            else if (t === 'orders') r = await getAdminOrders(p);
            else if (t === 'enrollments') r = await getEnrollments(p);
            if (r) { setData(r.data || []); setTotal(r.total || 0); }
        } catch { }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (tab !== 'overview') { setPage(1); setSearch(''); loadTab(tab, 1); }
    }, [tab, loadTab]);

    const reload = () => loadTab(tab, page);

    const filtered = search.trim()
        ? data.filter(item => {
            const q = search.toLowerCase();
            return Object.values(item).some(v => String(v ?? '').toLowerCase().includes(q));
        })
        : data;

    const openCreate = async () => {
        setForm({});
        setEditTarget(null);
        if (tab === 'students' || tab === 'teachers') {
            setModal('createUser');
        } else if (tab === 'courses') {
            const tl = await getTeachersList().catch(() => ({ data: [] }));
            setTeachersList(tl?.data || []);
            setModal('createCourse');
        } else if (tab === 'enrollments') {
            const [sl, sub] = await Promise.all([
                getStudentsList().catch(() => ({ data: [] })),
                getSubjectsList().catch(() => ({ data: [] })),
            ]);
            setStudentsList(sl?.data || []);
            setSubjectsList(sub?.data || []);
            setModal('enroll');
        }
    };

    const openEdit = async (item: any) => {
        setEditTarget(item);
        setForm({ ...item });
        if (tab === 'students' || tab === 'teachers') {
            setModal('editUser');
        } else if (tab === 'courses') {
            const tl = await getTeachersList().catch(() => ({ data: [] }));
            setTeachersList(tl?.data || []);
            setModal('editCourse');
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (modal === 'createUser') {
                const role = tab === 'teachers' ? 'teacher' : 'student';
                await createUser({ ...form, role });
                showToast('تم إنشاء المستخدم بنجاح');
            } else if (modal === 'editUser') {
                const payload: any = {
                    name: form.name,
                    email: form.email,
                    phoneNumber: form.phoneNumber || null,
                    bio: form.bio || null,
                    isActive: form.isActive,
                };
                if (form.password && form.password.trim() !== '') {
                    payload.password = form.password.trim();
                }
                if (tab === 'students') await updateStudent(editTarget.id, payload);
                else await updateTeacher(editTarget.id, payload);
                showToast('تم التحديث بنجاح');
            } else if (modal === 'createCourse') {
                await createAdminCourse({ ...form, teacherId: form.teacherId || '' });
                showToast('تم إنشاء المادة بنجاح');
            } else if (modal === 'editCourse') {
                await updateAdminCourse(editTarget.id, form);
                showToast('تم تحديث المادة بنجاح');
            } else if (modal === 'enroll') {
                await enrollStudent(form.studentId, form.subjectId);
                showToast('تم التسجيل بنجاح');
            }
            setModal(null);
            reload();
        } catch (e: any) {
            showToast(e?.message || 'حدث خطأ', false);
        }
        setSaving(false);
    };

    const handleDelete = (id: string | number, label: string, onConfirm: () => void) => {
        setConfirm({ id, label, onConfirm });
    };

    const doDelete = async () => {
        if (!confirm) return;
        try {
            await confirm.onConfirm();
            showToast('تم الحذف بنجاح');
            reload();
        } catch { showToast('فشل الحذف', false); }
        setConfirm(null);
    };

    const canCreate = ['students', 'teachers', 'courses', 'enrollments'].includes(tab);
    const canEdit = ['students', 'teachers', 'courses'].includes(tab);
    const canSearch = tab !== 'overview' && tab !== 'accounting' && tab !== 'attendance' && tab !== 'employees' && tab !== 'tasks';

    return (
        <div dir="rtl" className="min-h-screen bg-[#FAF6EB] font-cairo text-[#0f2233]">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[999] px-5 py-2.5 rounded-xl font-semibold text-sm text-white shadow-2xl font-cairo flex items-center gap-2 ${toast.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    {toast.ok ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    )}
                    {toast.msg}
                </div>
            )}

            <div className="flex min-h-screen">
                {/* ── Sidebar ── */}
                <aside className={`fixed top-0 right-0 h-full z-30 bg-white border-l border-slate-200/70 transition-all duration-300 flex flex-col ${sidebarOpen ? 'w-60' : 'w-16'}`}>
                    {/* Sidebar Header */}
                    <div className="px-4 py-5 border-b border-slate-100 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                        </div>
                        {sidebarOpen && (
                            <div className="min-w-0">
                                <h1 className="font-cairo text-[#0f2233] text-sm font-bold m-0 truncate">لوحة التحكم</h1>
                                <p className="text-[10px] text-slate-500 m-0 truncate">{user?.name}</p>
                            </div>
                        )}
                    </div>

                    {/* Nav Items */}
                    <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
                        {NAV_ITEMS.map(item => {
                            const isActive = tab === item.key;
                            return (
                                <button
                                    key={item.key}
                                    onClick={() => setTab(item.key)}
                                    title={item.label}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer border-none ${isActive ? 'bg-[#1E3A8A]/10 text-[#1E3A8A] font-bold' : 'bg-transparent text-slate-500 hover:text-[#1E3A8A] hover:bg-[#1E3A8A]/[0.05]'}`}
                                >
                                    <span className="flex-shrink-0">{item.icon}</span>
                                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="p-2 border-t border-slate-100 space-y-1">
                        <button
                            onClick={() => onNavigate('home')}
                            title="رجوع للموقع"
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-transparent text-slate-500 hover:text-[#1E3A8A] hover:bg-[#1E3A8A]/[0.05] transition-colors cursor-pointer border-none"
                        >
                            <span className="flex-shrink-0">{Icons.back}</span>
                            {sidebarOpen && <span>رجوع للموقع</span>}
                        </button>
                        <button
                            onClick={() => { logout(); onNavigate('home'); }}
                            title="خروج"
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-transparent text-red-500/70 hover:text-[#DC2626] hover:bg-red-50 transition-colors cursor-pointer border-none"
                        >
                            <span className="flex-shrink-0">{Icons.logout}</span>
                            {sidebarOpen && <span>خروج</span>}
                        </button>
                    </div>
                </aside>

                {/* ── Main Content ── */}
                <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'mr-60' : 'mr-16'}`}>
                    {/* Top Bar */}
                    <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-slate-200/70 px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-[#1E3A8A] cursor-pointer transition-colors border-none"
                            >
                                {Icons.menu}
                            </button>
                            <div>
                                <h2 className="font-cairo text-[#0f2233] text-[15px] font-bold m-0">
                                    {NAV_ITEMS.find(n => n.key === tab)?.label || 'نظرة عامة'}
                                </h2>
                            </div>
                        </div>
                        {canSearch && (
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{Icons.search}</span>
                                    <input
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="بحث..."
                                        className="font-cairo pr-9 pl-4 py-2 bg-white border border-slate-200 rounded-xl text-[#0f2233] text-sm outline-none focus:border-[#1E3A8A]/40 focus:ring-2 focus:ring-[#1E3A8A]/10 w-56 transition-colors placeholder:text-slate-400"
                                    />
                                </div>
                                {canCreate && (
                                    <Btn onClick={openCreate}>
                                        <span className="flex items-center gap-1.5">{Icons.plus} إضافة</span>
                                    </Btn>
                                )}
                            </div>
                        )}
                    </header>

                    {/* Page Content */}
                    <main className="p-6">
                        {/* ── Overview ── */}
                        {tab === 'overview' && stats && (
                            <div className="space-y-6">
                                <div className="relative overflow-hidden bg-gradient-to-l from-[#0d1f3c] via-[#132742] to-[#1E3A8A] rounded-3xl p-6 sm:p-7 mb-2 shadow-xl shadow-black/20 border border-white/[0.06]">
                                    <div className="absolute top-0 left-0 w-56 h-56 rounded-full bg-white/[0.04] -translate-x-20 -translate-y-20" />
                                    <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full bg-[#DC2626]/10 translate-x-14 translate-y-14" />
                                    <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                                        <div className="max-w-xl">
                                            <div className="flex items-center gap-2 mb-2">
                                                <StreakBadge days={streak} variant="dark" />
                                                <span className="text-xs font-bold text-slate-400 hidden sm:inline">استمرارية الادارة = استمرارية التعليم</span>
                                            </div>
                                            <h2 className="font-cairo text-white text-xl sm:text-2xl font-black m-0">
                                                أ. {user?.name || 'المدير'}, المنصة في إيديك 🚀
                                            </h2>
                                            <p className="text-sm text-slate-300/80 mt-1.5 leading-relaxed m-0">
                                                {stats.orders != null && Number(stats.orders) > 0
                                                    ? `عندك ${stats.students ?? 0} طالب و${stats.teachers ?? 0} مدرس — وكل مادة منشورة خطوة أقرب للهدف.`
                                                    : 'تابع الطلاب والمدرسين والمواد — كل مادة منشورة خطوة أقرب للهدف.'}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                                            <button
                                                onClick={() => setTab('courses')}
                                                className="flex items-center gap-2 bg-gradient-to-r from-[#f59e0b] to-[#d97706] border-none rounded-xl px-5 py-3 text-white text-sm font-extrabold cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-200 shadow-lg shadow-amber-500/20 font-cairo"
                                            >
                                                إدارة المواد
                                            </button>
                                            <button
                                                onClick={() => setTab('students')}
                                                className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.12] rounded-xl px-4 py-3 text-slate-300 text-sm font-bold cursor-pointer hover:bg-white/10 hover:text-white transition-all duration-200 font-cairo"
                                            >
                                                الطلاب الجدد
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                                    <StatCard label="الطلاب" value={stats.students ?? '—'} icon={Icons.students} color="#38bdf8" />
                                    <StatCard label="المدرسون" value={stats.teachers ?? '—'} icon={Icons.teachers} color="#a78bfa" />
                                    <StatCard label="المواد" value={stats.courses ?? '—'} icon={Icons.courses} color="#34d399" />
                                    <StatCard label="الطلبات" value={stats.orders ?? '—'} icon={Icons.orders} color="#fbbf24" />
                                    <StatCard label="الإيرادات" value={stats.revenue != null ? `${Number(stats.revenue).toLocaleString('ar-SA')} ج.م` : '—'} icon={Icons.accounting} color="#34d399" sub="من الطلبات المكتملة" />
                                </div>

                                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 hover:shadow-lg hover:shadow-[#1E3A8A]/5 transition-all duration-200">
                                    <h3 className="font-cairo text-[#0f2233] text-sm font-bold m-0 mb-4">التنقل السريع</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                        {NAV_ITEMS.filter(n => n.key !== 'overview').map(item => (
                                            <button
                                                key={item.key}
                                                onClick={() => setTab(item.key)}
                                                className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-[#1E3A8A]/30 hover:bg-[#1E3A8A]/[0.05] transition-all duration-200 cursor-pointer group"
                                            >
                                                <span className="text-slate-500 group-hover:text-[#1E3A8A] transition-colors">{item.icon}</span>
                                                <span className="font-cairo text-slate-600 group-hover:text-[#1E3A8A] text-sm font-medium transition-colors">{item.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Accounting Tab ── */}
                        {tab === 'accounting' && <AccountingTab mode="admin" showToast={showToast} />}

                        {/* ── Attendance Tab ── */}
                        {tab === 'attendance' && <AttendanceTab showToast={showToast} />}

                        {/* ── Employees Tab ── */}
                        {tab === 'employees' && <EmployeesTab showToast={showToast} />}

                        {/* ── Tasks Tab ── */}
                        {tab === 'tasks' && <TasksTab showToast={showToast} />}

                        {/* ── Table Tabs ── */}
                        {tab !== 'overview' && tab !== 'accounting' && tab !== 'attendance' && tab !== 'employees' && tab !== 'tasks' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-slate-500 text-[13px]">
                                        {search ? `${filtered.length} نتيجة من ${total}` : `إجمالي: ${total}`}
                                    </span>
                                </div>

                                <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-[#1E3A8A]/5 transition-shadow duration-200">
                                    {/* Students */}
                                    {tab === 'students' && (
                                        <Table headers={['الاسم', 'البريد الإلكتروني', 'الهاتف', 'الحالة', 'تاريخ التسجيل', 'إجراءات']} loading={loading}>
                                            {filtered.map(s => (
                                                <TR key={s.id}>
                                                    <TD className="font-medium text-[#0f2233]">{s.name}</TD>
                                                    <TD><span className="direction-ltr inline-block text-slate-400" style={{ direction: 'ltr' }}>{s.email}</span></TD>
                                                    <TD className="text-slate-600">{s.phoneNumber || '—'}</TD>
                                                    <TD><Badge text={s.isActive ? 'نشط' : 'معطل'} variant={s.isActive ? 'success' : 'danger'} /></TD>
                                                    <TD className="text-slate-500 text-[12px]">{new Date(s.createdAt).toLocaleDateString('ar-SA')}</TD>
                                                    <TD>
                                                        <div className="flex gap-1.5">
                                                            {canEdit && <Btn small onClick={() => openEdit(s)} variant="secondary">تعديل</Btn>}
                                                            <Btn small onClick={() => toggleUserActive(s.id).then(reload)} variant={s.isActive ? 'warning' : 'success'}>{s.isActive ? 'تعطيل' : 'تفعيل'}</Btn>
                                                            <Btn small onClick={() => handleDelete(s.id, s.name, () => deleteStudent(s.id))} variant="danger">حذف</Btn>
                                                        </div>
                                                    </TD>
                                                </TR>
                                            ))}
                                        </Table>
                                    )}

                                    {/* Teachers */}
                                    {tab === 'teachers' && (
                                        <Table headers={['الاسم', 'البريد الإلكتروني', 'الهاتف', 'الحالة', 'تاريخ التسجيل', 'إجراءات']} loading={loading}>
                                            {filtered.map(t => (
                                                <TR key={t.id}>
                                                    <TD className="font-medium text-[#0f2233]">{t.name}</TD>
                                                    <TD><span style={{ direction: 'ltr' }} className="inline-block text-slate-400">{t.email}</span></TD>
                                                    <TD className="text-slate-600">{t.phoneNumber || '—'}</TD>
                                                    <TD><Badge text={t.isActive ? 'نشط' : 'معطل'} variant={t.isActive ? 'success' : 'danger'} /></TD>
                                                    <TD className="text-slate-500 text-[12px]">{new Date(t.createdAt).toLocaleDateString('ar-SA')}</TD>
                                                    <TD>
                                                        <div className="flex gap-1.5">
                                                            {canEdit && <Btn small onClick={() => openEdit(t)} variant="secondary">تعديل</Btn>}
                                                            <Btn small onClick={() => toggleUserActive(t.id).then(reload)} variant={t.isActive ? 'warning' : 'success'}>{t.isActive ? 'تعطيل' : 'تفعيل'}</Btn>
                                                            <Btn small onClick={() => handleDelete(t.id, t.name, () => deleteTeacher(t.id))} variant="danger">حذف</Btn>
                                                        </div>
                                                    </TD>
                                                </TR>
                                            ))}
                                        </Table>
                                    )}

                                    {/* Courses */}
                                    {tab === 'courses' && (
                                        <Table headers={['العنوان', 'المدرس', 'التصنيف', 'الحالة', 'الطلاب', 'السعر', 'إجراءات']} loading={loading}>
                                            {filtered.map(c => (
                                                <TR key={c.id}>
                                                    <TD className="font-medium text-[#0f2233]">{c.title}</TD>
                                                    <TD>{c.teacherName}</TD>
                                                    <TD className="text-slate-600">{c.category || '—'}</TD>
                                                    <TD><Badge text={c.status === 'published' ? 'منشور' : 'مسودة'} variant={c.status === 'published' ? 'success' : 'warning'} /></TD>
                                                    <TD>{c.studentsCount}</TD>
                                                    <TD>{c.price ?? 0} ج.م</TD>
                                                    <TD>
                                                        <div className="flex gap-1.5">
                                                            {canEdit && <Btn small onClick={() => openEdit(c)} variant="secondary">تعديل</Btn>}
                                                            <Btn small onClick={() => publishAdminCourse(c.id, c.status === 'published' ? 'draft' : 'published').then(reload)} variant={c.status === 'published' ? 'warning' : 'success'}>{c.status === 'published' ? 'إيقاف' : 'نشر'}</Btn>
                                                            <Btn small onClick={() => handleDelete(c.id, c.title, () => deleteCourse(c.id))} variant="danger">حذف</Btn>
                                                        </div>
                                                    </TD>
                                                </TR>
                                            ))}
                                        </Table>
                                    )}

                                    {/* Enrollments */}
                                    {tab === 'enrollments' && (
                                        <Table headers={['الطالب', 'البريد الإلكتروني', 'المادة', 'تاريخ التسجيل', 'إجراءات']} loading={loading}>
                                            {filtered.map(e => (
                                                <TR key={e.id}>
                                                    <TD className="font-medium text-[#0f2233]">{e.studentName}</TD>
                                                    <TD><span style={{ direction: 'ltr' }} className="inline-block text-slate-400">{e.studentEmail}</span></TD>
                                                    <TD>{e.subjectTitle || '—'}</TD>
                                                    <TD className="text-slate-500 text-[12px]">{new Date(e.enrolledAt).toLocaleDateString('ar-SA')}</TD>
                                                    <TD><Btn small onClick={() => handleDelete(e.id, `${e.studentName} - ${e.subjectTitle}`, () => deleteEnrollment(e.id))} variant="danger">إلغاء التسجيل</Btn></TD>
                                                </TR>
                                            ))}
                                        </Table>
                                    )}

                                    {/* Orders */}
                                    {tab === 'orders' && (
                                        <Table headers={['رقم الطلب', 'الطالب', 'طريقة الدفع', 'الحالة', 'المبلغ', 'التاريخ', 'إجراءات']} loading={loading}>
                                            {filtered.map(o => (
                                                <TR key={o.id}>
                                                    <TD><span style={{ direction: 'ltr' }} className="inline-block text-[11px] text-slate-500 font-mono">{o.orderNumber}</span></TD>
                                                    <TD className="font-medium text-[#0f2233]">{o.userName}</TD>
                                                    <TD>{o.paymentMethod}</TD>
                                                    <TD><Badge text={o.paymentStatus === 'completed' ? 'مكتمل' : o.paymentStatus} variant={o.paymentStatus === 'completed' ? 'success' : 'warning'} /></TD>
                                                    <TD className="text-emerald-600 font-semibold">{o.finalPrice} ج.م</TD>
                                                    <TD className="text-slate-500 text-[12px]">{new Date(o.createdAt).toLocaleDateString('ar-SA')}</TD>
                                                    <TD><Btn small onClick={() => handleDelete(o.id, o.orderNumber, () => deleteOrder(o.id))} variant="danger">حذف</Btn></TD>
                                                </TR>
                                            ))}
                                        </Table>
                                    )}
                                </div>

                                {/* Pagination */}
                                {total > 20 && !search && (
                                    <div className="flex gap-2 justify-center mt-5 items-center">
                                        <Btn small onClick={() => { const p = Math.max(1, page - 1); setPage(p); loadTab(tab, p); }} variant="secondary" disabled={page === 1}>السابق</Btn>
                                        <span className="text-slate-500 text-[13px] px-3">صفحة {page} من {Math.ceil(total / 20)}</span>
                                        <Btn small onClick={() => { const p = page + 1; setPage(p); loadTab(tab, p); }} variant="secondary" disabled={page >= Math.ceil(total / 20)}>التالي</Btn>
                                    </div>
                                )}
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {/* ── Confirm Delete Modal ── */}
            {confirm && (
                <Modal title="تأكيد الحذف" onClose={() => setConfirm(null)} maxWidth="max-w-sm">
                    <div className="flex items-start gap-3 mb-6">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-[#DC2626]">
                            {Icons.warning}
                        </div>
                        <p className="font-cairo text-slate-600 leading-relaxed">
                            هل أنت متأكد من حذف <strong className="text-[#0f2233]">{confirm.label}</strong>؟ لا يمكن التراجع عن هذا الإجراء.
                        </p>
                    </div>
                    <div className="flex gap-2.5 justify-end">
                        <Btn onClick={() => setConfirm(null)} variant="secondary">إلغاء</Btn>
                        <Btn onClick={doDelete} variant="danger">حذف نهائياً</Btn>
                    </div>
                </Modal>
            )}

            {/* ── Create / Edit User Modal ── */}
            {(modal === 'createUser' || modal === 'editUser') && (
                <Modal
                    title={modal === 'createUser' ? (tab === 'teachers' ? 'إضافة مدرس جديد' : 'إضافة طالب جديد') : 'تعديل بيانات المستخدم'}
                    onClose={() => setModal(null)}
                >
                    <Field label="الاسم الكامل" required>
                        <input className={inputCls} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="الاسم الكامل" />
                    </Field>
                    <Field label="البريد الإلكتروني" required>
                        <input className={inputCls} style={{ direction: 'ltr' }} value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" type="email" autoComplete="off" />
                    </Field>
                    <Field label={modal === 'editUser' ? 'كلمة المرور (اتركها فارغة للإبقاء على الحالية)' : 'كلمة المرور'} required={modal === 'createUser'}>
                        <input className={inputCls} style={{ direction: 'ltr' }} type="password" value={form.password || ''} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" autoComplete="new-password" />
                    </Field>
                    <Field label="رقم الهاتف">
                        <input className={inputCls} value={form.phoneNumber || ''} onChange={e => setForm({ ...form, phoneNumber: e.target.value })} placeholder="05xxxxxxxx" />
                    </Field>
                    <Field label="نبذة شخصية">
                        <textarea className={`${inputCls} resize-y min-h-[70px]`} value={form.bio || ''} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="نبذة مختصرة..." />
                    </Field>
                    {modal === 'editUser' && (
                        <Field label="الحالة">
                            <SelectField id="user-status" value={form.isActive ? 'true' : 'false'} onChange={e => setForm({ ...form, isActive: e.target.value === 'true' })}>
                                <option value="true">نشط</option>
                                <option value="false">معطل</option>
                            </SelectField>
                        </Field>
                    )}
                    <div className="flex gap-2.5 justify-end mt-6 pt-4 border-t border-slate-100">
                        <Btn onClick={() => setModal(null)} variant="secondary">إلغاء</Btn>
                        <Btn onClick={handleSave} disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ'}</Btn>
                    </div>
                </Modal>
            )}

            {/* ── Create / Edit Course Modal ── */}
            {(modal === 'createCourse' || modal === 'editCourse') && (
                <Modal title={modal === 'createCourse' ? 'إضافة مادة جديدة' : 'تعديل المادة'} onClose={() => setModal(null)}>
                    <Field label="عنوان المادة" required>
                        <input className={inputCls} value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="عنوان المادة" />
                    </Field>
                    <Field label="الوصف">
                        <textarea className={`${inputCls} resize-y min-h-[70px]`} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="وصف المادة..." />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="التصنيف">
                            <SelectField id="course-category" value={form.category || 'عام'} onChange={e => setForm({ ...form, category: e.target.value })}>
                                {['علوم','العلوم المتكاملة','عام','رياضيات','لغة عربية','لغة إنجليزية','علوم الحاسب','برمجة','فنون','تربية دينية'].map(c => <option key={c} value={c}>{c}</option>)}
                            </SelectField>
                        </Field>
                        <Field label="المستوى">
                            <SelectField id="course-level" value={form.level || 'مبتدئ'} onChange={e => setForm({ ...form, level: e.target.value })}>
                                {['مبتدئ','متوسط','متقدم','خبير','جميع المستويات'].map(l => <option key={l} value={l}>{l}</option>)}
                            </SelectField>
                        </Field>
                        <Field label="السعر (ج.م)">
                            <input id="course-price" className={inputCls} type="number" min="0" step="0.01" value={form.price ?? 0} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
                        </Field>
                        <Field label="المدة (ساعة)">
                            <input id="course-duration" className={inputCls} type="number" min="0" value={form.duration ?? 0} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) || 0 })} />
                        </Field>
                        <Field label="اللغة">
                            <SelectField id="course-lang" value={form.language || 'العربية'} onChange={e => setForm({ ...form, language: e.target.value })}>
                                {['العربية','الإنجليزية','الفرنسية'].map(l => <option key={l} value={l}>{l}</option>)}
                            </SelectField>
                        </Field>
                        <Field label="الحالة">
                            <SelectField id="course-status" value={form.status || 'draft'} onChange={e => setForm({ ...form, status: e.target.value })}>
                                <option value="draft">مسودة</option>
                                <option value="published">منشور</option>
                            </SelectField>
                        </Field>
                    </div>
                    <Field label="المدرس" required>
                        <SelectField id="course-teacher" value={form.teacherId || ''} onChange={e => setForm({ ...form, teacherId: e.target.value })}>
                            <option value="">-- اختر مدرساً --</option>
                            {teachersList.map(t => <option key={t.id} value={t.id}>{t.name} ({t.email})</option>)}
                        </SelectField>
                    </Field>
                    <Field label="رابط الصورة">
                        <input id="course-image" className={inputCls} value={form.imageUrl || ''} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
                    </Field>
                    <div className="flex gap-2.5 justify-end mt-6 pt-4 border-t border-slate-100">
                        <Btn onClick={() => setModal(null)} variant="secondary">إلغاء</Btn>
                        <Btn onClick={handleSave} disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ'}</Btn>
                    </div>
                </Modal>
            )}

            {/* ── Enroll Modal ── */}
            {modal === 'enroll' && (
                <Modal title="تسجيل طالب في مادة" onClose={() => setModal(null)}>
                    <Field label="الطالب" required>
                        <SelectField id="enroll-student" value={form.studentId || ''} onChange={e => setForm({ ...form, studentId: e.target.value })}>
                            <option value="">-- اختر طالباً --</option>
                            {studentsList.map(s => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
                        </SelectField>
                    </Field>
                    <Field label="المادة" required>
                        <SelectField id="enroll-subject" value={form.subjectId || ''} onChange={e => setForm({ ...form, subjectId: e.target.value })}>
                            <option value="">-- اختر مادة --</option>
                            {subjectsList.map(s => <option key={s.id} value={s.id}>{s.title} — {s.status === 'published' ? 'منشور' : 'مسودة'}</option>)}
                        </SelectField>
                    </Field>
                    <div className="flex gap-2.5 justify-end mt-6 pt-4 border-t border-slate-100">
                        <Btn onClick={() => setModal(null)} variant="secondary">إلغاء</Btn>
                        <Btn onClick={handleSave} disabled={saving} variant="success">{saving ? 'جاري التسجيل...' : 'تسجيل'}</Btn>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default AdminDashboard;
