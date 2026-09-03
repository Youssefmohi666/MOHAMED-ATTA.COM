import React, { useState, useEffect, useCallback } from 'react';
import {
    Employee, EmployeeStats,
    getEmployees, getEmployeeStats, createEmployee, updateEmployee, deleteEmployee, markEmployeePaid,
} from '../api/attendance.api';

interface EmployeesTabProps {
    showToast: (msg: string, ok?: boolean) => void;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: 'نشط', color: '#16a34a', bg: '#16a34a14' },
    on_leave: { label: 'في إجازة', color: '#d97706', bg: '#d9770614' },
    terminated: { label: 'منتهي', color: '#dc2626', bg: '#dc262614' },
};

const inputCls = "font-cairo w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-[#0f2233] text-sm outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/15 transition-all duration-150 placeholder:text-slate-400";

function StatBox({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: React.ReactNode }) {
    return (
        <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[12px] text-slate-500 m-0">{label}</p>
                    <p className="text-2xl font-extrabold text-[#1E3A8A] mt-1 m-0">{value}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, color }}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

export default function EmployeesTab({ showToast }: EmployeesTabProps) {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [stats, setStats] = useState<EmployeeStats | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState<'create' | 'edit' | null>(null);
    const [form, setForm] = useState<any>({});
    const [editId, setEditId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const [paidModal, setPaidModal] = useState<Employee | null>(null);
    const [paidForm, setPaidForm] = useState<{ amount: number; paidDate: string }>({ amount: 0, paidDate: '' });
    const [paying, setPaying] = useState(false);

    const load = useCallback(async (searchTerm = '', status = '') => {
        setLoading(true);
        try {
            const r = await getEmployees(1, searchTerm || undefined, status || undefined);
            setEmployees(r?.data || []);
        } catch { setEmployees([]); }
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
        getEmployeeStats().then(r => setStats(r?.data || null)).catch(() => {});
    }, [load]);

    useEffect(() => {
        const t = setTimeout(() => load(search, statusFilter), 300);
        return () => clearTimeout(t);
    }, [search, statusFilter, load]);

    const openCreate = () => {
        setForm({ name: '', position: '', department: '', email: '', phoneNumber: '', salary: 0, hireDate: new Date().toISOString().slice(0, 10), status: 'active', notes: '' });
        setEditId(null);
        setModal('create');
    };

    const openEdit = (e: Employee) => {
        setForm({ ...e, hireDate: e.hireDate?.slice(0, 10) || '' });
        setEditId(e.id);
        setModal('edit');
    };

    const openMarkPaid = (e: Employee) => {
        setPaidForm({ amount: Number(e.salary) || 0, paidDate: new Date().toISOString().slice(0, 10) });
        setPaidModal(e);
    };

    const handleMarkPaid = async () => {
        if (!paidModal) return;
        if (!paidForm.paidDate) {
            showToast('اختر تاريخ الدفع', false);
            return;
        }
        setPaying(true);
        try {
            await markEmployeePaid(paidModal.id, { amount: Number(paidForm.amount) || 0, paidDate: paidForm.paidDate });
            showToast(`تم صرف راتب ${paidModal.name} بنجاح`);
            setPaidModal(null);
            load(search, statusFilter);
            getEmployeeStats().then(r => setStats(r?.data || null)).catch(() => {});
        } catch (e: any) {
            showToast(e?.message || 'تعذر صرف الراتب', false);
        }
        setPaying(false);
    };

    const handleSave = async () => {
        if (!form.name?.trim() || !form.position?.trim()) {
            showToast('الاسم والوظيفة مطلوبان', false);
            return;
        }
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                position: form.position.trim(),
                department: form.department || null,
                email: form.email || null,
                phoneNumber: form.phoneNumber || null,
                salary: Number(form.salary) || 0,
                hireDate: form.hireDate,
                status: form.status || 'active',
                notes: form.notes || null,
            };
            if (modal === 'create') {
                await createEmployee(payload);
                showToast('تم إضافة الموظف بنجاح');
            } else if (editId) {
                await updateEmployee(editId, payload);
                showToast('تم تحديث بيانات الموظف');
            }
            setModal(null);
            load(search, statusFilter);
            getEmployeeStats().then(r => setStats(r?.data || null)).catch(() => {});
        } catch (e: any) {
            showToast(e?.message || 'حدث خطأ', false);
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteEmployee(id);
            showToast('تم حذف الموظف');
            setConfirmId(null);
            load(search, statusFilter);
            getEmployeeStats().then(r => setStats(r?.data || null)).catch(() => {});
        } catch (e: any) {
            showToast(e?.message || 'فشل الحذف', false);
        }
    };

    const filtered = employees.filter(e => {
        if (statusFilter && e.status !== statusFilter) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            return e.name.toLowerCase().includes(q) || e.position.toLowerCase().includes(q) || (e.department || '').toLowerCase().includes(q);
        }
        return true;
    });

    const PeopleIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
    const CheckIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>;
    const PauseIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>;
    const MoneyIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>;

    return (
        <div>
            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatBox label="إجمالي الموظفين" value={stats.totalEmployees} color="#1E3A8A" icon={PeopleIcon} />
                    <StatBox label="نشط" value={stats.activeEmployees} color="#16a34a" icon={CheckIcon} />
                    <StatBox label="في إجازة" value={stats.onLeaveEmployees} color="#d97706" icon={PauseIcon} />
                    <StatBox label="إجمالي الرواتب الشهرية" value={`${Number(stats.totalMonthlySalary).toLocaleString('ar-SA')} ج.م`} color="#16a34a" icon={MoneyIcon} />
                </div>
            )}

            {/* Toolbar */}
            <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative">
                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="بحث بالاسم أو الوظيفة..."
                            className="font-cairo pr-9 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[#0f2233] text-sm outline-none focus:border-blue-500/60 w-56 transition-all duration-150 placeholder:text-slate-400"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="font-cairo select-light px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-[#0f2233] text-sm outline-none focus:border-blue-500/60 appearance-none cursor-pointer transition-all duration-150"
                    >
                        <option value="">كل الحالات</option>
                        <option value="active">نشط</option>
                        <option value="on_leave">في إجازة</option>
                        <option value="terminated">منتهي</option>
                    </select>
                    <span className="text-slate-400 text-[13px]">{filtered.length} موظف</span>
                </div>
                <button
                    onClick={openCreate}
                    className="font-cairo cursor-pointer px-3.5 py-2 text-[13px] rounded-lg font-semibold text-white transition-all duration-150 border border-blue-600 bg-blue-600 hover:bg-blue-700 shadow-sm"
                >
                    <span className="flex items-center gap-1.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        إضافة موظف
                    </span>
                </button>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/60">
                                {['الاسم', 'الوظيفة', 'القسم', 'الراتب الشهري', 'المدفوع', 'آخر دفعة', 'الحالة', 'إجراءات'].map(h => (
                                    <th key={h} className="font-cairo px-4 py-3 text-left text-[11px] text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="border-b border-slate-100">
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(j => (
                                            <td key={j} className="px-4 py-3"><div className="animate-pulse bg-slate-100 rounded-lg h-4 w-full" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-16 text-center text-slate-400">
                                        <p className="m-0">لا يوجد موظفون</p>
                                    </td>
                                </tr>
                            ) : filtered.map(e => {
                                const meta = STATUS_META[e.status] || STATUS_META.active;
                                return (
                                    <tr key={e.id} className="border-b border-slate-100 hover:bg-[#1E3A8A]/[0.03] transition-colors duration-100">
                                        <td className="px-4 py-3 text-[#0f2233] align-middle font-medium">{e.name}</td>
                                        <td className="px-4 py-3 text-slate-600 align-middle">{e.position}</td>
                                        <td className="px-4 py-3 text-slate-500 align-middle">{e.department || '—'}</td>
                                        <td className="px-4 py-3 align-middle text-[#0f2233] font-semibold">{Number(e.salary).toLocaleString('ar-SA')} ج.م</td>
                                        <td className="px-4 py-3 align-middle">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[12px] font-semibold border" style={{ background: '#10b98114', color: '#0d9488', borderColor: '#10b98130' }}>
                                                {Number(e.salaryPaid || 0).toLocaleString('ar-SA')} ج.م
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 align-middle text-[13px]">{e.lastPaidDate || '—'}</td>
                                        <td className="px-4 py-3 align-middle">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[12px] font-semibold border" style={{ background: meta.bg, color: meta.color, borderColor: `${meta.color}25` }}>
                                                {meta.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-middle">
                                            <div className="flex gap-1.5">
                                                <button onClick={() => openMarkPaid(e)} className="font-cairo cursor-pointer px-2.5 py-1 text-xs rounded-lg font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all duration-150">صرف راتب</button>
                                                <button onClick={() => openEdit(e)} className="font-cairo cursor-pointer px-2.5 py-1 text-xs rounded-lg font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-all duration-150">تعديل</button>
                                                <button onClick={() => setConfirmId(e.id)} className="font-cairo cursor-pointer px-2.5 py-1 text-xs rounded-lg font-semibold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all duration-150">حذف</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create / Edit Modal */}
            {modal && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setModal(null)} />
                    <div className="relative z-10 bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-cairo text-[#0f2233] text-base font-bold m-0">{modal === 'create' ? 'إضافة موظف جديد' : 'تعديل بيانات الموظف'}</h3>
                            <button onClick={() => setModal(null)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 cursor-pointer transition-colors border-none" aria-label="إغلاق">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <div className="mb-4">
                            <label className="font-cairo block text-[12px] text-slate-500 mb-1.5 font-medium">الاسم الكامل <span className="text-red-500">*</span></label>
                            <input className={inputCls} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="اسم الموظف" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="mb-4">
                                <label className="font-cairo block text-[12px] text-slate-500 mb-1.5 font-medium">الوظيفة <span className="text-red-500">*</span></label>
                                <input className={inputCls} value={form.position || ''} onChange={e => setForm({ ...form, position: e.target.value })} placeholder="مثال: محاسب" />
                            </div>
                            <div className="mb-4">
                                <label className="font-cairo block text-[12px] text-slate-500 mb-1.5 font-medium">القسم</label>
                                <input className={inputCls} value={form.department || ''} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="مثال: المالية" />
                            </div>
                            <div className="mb-4">
                                <label className="font-cairo block text-[12px] text-slate-500 mb-1.5 font-medium">الراتب الشهري (ج.م)</label>
                                <input className={inputCls} type="number" min="0" step="0.01" value={form.salary ?? 0} onChange={e => setForm({ ...form, salary: parseFloat(e.target.value) || 0 })} />
                            </div>
                            <div className="mb-4">
                                <label className="font-cairo block text-[12px] text-slate-500 mb-1.5 font-medium">تاريخ التعيين</label>
                                <input className={inputCls} type="date" value={form.hireDate || ''} onChange={e => setForm({ ...form, hireDate: e.target.value })} />
                            </div>
                            <div className="mb-4">
                                <label className="font-cairo block text-[12px] text-slate-500 mb-1.5 font-medium">الهاتف</label>
                                <input className={inputCls} style={{ direction: 'ltr' }} value={form.phoneNumber || ''} onChange={e => setForm({ ...form, phoneNumber: e.target.value })} placeholder="01xxxxxxxx" />
                            </div>
                            <div className="mb-4">
                                <label className="font-cairo block text-[12px] text-slate-500 mb-1.5 font-medium">الحالة</label>
                                <select className={`${inputCls} select-light cursor-pointer appearance-none`} value={form.status || 'active'} onChange={e => setForm({ ...form, status: e.target.value })}>
                                    <option value="active">نشط</option>
                                    <option value="on_leave">في إجازة</option>
                                    <option value="terminated">منتهي</option>
                                </select>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="font-cairo block text-[12px] text-slate-500 mb-1.5 font-medium">البريد الإلكتروني</label>
                            <input className={inputCls} style={{ direction: 'ltr' }} type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
                        </div>
                        <div className="mb-4">
                            <label className="font-cairo block text-[12px] text-slate-500 mb-1.5 font-medium">ملاحظات</label>
                            <textarea className={`${inputCls} resize-y min-h-[60px]`} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات إضافية..." />
                        </div>
                        <div className="flex gap-2.5 justify-end mt-6 pt-4 border-t border-slate-100">
                            <button onClick={() => setModal(null)} className="font-cairo cursor-pointer px-3.5 py-2 text-[13px] rounded-lg font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-all duration-150">إلغاء</button>
                            <button onClick={handleSave} disabled={saving} className="font-cairo cursor-pointer px-3.5 py-2 text-[13px] rounded-lg font-semibold text-white transition-all duration-150 border border-blue-600 bg-blue-600 hover:bg-blue-700 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
                                {saving ? 'جاري الحفظ...' : 'حفظ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mark Paid Modal */}
            {paidModal && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setPaidModal(null)} />
                    <div className="relative z-10 bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-start gap-3 mb-6">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                            </div>
                            <div>
                                <h3 className="font-cairo text-[#0f2233] font-semibold mb-1 m-0">صرف راتب</h3>
                                <p className="font-cairo text-slate-500 text-sm m-0">{paidModal.name} — {paidModal.position}</p>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="font-cairo block text-[12px] text-slate-500 mb-1.5 font-medium">المبلغ (ج.م)</label>
                            <input className={inputCls} type="number" min="0" step="0.01" value={paidForm.amount} onChange={e => setPaidForm({ ...paidForm, amount: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div className="mb-4">
                            <label className="font-cairo block text-[12px] text-slate-500 mb-1.5 font-medium">تاريخ الدفع</label>
                            <input className={inputCls} type="date" value={paidForm.paidDate} onChange={e => setPaidForm({ ...paidForm, paidDate: e.target.value })} />
                        </div>
                        <div className="flex gap-2.5 justify-end mt-6 pt-4 border-t border-slate-100">
                            <button onClick={() => setPaidModal(null)} className="font-cairo cursor-pointer px-3.5 py-2 text-[13px] rounded-lg font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-all duration-150">إلغاء</button>
                            <button onClick={handleMarkPaid} disabled={paying} className="font-cairo cursor-pointer px-3.5 py-2 text-[13px] rounded-lg font-semibold text-white transition-all duration-150 border border-emerald-600 bg-emerald-600 hover:bg-emerald-700 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
                                {paying ? 'جاري الصرف...' : 'تأكيد الصرف'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete */}
            {confirmId && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setConfirmId(null)} />
                    <div className="relative z-10 bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                        <div className="flex items-start gap-3 mb-6">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                            </div>
                            <div>
                                <h3 className="font-cairo text-[#0f2233] font-semibold mb-1 m-0">تأكيد الحذف</h3>
                                <p className="font-cairo text-slate-500 text-sm leading-relaxed m-0">هل أنت متأكد من حذف هذا الموظف؟ لا يمكن التراجع عن هذا الإجراء.</p>
                            </div>
                        </div>
                        <div className="flex gap-2.5 justify-end pt-4 border-t border-slate-100">
                            <button onClick={() => setConfirmId(null)} className="font-cairo cursor-pointer px-3.5 py-2 text-[13px] rounded-lg font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-all duration-150">إلغاء</button>
                            <button onClick={() => handleDelete(confirmId)} className="font-cairo cursor-pointer px-3.5 py-2 text-[13px] rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 border border-red-600 transition-all duration-150">حذف نهائياً</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
