import React, { useState, useEffect, useCallback } from 'react';
import {
    AppTask, TaskAssignee,
    getTasks, getTaskAssignees, createTask, updateTask, deleteTask,
} from '../api/tasks.api';

interface TasksTabProps {
    showToast: (msg: string, ok?: boolean) => void;
}

const PRIORITY_META: Record<string, { label: string; color: string; bg: string }> = {
    low: { label: 'منخفضة', color: '#16a34a', bg: '#16a34a14' },
    normal: { label: 'عادية', color: '#d97706', bg: '#d9770614' },
    high: { label: 'عالية', color: '#ea580c', bg: '#ea580c14' },
    urgent: { label: 'عاجلة', color: '#dc2626', bg: '#dc262614' },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'معلّقة', color: '#d97706', bg: '#d9770614' },
    in_progress: { label: 'قيد التنفيذ', color: '#2563eb', bg: '#2563eb14' },
    completed: { label: 'مكتملة', color: '#16a34a', bg: '#16a34a14' },
    cancelled: { label: 'ملغاة', color: '#64748b', bg: '#64748b14' },
};

const inputCls = "font-cairo w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-[#0f2233] text-sm outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/15 transition-all duration-150 placeholder:text-slate-400";

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 shadow-sm">
            <p className="text-[12px] text-slate-500 m-0">{label}</p>
            <p className="text-2xl font-extrabold m-0" style={{ color }}>{value}</p>
        </div>
    );
}

export default function TasksTab({ showToast }: TasksTabProps) {
    const [tasks, setTasks] = useState<AppTask[]>([]);
    const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState<'create' | 'edit' | null>(null);
    const [form, setForm] = useState<any>({});
    const [editId, setEditId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [confirmId, setConfirmId] = useState<string | null>(null);

    const load = useCallback(async (status = '') => {
        setLoading(true);
        try {
            const r = await getTasks(status || undefined);
            setTasks(r?.data || []);
        } catch { setTasks([]); }
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
        getTaskAssignees().then(r => setAssignees(r?.data || [])).catch(() => {});
    }, [load]);

    useEffect(() => {
        const t = setTimeout(() => load(statusFilter), 300);
        return () => clearTimeout(t);
    }, [statusFilter, load]);

    const openCreate = () => {
        setForm({ title: '', description: '', priority: 'normal', status: 'pending', assignedToId: '', dueDate: '' });
        setEditId(null);
        setModal('create');
    };

    const openEdit = (t: AppTask) => {
        setForm({
            title: t.title,
            description: t.description || '',
            priority: t.priority,
            status: t.status,
            assignedToId: t.assignedToId || '',
            dueDate: t.dueDate || '',
        });
        setEditId(t.id);
        setModal('edit');
    };

    const handleSave = async () => {
        if (!form.title?.trim()) {
            showToast('عنوان المهمة مطلوب', false);
            return;
        }
        setSaving(true);
        try {
            const payload: any = {
                title: form.title.trim(),
                description: form.description || null,
                priority: form.priority || 'normal',
                status: form.status || 'pending',
                assignedToId: form.assignedToId || null,
                dueDate: form.dueDate || null,
            };
            if (modal === 'create') {
                await createTask(payload);
                showToast('تم إنشاء المهمة بنجاح');
            } else if (editId) {
                await updateTask(editId, payload);
                showToast('تم تحديث المهمة');
            }
            setModal(null);
            load(statusFilter);
        } catch (e: any) {
            showToast(e?.message || 'حدث خطأ', false);
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteTask(id);
            showToast('تم حذف المهمة');
            setConfirmId(null);
            load(statusFilter);
        } catch (e: any) {
            showToast(e?.message || 'فشل الحذف', false);
        }
    };

    const counts = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
    };

    const filtered = statusFilter ? tasks.filter(t => t.status === statusFilter) : tasks;

    const assigneeName = (id?: string | null) => assignees.find(a => a.id === id)?.name || '—';

    return (
        <div>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatBox label="إجمالي المهام" value={counts.total} color="#1E3A8A" />
                <StatBox label="معلّقة" value={counts.pending} color="#d97706" />
                <StatBox label="قيد التنفيذ" value={counts.in_progress} color="#2563eb" />
                <StatBox label="مكتملة" value={counts.completed} color="#16a34a" />
            </div>

            {/* Toolbar */}
            <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="font-cairo select-light px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-[#0f2233] text-sm outline-none focus:border-blue-500/60 appearance-none cursor-pointer transition-all duration-150"
                    >
                        <option value="">كل الحالات</option>
                        <option value="pending">معلّقة</option>
                        <option value="in_progress">قيد التنفيذ</option>
                        <option value="completed">مكتملة</option>
                        <option value="cancelled">ملغاة</option>
                    </select>
                    <span className="text-slate-400 text-[13px]">{filtered.length} مهمة</span>
                </div>
                <button
                    onClick={openCreate}
                    className="font-cairo cursor-pointer px-3.5 py-2 text-[13px] rounded-lg font-semibold text-white transition-all duration-150 border border-blue-600 bg-blue-600 hover:bg-blue-700 shadow-sm"
                >
                    <span className="flex items-center gap-1.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        إضافة مهمة
                    </span>
                </button>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/60">
                                {['العنوان', 'الوصف', 'الأولوية', 'المسؤول', 'تاريخ الاستحقاق', 'الحالة', 'إجراءات'].map(h => (
                                    <th key={h} className="font-cairo px-4 py-3 text-left text-[11px] text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="border-b border-slate-100">
                                        {[1, 2, 3, 4, 5, 6, 7].map(j => (
                                            <td key={j} className="px-4 py-3"><div className="animate-pulse bg-slate-100 rounded-lg h-4 w-full" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-16 text-center text-slate-400">
                                        <p className="m-0">لا توجد مهام</p>
                                    </td>
                                </tr>
                            ) : filtered.map(t => {
                                const pm = PRIORITY_META[t.priority] || PRIORITY_META.normal;
                                const sm = STATUS_META[t.status] || STATUS_META.pending;
                                return (
                                    <tr key={t.id} className="border-b border-slate-100 hover:bg-[#1E3A8A]/[0.03] transition-colors duration-100">
                                        <td className="px-4 py-3 text-[#0f2233] align-middle font-medium">{t.title}</td>
                                        <td className="px-4 py-3 text-slate-500 align-middle max-w-[220px] truncate">{t.description || '—'}</td>
                                        <td className="px-4 py-3 align-middle">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[12px] font-semibold border" style={{ background: pm.bg, color: pm.color, borderColor: `${pm.color}25` }}>
                                                {pm.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 align-middle">{t.assignedToName || assigneeName(t.assignedToId) || '—'}</td>
                                        <td className="px-4 py-3 text-slate-500 align-middle text-[13px]">{t.dueDate || '—'}</td>
                                        <td className="px-4 py-3 align-middle">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[12px] font-semibold border" style={{ background: sm.bg, color: sm.color, borderColor: `${sm.color}25` }}>
                                                {sm.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-middle">
                                            <div className="flex gap-1.5">
                                                <button onClick={() => openEdit(t)} className="font-cairo cursor-pointer px-2.5 py-1 text-xs rounded-lg font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-all duration-150">تعديل</button>
                                                <button onClick={() => setConfirmId(t.id)} className="font-cairo cursor-pointer px-2.5 py-1 text-xs rounded-lg font-semibold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all duration-150">حذف</button>
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
                            <h3 className="font-cairo text-[#0f2233] text-base font-bold m-0">{modal === 'create' ? 'إضافة مهمة جديدة' : 'تعديل المهمة'}</h3>
                            <button onClick={() => setModal(null)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 cursor-pointer transition-colors border-none" aria-label="إغلاق">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <div className="mb-4">
                            <label className="font-cairo block text-[12px] text-slate-500 mb-1.5 font-medium">عنوان المهمة <span className="text-red-500">*</span></label>
                            <input className={inputCls} value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="عنوان المهمة" />
                        </div>
                        <div className="mb-4">
                            <label className="font-cairo block text-[12px] text-slate-500 mb-1.5 font-medium">الوصف</label>
                            <textarea className={`${inputCls} resize-y min-h-[70px]`} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="تفاصيل المهمة..." />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="mb-4">
                                <label className="font-cairo block text-[12px] text-slate-500 mb-1.5 font-medium">الأولوية</label>
                                <select className={`${inputCls} select-light cursor-pointer appearance-none`} value={form.priority || 'normal'} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                    <option value="low">منخفضة</option>
                                    <option value="normal">عادية</option>
                                    <option value="high">عالية</option>
                                    <option value="urgent">عاجلة</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="font-cairo block text-[12px] text-slate-500 mb-1.5 font-medium">الحالة</label>
                                <select className={`${inputCls} select-light cursor-pointer appearance-none`} value={form.status || 'pending'} onChange={e => setForm({ ...form, status: e.target.value })}>
                                    <option value="pending">معلّقة</option>
                                    <option value="in_progress">قيد التنفيذ</option>
                                    <option value="completed">مكتملة</option>
                                    <option value="cancelled">ملغاة</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="font-cairo block text-[12px] text-slate-500 mb-1.5 font-medium">المسؤول</label>
                                <select className={`${inputCls} select-light cursor-pointer appearance-none`} value={form.assignedToId || ''} onChange={e => setForm({ ...form, assignedToId: e.target.value })}>
                                    <option value="">بدون تعيين</option>
                                    {assignees.map(a => (
                                        <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="font-cairo block text-[12px] text-slate-500 mb-1.5 font-medium">تاريخ الاستحقاق</label>
                                <input className={inputCls} type="date" value={form.dueDate || ''} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                            </div>
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
                                <p className="font-cairo text-slate-500 text-sm leading-relaxed m-0">هل أنت متأكد من حذف هذه المهمة؟</p>
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
