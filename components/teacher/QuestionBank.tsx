import React, { useState, useEffect } from 'react';
import {
    fetchBankQuestions, createBankQuestion, updateBankQuestion, deleteBankQuestion, buildExamFromBank,
    BankQuestion,
} from '../../api/questionBank.api';
import { fetchTeacherSubjects } from '../../api/teacher.api';
import { useToast } from '../../contexts/ToastContext';

interface SubjectOption {
    id: string;
    title?: string;
    name?: string;
    levels?: { id: string; title: string }[];
}

interface QuestionForm {
    text: string;
    options: string[];
    correctAnswer: number;
    points: number;
    subjectId: string;
    levelId: string;
}

const emptyForm = (): QuestionForm => ({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    points: 1,
    subjectId: '',
    levelId: '',
});

const inputCls = "w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#0f2233] outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition font-cairo placeholder:text-slate-400 disabled:opacity-50 disabled:bg-slate-50";

const QuestionBank: React.FC = () => {
    const { showToast } = useToast();

    const [questions, setQuestions] = useState<BankQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<SubjectOption[]>([]);

    const [selectedSubject, setSelectedSubject] = useState('');
    const [search, setSearch] = useState('');

    // Selection + build-exam
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [showBuild, setShowBuild] = useState(false);
    const [buildTitle, setBuildTitle] = useState('');
    const [buildDuration, setBuildDuration] = useState(15);
    const [building, setBuilding] = useState(false);

    // Add/Edit modal
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<BankQuestion | null>(null);
    const [form, setForm] = useState<QuestionForm>(emptyForm());
    const [saving, setSaving] = useState(false);

    const loadQuestions = async () => {
        setLoading(true);
        try {
            setQuestions(await fetchBankQuestions({ subjectId: selectedSubject || undefined, search: search.trim() || undefined }));
        } catch { showToast('فشل تحميل بنك الأسئلة', 'error'); }
        setLoading(false);
    };

    const loadSubjects = async () => {
        try {
            const list = await fetchTeacherSubjects();
            setSubjects(list as SubjectOption[]);
        } catch { /* keep empty filter */ }
    };

    useEffect(() => { loadSubjects(); }, []);
    useEffect(() => { loadQuestions(); }, [selectedSubject]);

    const applySearch = () => loadQuestions();

    const toggleSelect = (id: string) => setSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });

    const toggleAll = () => {
        setSelected(prev => prev.size === questions.length
            ? new Set()
            : new Set(questions.map(q => q.id)));
    };

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm());
        setShowForm(true);
    };

    const openEdit = (q: BankQuestion) => {
        setEditing(q);
        setForm({
            text: q.text,
            options: q.options?.length === 4 ? q.options : ['', '', '', ''],
            correctAnswer: q.correctAnswer,
            points: q.points ?? 1,
            subjectId: q.subjectId ?? '',
            levelId: q.levelId ?? '',
        });
        setShowForm(true);
    };

    const setFormField = (field: keyof QuestionForm, value: string | number) =>
        setForm(prev => ({ ...prev, [field]: value }));

    const setOption = (idx: number, value: string) =>
        setForm(prev => ({ ...prev, options: prev.options.map((o, j) => j === idx ? value : o) }));

    const handleSave = async () => {
        if (!form.text.trim()) { showToast('يرجى إدخال نص السؤال', 'error'); return; }
        if (form.options.some(o => !o.trim())) { showToast('يرجى تعبئة جميع الخيارات الأربعة', 'error'); return; }
        const payload = {
            text: form.text.trim(),
            options: form.options.map(o => o.trim()),
            correctAnswer: form.correctAnswer,
            points: form.points > 0 ? form.points : 1,
            subjectId: form.subjectId || undefined,
            levelId: form.levelId || undefined,
        };
        setSaving(true);
        try {
            if (editing) { await updateBankQuestion(editing.id, payload); showToast('تم تحديث السؤال', 'success'); }
            else { await createBankQuestion(payload); showToast('تمت إضافة السؤال إلى البنك', 'success'); }
            setShowForm(false);
            loadQuestions();
        } catch { showToast(editing ? 'فشل تحديث السؤال' : 'فشل إضافة السؤال', 'error'); }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteBankQuestion(id);
            showToast('تم حذف السؤال من البنك', 'success');
            setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
            loadQuestions();
        } catch { showToast('فشل حذف السؤال', 'error'); }
    };

    const handleBuild = async () => {
        if (!buildTitle.trim()) { showToast('يرجى إدخال عنوان الاختبار', 'error'); return; }
        if (selected.size === 0) { showToast('اختر سؤالاً واحداً على الأقل', 'error'); return; }
        setBuilding(true);
        try {
            await buildExamFromBank({
                title: buildTitle.trim(),
                durationMinutes: buildDuration > 0 ? buildDuration : 15,
                subjectId: selectedSubject || undefined,
                questionIds: Array.from(selected),
            });
            showToast('تم إنشاء الاختبار من بنك الأسئلة', 'success');
            setShowBuild(false);
            setBuildTitle('');
            setSelected(new Set());
        } catch { showToast('فشل إنشاء الاختبار', 'error'); }
        setBuilding(false);
    };

    const selectedLevels = subjects.find(s => s.id === form.subjectId)?.levels ?? [];
    const subjectLabel = (s: SubjectOption) => s.title || s.name || '';

    return (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-[#1E3A8A]/5 transition-shadow duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 15h6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <h2 className="text-[17px] font-extrabold text-[#0f2233] m-0 font-cairo">بنك الأسئلة</h2>
                </div>
                <button onClick={openCreate}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 text-[13px] font-semibold hover:bg-amber-100 transition-colors duration-200 cursor-pointer font-cairo">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    إضافة سؤال
                </button>
            </div>

            <div className="p-4">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 mb-5">
                    <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
                        className={`${inputCls} cursor-pointer`}>
                        <option value="">كل المواد</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{subjectLabel(s)}</option>)}
                    </select>
                    <div className="flex-1 flex gap-2">
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') applySearch(); }}
                            placeholder="ابحث في الأسئلة..."
                            className={`${inputCls} flex-1`} />
                        <button onClick={applySearch}
                            className="px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-200 transition-colors duration-200 cursor-pointer font-cairo">
                            بحث
                        </button>
                    </div>
                </div>

                {/* Build bar */}
                {selected.size > 0 && (
                    <div className="flex flex-wrap items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-5">
                        <span className="text-sm text-amber-700 font-bold font-cairo">تم اختيار {selected.size} سؤال</span>
                        <button onClick={toggleAll}
                            className="text-xs text-slate-500 hover:text-[#0f2233] cursor-pointer bg-transparent border-none font-cairo underline">
                            إلغاء التحديد
                        </button>
                        <button onClick={() => setShowBuild(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#d97706] border-none text-white text-[13px] font-bold cursor-pointer hover:opacity-90 transition-opacity duration-200 font-cairo shadow-lg shadow-amber-500/20">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" strokeLinecap="round" strokeLinejoin="round"/><rect x="9" y="3" width="6" height="4" rx="1" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            إنشاء امتحان من المحدد
                        </button>
                    </div>
                )}

                {/* List */}
                {loading ? (
                    <div className="text-center py-14">
                        <div className="w-10 h-10 rounded-full border-[3px] border-amber-500/15 border-t-amber-500 animate-spin mx-auto" />
                    </div>
                ) : questions.length === 0 ? (
                    <div className="text-center py-14 px-5">
                        <div className="w-16 h-16 rounded-[18px] bg-amber-50 flex items-center justify-center mx-auto mb-4">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5">
                                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" strokeLinecap="round" strokeLinejoin="round"/>
                                <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <h3 className="text-[17px] font-bold text-[#0f2233] mb-2 font-cairo">لا توجد أسئلة في البنك</h3>
                        <p className="text-[13px] text-slate-500 font-cairo">اضغط "إضافة سؤال" لإضافة أول سؤال</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2 mb-2.5 px-1">
                            <button onClick={toggleAll}
                                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#0f2233] cursor-pointer bg-transparent border-none font-cairo">
                                <span className={[
                                    'w-4 h-4 rounded border flex items-center justify-center transition',
                                    selected.size === questions.length ? 'bg-amber-500 border-amber-500' : 'border-slate-300',
                                ].join(' ')}>
                                    {selected.size === questions.length && (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    )}
                                </span>
                                تحديد الكل
                            </button>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                            {questions.map(q => {
                                const isSel = selected.has(q.id);
                                return (
                                    <div key={q.id} className={[
                                        'bg-white border rounded-2xl p-4 transition-all duration-200',
                                        isSel ? 'border-amber-400/70 bg-amber-50' : 'border-slate-200/80 hover:border-amber-400/40 hover:bg-amber-50/40',
                                    ].join(' ')}>
                                        <div className="flex items-start gap-2.5">
                                            <button onClick={() => toggleSelect(q.id)}
                                                className={[
                                                    'w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition cursor-pointer',
                                                    isSel ? 'bg-amber-500 border-amber-500' : 'border-slate-300 hover:border-amber-500/60',
                                                ].join(' ')}>
                                                {isSel && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[14px] font-bold text-[#0f2233] mb-2 font-cairo">{q.text}</p>
                                                <div className="space-y-1.5 mb-3">
                                                    {q.options.map((opt, j) => (
                                                        <div key={j} className="flex items-center gap-2 text-[12px] font-cairo">
                                                            <span className={[
                                                                'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                                                                j === q.correctAnswer ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500',
                                                            ].join(' ')}>{j + 1}</span>
                                                            <span className={j === q.correctAnswer ? 'text-emerald-600' : 'text-slate-500'}>{opt}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                                    <span className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1 font-bold font-cairo">{q.points ?? 1} درجة</span>
                                                    {q.subjectName && <span className="text-[11px] text-sky-600 bg-sky-50 rounded-lg px-2.5 py-1 font-bold font-cairo">{q.subjectName}</span>}
                                                    {q.levelName && <span className="text-[11px] text-slate-500 bg-slate-100 rounded-lg px-2.5 py-1 font-bold font-cairo">{q.levelName}</span>}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1.5 shrink-0">
                                                <button onClick={() => openEdit(q)}
                                                    className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 transition-colors duration-200 cursor-pointer">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                </button>
                                                <button onClick={() => handleDelete(q.id)}
                                                    className="p-2 rounded-lg bg-red-50 border border-red-100 text-[#DC2626] hover:bg-red-100 transition-colors duration-200 cursor-pointer">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Add/Edit modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setShowForm(false)}>
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-base font-bold text-[#0f2233] font-cairo">{editing ? 'تعديل السؤال' : 'إضافة سؤال إلى البنك'}</h3>
                            <button onClick={() => !saving && setShowForm(false)} className="text-slate-400 hover:text-[#0f2233] cursor-pointer bg-transparent border-none p-1">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                            </button>
                        </div>

                        <label className="block text-xs text-slate-500 mb-1.5 font-cairo">نص السؤال</label>
                        <input value={form.text} onChange={e => setFormField('text', e.target.value)}
                            placeholder="اكتب نص السؤال..."
                            className={`${inputCls} mb-4`} />

                        <label className="block text-xs text-slate-500 mb-1.5 font-cairo">الخيارات (حدد الإجابة الصحيحة)</label>
                        <div className="space-y-2 mb-4">
                            {form.options.map((opt, oi) => (
                                <div key={oi} className="flex items-center gap-2">
                                    <input type="radio" name="qbank-correct" checked={form.correctAnswer === oi}
                                        onChange={() => setFormField('correctAnswer', oi)}
                                        className="accent-amber-500 cursor-pointer shrink-0" title="الإجابة الصحيحة" />
                                    <span className="text-xs text-slate-500 w-4 font-cairo shrink-0">{oi + 1}</span>
                                    <input value={opt} onChange={e => setOption(oi, e.target.value)}
                                        placeholder={`الخيار ${oi + 1}`}
                                        className={`${inputCls} flex-1 !py-2`} />
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
                            <div>
                                <label className="block text-xs text-slate-500 mb-1.5 font-cairo">الدرجة</label>
                                <input type="number" value={form.points} onChange={e => setFormField('points', Number(e.target.value))}
                                    min={1} className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1.5 font-cairo">المادة</label>
                                <select value={form.subjectId} onChange={e => { setFormField('subjectId', e.target.value); setFormField('levelId', ''); }}
                                    className={`${inputCls} cursor-pointer`}>
                                    <option value="">بدون مادة</option>
                                    {subjects.map(s => <option key={s.id} value={s.id}>{subjectLabel(s)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1.5 font-cairo">المستوى</label>
                                <select value={form.levelId} onChange={e => setFormField('levelId', e.target.value)}
                                    disabled={!form.subjectId || selectedLevels.length === 0}
                                    className={`${inputCls} cursor-pointer`}>
                                    <option value="">بدون مستوى</option>
                                    {selectedLevels.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-5">
                            <button onClick={() => !saving && setShowForm(false)}
                                className="flex-1 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-200 transition-colors duration-200 cursor-pointer font-cairo">
                                إلغاء
                            </button>
                            <button onClick={handleSave} disabled={saving}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#d97706] border-none text-white text-[13px] font-bold hover:opacity-90 transition-opacity duration-200 cursor-pointer font-cairo disabled:opacity-50 shadow-lg shadow-amber-500/20">
                                {saving ? 'جاري الحفظ...' : 'حفظ السؤال'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Build exam modal */}
            {showBuild && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !building && setShowBuild(false)}>
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-bold text-[#0f2233] mb-4 font-cairo">إنشاء امتحان من بنك الأسئلة</h3>
                        <p className="text-xs text-slate-500 mb-4 font-cairo">تم اختيار {selected.size} سؤال - سيتم نسخها كاملة إلى الامتحان الجديد.</p>
                        <label className="block text-xs text-slate-500 mb-1.5 font-cairo">عنوان الامتحان</label>
                        <input value={buildTitle} onChange={e => setBuildTitle(e.target.value)}
                            placeholder="مثال: امتحان الوحدة الأولى"
                            className={`${inputCls} mb-3`} />
                        <label className="block text-xs text-slate-500 mb-1.5 font-cairo">المدة (دقائق)</label>
                        <input type="number" value={buildDuration} onChange={e => setBuildDuration(Number(e.target.value))}
                            min={1} className={`${inputCls} mb-5`} />
                        <div className="flex gap-2">
                            <button onClick={() => !building && setShowBuild(false)}
                                className="flex-1 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-200 transition-colors duration-200 cursor-pointer font-cairo">
                                إلغاء
                            </button>
                            <button onClick={handleBuild} disabled={building || !buildTitle.trim()}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-700 border-none text-white text-[13px] font-bold hover:opacity-90 transition-opacity duration-200 cursor-pointer font-cairo disabled:opacity-50">
                                {building ? 'جاري الإنشاء...' : 'إنشاء الامتحان'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionBank;