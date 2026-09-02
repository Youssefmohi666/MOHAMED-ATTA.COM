import React, { useState, useEffect, useCallback } from 'react';
import {
    fetchStudentGroups, createStudentGroup, updateStudentGroup, deleteStudentGroup,
    addGroupMembers, removeGroupMember, getAvailableStudents,
    StudentGroup, StudentGroupMember,
} from '../../api/teacher.api';
import { fetchTeacherSubjects } from '../../api/teacher.api';
import { useToast } from '../../contexts/ToastContext';

interface SubjectOption {
    id: string;
    title?: string;
    name?: string;
}

const inputCls = "w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#0f2233] outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition font-cairo placeholder:text-slate-400 disabled:opacity-50 disabled:bg-slate-50";

const colorOptions = [
    { value: '#6366f1', label: 'بنفسجي' },
    { value: '#22c55e', label: 'أخضر' },
    { value: '#f59e0b', label: 'برتقالي' },
    { value: '#ef4444', label: 'أحمر' },
    { value: '#06b6d4', label: 'سماوي' },
    { value: '#ec4899', label: 'وردي' },
];

const StudentGroupsTab: React.FC = () => {
    const { showToast } = useToast();

    const [groups, setGroups] = useState<StudentGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<SubjectOption[]>([]);

    // Create/Edit modal
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<StudentGroup | null>(null);
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formSubject, setFormSubject] = useState('');
    const [formColor, setFormColor] = useState('#6366f1');
    const [saving, setSaving] = useState(false);

    // Manage members modal
    const [managing, setManaging] = useState<StudentGroup | null>(null);
    const [available, setAvailable] = useState<StudentGroupMember[]>([]);
    const [search, setSearch] = useState('');
    const [availableLoading, setAvailableLoading] = useState(false);

    const loadGroups = useCallback(async () => {
        setLoading(true);
        try {
            setGroups(await fetchStudentGroups());
        } catch {
            showToast('فشل تحميل المجموعات', 'error');
        }
        setLoading(false);
    }, [showToast]);

    const loadSubjects = async () => {
        try {
            const list = await fetchTeacherSubjects();
            setSubjects(list as SubjectOption[]);
        } catch { /* keep empty */ }
    };

    useEffect(() => { loadGroups(); loadSubjects(); }, [loadGroups]);

    const openCreate = () => {
        setEditing(null);
        setFormName('');
        setFormDesc('');
        setFormSubject('');
        setFormColor('#6366f1');
        setShowForm(true);
    };

    const openEdit = (g: StudentGroup) => {
        setEditing(g);
        setFormName(g.name);
        setFormDesc(g.description ?? '');
        setFormSubject(g.subjectId ?? '');
        setFormColor(g.color || '#6366f1');
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!formName.trim()) {
            showToast('اسم المجموعة مطلوب', 'error');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                name: formName.trim(),
                description: formDesc.trim() || undefined,
                subjectId: formSubject || (editing ? null : undefined),
                color: formColor,
            };
            if (editing) await updateStudentGroup(editing.id, payload);
            else await createStudentGroup(payload);
            showToast(editing ? 'تم تحديث المجموعة' : 'تم إنشاء المجموعة', 'success');
            setShowForm(false);
            await loadGroups();
        } catch (e: any) {
            showToast(e?.message || 'حدث خطأ', 'error');
        }
        setSaving(false);
    };

    const handleDelete = async (g: StudentGroup) => {
        if (!window.confirm(`حذف مجموعة «${g.name}»؟ سيتم إزالة جميع طلابها.`)) return;
        try {
            await deleteStudentGroup(g.id);
            showToast('تم حذف المجموعة', 'success');
            await loadGroups();
        } catch (e: any) {
            showToast(e?.message || 'حدث خطأ', 'error');
        }
    };

    const openManage = async (g: StudentGroup) => {
        setManaging(g);
        setSearch('');
        setAvailable([]);
        await loadAvailable('');
    };

    const loadAvailable = async (term: string) => {
        setAvailableLoading(true);
        try {
            const json = await getAvailableStudents(term);
            setAvailable(json.data ?? []);
        } catch {
            setAvailable([]);
        }
        setAvailableLoading(false);
    };

    const applySearch = () => loadAvailable(search.trim());

    const isMember = (studentId: string) =>
        managing?.members?.some(m => m.studentId === studentId) ?? false;

    const handleAdd = async (studentId: string) => {
        if (!managing) return;
        try {
            const res: any = await addGroupMembers(managing.id, [studentId]);
            showToast(res?.added ? `تمت إضافة ${res.added} طالب` : 'تمت الإضافة', 'success');
            await loadGroups();
            setManaging((await fetchStudentGroups()).find(g => g.id === managing.id) ?? null);
        } catch (e: any) {
            showToast(e?.message || 'حدث خطأ', 'error');
        }
    };

    const handleRemove = async (studentId: string) => {
        if (!managing) return;
        try {
            await removeGroupMember(managing.id, studentId);
            showToast('تمت إزالة الطالب', 'success');
            await loadGroups();
            setManaging((await fetchStudentGroups()).find(g => g.id === managing.id) ?? null);
        } catch (e: any) {
            showToast(e?.message || 'حدث خطأ', 'error');
        }
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="relative overflow-hidden bg-[#121f36] border border-white/[0.06] rounded-3xl p-6 sm:p-7">
                <div className="absolute top-0 left-0 w-52 h-52 rounded-full bg-[#1E3A8A]/25 -translate-x-16 -translate-y-16" />
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-lg sm:text-xl font-black text-slate-100 font-cairo m-0">مجموعات الطلاب</h1>
                        <p className="text-sm text-slate-400/90 mt-1.5 m-0 leading-relaxed">
                            نظّم طلابك في مجموعات حسب المادة أو المستوى، وسهّل إدارة الحضور والنتائج والتواصل معهم.
                        </p>
                    </div>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 bg-gradient-to-r from-[#f59e0b] to-[#d97706] border-none rounded-xl px-5 py-2.5 text-white text-sm font-extrabold cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-200 font-cairo shrink-0"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        مجموعة جديدة
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-14 text-slate-400 font-cairo">جارٍ التحميل...</div>
            ) : groups.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center">
                    <div className="text-5xl mb-3">👥</div>
                    <p className="text-[#0f2233] font-bold font-cairo mb-1">لا توجد مجموعات بعد</p>
                    <p className="text-sm text-slate-500 font-cairo">أنشئ مجموعتك الأولى لتنظيم طلابك بسهولة.</p>
                    <button onClick={openCreate} className="mt-4 inline-flex items-center gap-2 bg-[#1E3A8A] border-none rounded-xl px-5 py-2.5 text-white text-sm font-bold cursor-pointer hover:bg-[#16306e] transition-colors font-cairo">
                        إنشاء مجموعة
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {groups.map(g => (
                        <div key={g.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden hover:shadow-lg hover:shadow-slate-200/70 transition-shadow">
                            <div className="h-1.5" style={{ background: g.color || '#6366f1' }} />
                            <div className="p-5">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <h3 className="text-base font-extrabold text-[#0f2233] font-cairo truncate m-0">{g.name}</h3>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            {g.subjectName && (
                                                <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-600 rounded-full px-2 py-0.5 font-semibold font-cairo">
                                                    {g.subjectName}
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 font-semibold font-cairo">
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                                                {g.memberCount} طالب
                                            </span>
                                        </div>
                                    </div>
                                    <span className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ background: g.color || '#6366f1' }} />
                                </div>

                                {g.description && (
                                    <p className="text-sm text-slate-500 mt-2.5 font-cairo m-0 line-clamp-2">{g.description}</p>
                                )}

                                {/* Members preview */}
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {g.members.slice(0, 4).map(m => (
                                        <span key={m.studentId} className="text-[11px] bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-slate-600 font-semibold font-cairo">
                                            {m.studentName}
                                        </span>
                                    ))}
                                    {g.memberCount > 4 && (
                                        <span className="text-[11px] bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-slate-400 font-semibold font-cairo">
                                            +{g.memberCount - 4}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                                    <button
                                        onClick={() => openManage(g)}
                                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#1E3A8A]/10 text-[#1E3A8A] border-none rounded-xl px-3 py-2 text-xs font-bold cursor-pointer hover:bg-[#1E3A8A]/20 transition-colors font-cairo"
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>
                                        إدارة الطلاب
                                    </button>
                                    <button
                                        onClick={() => openEdit(g)}
                                        className="flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors"
                                        title="تعديل"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(g)}
                                        className="flex items-center justify-center bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-red-500 cursor-pointer hover:bg-red-100 transition-colors"
                                        title="حذف"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-extrabold text-[#0f2233] font-cairo m-0">
                                {editing ? 'تعديل المجموعة' : 'مجموعة جديدة'}
                            </h3>
                            <button onClick={() => setShowForm(false)} className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500 cursor-pointer hover:bg-slate-200 transition-colors border-none">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-[#0f2233] font-cairo mb-1.5">اسم المجموعة *</label>
                                <input className={inputCls} value={formName} onChange={e => setFormName(e.target.value)} placeholder="مثال: مجموعة التفوق" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[#0f2233] font-cairo mb-1.5">وصف مختصر</label>
                                <textarea className={inputCls} rows={2} value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="وصف اختياري للمجموعة" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[#0f2233] font-cairo mb-1.5">المادة (اختياري)</label>
                                <select className={inputCls} value={formSubject} onChange={e => setFormSubject(e.target.value)}>
                                    <option value="">بدون مادة</option>
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.title || s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[#0f2233] font-cairo mb-1.5">اللون</label>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {colorOptions.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setFormColor(c.value)}
                                            className={`flex items-center gap-1.5 border ${formColor === c.value ? 'ring-2 ring-offset-1 border-slate-900' : 'border-slate-200'} rounded-xl px-3 py-1.5 text-xs font-semibold font-cairo cursor-pointer transition-all`}
                                            style={{ background: c.value + '14', color: c.value }}
                                        >
                                            <span className="w-3 h-3 rounded-full" style={{ background: c.value }} />
                                            {c.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#f59e0b] to-[#d97706] border-none rounded-xl px-4 py-2.5 text-white text-sm font-extrabold cursor-pointer hover:shadow-lg hover:shadow-amber-500/30 transition-all font-cairo disabled:opacity-50"
                                >
                                    {saving ? 'جارٍ الحفظ...' : editing ? 'حفظ التعديلات' : 'إنشاء المجموعة'}
                                </button>
                                <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold cursor-pointer hover:bg-slate-200 transition-colors border-none font-cairo">
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage members modal */}
            {managing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setManaging(null)}>
                    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <div>
                                <h3 className="text-lg font-extrabold text-[#0f2233] font-cairo m-0">إدارة طلاب «{managing.name}»</h3>
                                <p className="text-xs text-slate-500 font-cairo mt-0.5 m-0">{managing.memberCount} طالب مسجل</p>
                            </div>
                            <button onClick={() => setManaging(null)} className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500 cursor-pointer hover:bg-slate-200 transition-colors border-none">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>

                        <div className="p-5 border-b border-slate-100 bg-slate-50/60">
                            <label className="block text-sm font-bold text-[#0f2233] font-cairo mb-1.5">إضافة طلاب</label>
                            <div className="flex gap-2">
                                <input
                                    className={inputCls}
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') applySearch(); }}
                                    placeholder="ابحث بالاسم أو البريد أو الهاتف..."
                                />
                                <button onClick={applySearch} className="bg-[#1E3A8A] border-none rounded-xl px-4 text-white text-sm font-bold cursor-pointer hover:bg-[#16306e] transition-colors font-cairo">
                                    بحث
                                </button>
                            </div>
                            <div className="mt-3 max-h-40 overflow-y-auto">
                                {availableLoading ? (
                                    <div className="text-center py-3 text-xs text-slate-400 font-cairo">جارٍ البحث...</div>
                                ) : available.length === 0 ? (
                                    <div className="text-center py-3 text-xs text-slate-400 font-cairo">
                                        {search ? 'لا توجد نتائج' : 'لا يوجد طلاب متاحون (أضف طلاباً إلى موادك أولاً)'}
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        {available.filter(s => !isMember(s.studentId)).map(s => (
                                            <div key={s.studentId} className="flex items-center justify-between bg-white border border-slate-100 rounded-xl px-3 py-2">
                                                <div className="min-w-0">
                                                    <div className="text-sm font-bold text-[#0f2233] font-cairo truncate">{s.studentName}</div>
                                                    <div className="text-xs text-slate-500 font-cairo truncate">{s.studentEmail || s.phoneNumber || ''}</div>
                                                </div>
                                                {isMember(s.studentId) ? (
                                                    <span className="text-[11px] text-emerald-600 font-bold font-cairo shrink-0">مسجل ✓</span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleAdd(s.studentId)}
                                                        className="flex items-center gap-1 bg-[#1E3A8A]/10 text-[#1E3A8A] border-none rounded-lg px-2.5 py-1.5 text-xs font-bold cursor-pointer hover:bg-[#1E3A8A]/20 transition-colors font-cairo shrink-0"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
                                                        إضافة
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5">
                            <label className="block text-sm font-bold text-[#0f2233] font-cairo mb-2">الطلاب المسجلون ({managing.memberCount})</label>
                            {managing.members.length === 0 ? (
                                <div className="text-center py-6 text-sm text-slate-400 font-cairo">لم يُضف أي طالب بعد</div>
                            ) : (
                                <div className="space-y-1.5">
                                    {managing.members.map(m => (
                                        <div key={m.studentId} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                                            <div className="min-w-0">
                                                <div className="text-sm font-bold text-[#0f2233] font-cairo truncate">{m.studentName}</div>
                                                <div className="text-xs text-slate-500 font-cairo truncate">{m.studentEmail || m.phoneNumber || ''}</div>
                                            </div>
                                            <button
                                                onClick={() => handleRemove(m.studentId)}
                                                className="flex items-center gap-1 bg-red-50 text-red-500 border-none rounded-lg px-2.5 py-1.5 text-xs font-bold cursor-pointer hover:bg-red-100 transition-colors font-cairo shrink-0"
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                                إزالة
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentGroupsTab;