import React, { useState, useEffect } from 'react';
import {
    fetchTeacherExams, generateExam, createExam, deleteExam, fetchExamDetail,
    printExamPdf, fetchTeacherStudents, recordExamGrade, TeacherStudent,
    ExamListItem, ExamDetail, ExamQuestion,
} from '../../api/exams.api';
import { useToast } from '../../contexts/ToastContext';
import { fetchBankQuestions, addBankQuestionsToExam, BankQuestion } from '../../api/questionBank.api';

const inputCls = "w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-[#0f2233] outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition font-cairo placeholder:text-slate-400";

const ExamCard: React.FC<{
    exam: ExamListItem;
    onView: () => void;
    onDelete: () => void;
}> = ({ exam, onView, onDelete }) => {
    const isPublished = exam.status === 'published';
    return (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 transition-all duration-200 hover:border-amber-400/60 hover:shadow-lg hover:shadow-amber-500/5">
            <div className="flex items-start justify-between mb-3.5">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl shrink-0 bg-amber-50 flex items-center justify-center">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" strokeLinecap="round" strokeLinejoin="round"/>
                            <rect x="9" y="3" width="6" height="4" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M9 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-[15px] font-bold text-[#0f2233] m-0 font-cairo overflow-hidden text-ellipsis whitespace-nowrap">{exam.title}</h3>
                    </div>
                </div>
                <span className={[
                    'shrink-0 mr-2 px-2.5 py-0.5 rounded-md text-[11px] font-bold border font-cairo',
                    isPublished ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100',
                ].join(' ')}>
                    {isPublished ? 'منشور' : 'مسودة'}
                </span>
            </div>
            <div className="flex mb-3.5 bg-slate-50 rounded-xl overflow-hidden border border-slate-200/70">
                {[
                    { label: 'أسئلة', value: exam.questionCount, color: 'text-amber-500' },
                    { label: 'دقيقة', value: exam.durationMinutes, color: 'text-sky-600' },
                ].map((m, i, arr) => (
                    <div key={i} className={['flex-1 text-center py-2.5 px-1', i < arr.length - 1 ? 'border-l border-slate-200' : ''].join(' ')}>
                        <div className={`text-[17px] font-extrabold ${m.color}`}>{m.value}</div>
                        <div className="text-[11px] text-slate-500 font-cairo">{m.label}</div>
                    </div>
                ))}
            </div>
            <div className="flex gap-1.5">
                <button onClick={onView}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-sky-50 border border-sky-100 text-sky-700 text-[13px] font-semibold hover:bg-sky-100 transition-colors duration-200 cursor-pointer font-cairo">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                    عرض
                </button>
                <button onClick={onDelete}
                    className="p-2 rounded-xl bg-red-50 border border-red-100 text-[#DC2626] hover:bg-red-100 transition-colors duration-200 cursor-pointer shrink-0">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
            </div>
        </div>
    );
};

const ExamViewer: React.FC = () => {
    const { showToast } = useToast();
    const [exams, setExams] = useState<ExamListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [viewDetail, setViewDetail] = useState<ExamDetail | null>(null);
    const [showManual, setShowManual] = useState(false);

    const [topic, setTopic] = useState('');
    const [questionCount, setQuestionCount] = useState(5);
    const [duration, setDuration] = useState(15);

    const [newTitle, setNewTitle] = useState('');
    const [newQuestions, setNewQuestions] = useState<ExamQuestion[]>([
        { id: 0, text: '', options: ['', '', '', ''], correctAnswer: 0, points: 1 },
    ]);

    const [showGrade, setShowGrade] = useState(false);
    const [students, setStudents] = useState<TeacherStudent[]>([]);
    const [selectedStudent, setSelectedStudent] = useState('');
    const [gradeScore, setGradeScore] = useState('');
    const [grading, setGrading] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');

    const [showBank, setShowBank] = useState(false);
    const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
    const [bankLoading, setBankLoading] = useState(false);
    const [bankSelected, setBankSelected] = useState<Set<string>>(new Set());
    const [bankAdding, setBankAdding] = useState(false);

    const loadExams = async () => {
        setLoading(true);
        try { setExams(await fetchTeacherExams()); }
        catch { showToast('فشل تحميل الاختبارات', 'error'); }
        setLoading(false);
    };
    useEffect(() => { loadExams(); }, []);

    const handleGenerate = async () => {
        if (!topic.trim()) { showToast('يرجى إدخال موضوع الاختبار', 'error'); return; }
        setGenerating(true);
        try {
            await generateExam({ topic, questionCount, durationMinutes: duration, language: 'ar' });
            showToast('تم إنشاء الاختبار بنجاح', 'success');
            setTopic('');
            loadExams();
        } catch { showToast('فشل إنشاء الاختبار', 'error'); }
        setGenerating(false);
    };

    const handleCreate = async () => {
        if (!newTitle.trim()) { showToast('يرجى إدخال عنوان الاختبار', 'error'); return; }
        const validQ = newQuestions.filter(q => q.text.trim());
        if (validQ.length === 0) { showToast('يرجى إضافة سؤال واحد على الأقل', 'error'); return; }
        try {
            await createExam({ title: newTitle, durationMinutes: duration, questions: validQ });
            showToast('تم حفظ الاختبار بنجاح', 'success');
            setShowManual(false);
            setNewTitle('');
            setNewQuestions([{ id: 0, text: '', options: ['', '', '', ''], correctAnswer: 0, points: 1 }]);
            loadExams();
        } catch { showToast('فشل حفظ الاختبار', 'error'); }
    };

    const handleDelete = async (id: string) => {
        try { await deleteExam(id); showToast('تم حذف الاختبار', 'success'); loadExams(); }
        catch { showToast('فشل حذف الاختبار', 'error'); }
    };

    const handleView = async (id: string) => {
        try { setViewDetail(await fetchExamDetail(id)); }
        catch { showToast('فشل تحميل تفاصيل الاختبار', 'error'); }
    };

    const handlePrint = async (id: string) => {
        setPrinting(true);
        try { await printExamPdf(id); }
        catch { showToast('تعذر فتح نسخة الطباعة', 'error'); }
        setPrinting(false);
    };

    const openGrade = async () => {
        setShowGrade(true);
        setStudentSearch('');
        setSelectedStudent('');
        setGradeScore('');
        try { setStudents(await fetchTeacherStudents('')); }
        catch { showToast('فشل تحميل قائمة الطلاب', 'error'); }
    };

    const loadStudentsSearch = async (q: string) => {
        setStudentSearch(q);
        try { setStudents(await fetchTeacherStudents(q)); }
        catch { /* ignore */ }
    };

    const submitGrade = async () => {
        if (!selectedStudent) { showToast('يرجى اختيار الطالب', 'error'); return; }
        const score = Number(gradeScore);
        if (isNaN(score) || score < 0) { showToast('يرجى إدخال درجة صحيحة', 'error'); return; }
        if (!viewDetail) return;
        setGrading(true);
        try {
            await recordExamGrade(viewDetail.id, { studentId: selectedStudent, score });
            showToast('تم تسجيل درجة الطالب (حضوري) بنجاح', 'success');
            setShowGrade(false);
        } catch { showToast('فشل تسجيل الدرجة', 'error'); }
        setGrading(false);
    };

    const openBank = async () => {
        setShowBank(true);
        setBankSelected(new Set());
        setBankLoading(true);
        try { setBankQuestions(await fetchBankQuestions()); }
        catch { showToast('فشل تحميل بنك الأسئلة', 'error'); }
        setBankLoading(false);
    };

    const toggleBankQuestion = (id: string) => setBankSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const submitAddBank = async () => {
        if (bankSelected.size === 0) { showToast('اختر سؤالاً واحداً على الأقل', 'error'); return; }
        if (!viewDetail) return;
        setBankAdding(true);
        try {
            await addBankQuestionsToExam(viewDetail.id, Array.from(bankSelected));
            showToast('تمت إضافة الأسئلة إلى الاختبار', 'success');
            setShowBank(false);
            handleView(viewDetail.id);
        } catch { showToast('فشل إضافة الأسئلة', 'error'); }
        setBankAdding(false);
    };

    const addQuestion = () => setNewQuestions(prev => [...prev, { id: prev.length, text: '', options: ['', '', '', ''], correctAnswer: 0, points: 1 }]);
    const updateQuestion = (idx: number, field: string, value: any) => setNewQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
    const updateOption = (qIdx: number, oIdx: number, value: string) => setNewQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: q.options.map((o, j) => j === oIdx ? value : o) } : q));
    const removeQuestion = (idx: number) => { if (newQuestions.length > 1) setNewQuestions(prev => prev.filter((_, i) => i !== idx)); };

    if (viewDetail) {
        return (
            <div className="max-w-4xl mx-auto">
                <button onClick={() => setViewDetail(null)}
                    className="flex items-center gap-1.5 text-slate-500 hover:text-[#0f2233] text-sm mb-4 cursor-pointer bg-transparent border-none font-cairo">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    العودة إلى القائمة
                </button>
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 hover:shadow-lg hover:shadow-[#1E3A8A]/5 transition-shadow duration-200">
                    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                        <h2 className="text-xl font-bold text-[#0f2233] font-cairo">{viewDetail.title}</h2>
                        <div className="flex gap-3 text-sm text-slate-500 font-cairo">
                            <span>المدة: {viewDetail.durationMinutes} دقيقة</span>
                            <span>الدرجة: {viewDetail.totalPoints}</span>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 mb-5">
                        <button onClick={() => handlePrint(viewDetail.id)} disabled={printing}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 text-[13px] font-semibold hover:bg-amber-100 transition-colors duration-200 cursor-pointer font-cairo disabled:opacity-50">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" strokeLinecap="round" strokeLinejoin="round"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
                            {printing ? 'جاري التحضير...' : 'طباعة / نسخة PDF'}
                        </button>
                        <button onClick={openBank}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-sky-50 border border-sky-100 text-sky-700 text-[13px] font-semibold hover:bg-sky-100 transition-colors duration-200 cursor-pointer font-cairo">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="3" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 11l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            إضافة من بنك الأسئلة
                        </button>
                        <button onClick={openGrade}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-[13px] font-semibold hover:bg-emerald-100 transition-colors duration-200 cursor-pointer font-cairo">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            تسجيل درجة حضورياً
                        </button>
                    </div>
                    <div className="space-y-4">
                        {viewDetail.questions.map((q, i) => (
                            <div key={q.id} className="bg-slate-50 border border-slate-200/70 rounded-2xl p-5">
                                <p className="text-[15px] font-bold text-[#0f2233] mb-4 font-cairo">{i + 1}. {q.text} <span className="text-amber-600 text-sm font-normal">({q.points} درجات)</span></p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {q.options.map((opt, j) => (
                                        <div key={j} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
                                            <span className="w-7 h-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-bold">{j + 1}</span>
                                            <span className="text-sm text-slate-600 font-cairo">{opt}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {showGrade && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowGrade(false)}>
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                            <h3 className="text-base font-bold text-[#0f2233] mb-4 font-cairo">تسجيل درجة حضورياً</h3>
                            <p className="text-xs text-slate-500 mb-4 font-cairo">
                                الاختبار: {viewDetail.title} · إجمالي الدرجة: {viewDetail.totalPoints}
                            </p>
                            <label className="block text-xs text-slate-500 mb-1.5 font-cairo">البحث عن الطالب</label>
                            <input value={studentSearch} onChange={e => loadStudentsSearch(e.target.value)}
                                placeholder="ابحث بالاسم..."
                                className={`${inputCls} mb-3`} />
                            <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}
                                className={`${inputCls} mb-3 appearance-none cursor-pointer`}>
                                <option value="">-- اختر الطالب --</option>
                                {students.map(s => (
                                    <option key={s.Id} value={s.Id}>{s.Name}</option>
                                ))}
                            </select>
                            <label className="block text-xs text-slate-500 mb-1.5 font-cairo">الدرجة (من {viewDetail.totalPoints})</label>
                            <input type="number" value={gradeScore} onChange={e => setGradeScore(e.target.value)}
                                min={0} max={viewDetail.totalPoints}
                                placeholder="0"
                                className={`${inputCls} mb-5`} />
                            <div className="flex gap-2">
                                <button onClick={() => setShowGrade(false)}
                                    className="flex-1 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-200 transition-colors duration-200 cursor-pointer font-cairo">
                                    إلغاء
                                </button>
                                <button onClick={submitGrade} disabled={grading}
                                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-700 border-none text-white text-[13px] font-bold hover:opacity-90 transition-opacity duration-200 cursor-pointer font-cairo disabled:opacity-50">
                                    {grading ? 'جاري الحفظ...' : 'حفظ الدرجة'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            {showBank && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowBank(false)}>
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-base font-bold text-[#0f2233] font-cairo">إضافة أسئلة من بنك الأسئلة</h3>
                                <button onClick={() => setShowBank(false)} className="text-slate-400 hover:text-[#0f2233] cursor-pointer bg-transparent border-none p-1">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 mb-4 font-cairo">حدد الأسئلة التي تريد إضافتها إلى: {viewDetail.title}</p>
                            <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1">
                                {bankLoading ? (
                                    <div className="text-center py-10">
                                        <div className="w-10 h-10 rounded-full border-[3px] border-amber-500/15 border-t-amber-500 animate-spin mx-auto" />
                                    </div>
                                ) : bankQuestions.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500 text-sm font-cairo">لا توجد أسئلة في البنك</div>
                                ) : bankQuestions.map(q => {
                                    const isSel = bankSelected.has(q.id);
                                    return (
                                        <button key={q.id} onClick={() => toggleBankQuestion(q.id)}
                                            className={[
                                                'w-full flex items-start gap-2.5 bg-white border rounded-xl p-3 text-right cursor-pointer transition-colors duration-200',
                                                isSel ? 'border-amber-400/70 bg-amber-50' : 'border-slate-200 hover:border-amber-400/40 hover:bg-amber-50/40',
                                            ].join(' ')}>
                                            <span className={[
                                                'w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5',
                                                isSel ? 'bg-amber-500 border-amber-500' : 'border-slate-300',
                                            ].join(' ')}>
                                                {isSel && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                            </span>
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-[13px] font-bold text-[#0f2233] mb-1 font-cairo">{q.text}</span>
                                                <span className="flex flex-wrap gap-1.5">
                                                    <span className="text-[10px] text-amber-600 bg-amber-50 rounded px-2 py-0.5 font-bold font-cairo">{q.points ?? 1} درجة</span>
                                                    {q.subjectName && <span className="text-[10px] text-sky-600 bg-sky-50 rounded px-2 py-0.5 font-bold font-cairo">{q.subjectName}</span>}
                                                </span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setShowBank(false)}
                                    className="flex-1 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-200 transition-colors duration-200 cursor-pointer font-cairo">
                                    إلغاء
                                </button>
                                <button onClick={submitAddBank} disabled={bankAdding || bankSelected.size === 0}
                                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#d97706] border-none text-white text-[13px] font-bold hover:opacity-90 transition-opacity duration-200 cursor-pointer font-cairo disabled:opacity-50">
                                    {bankAdding ? 'جاري الإضافة...' : `إضافة (${bankSelected.size})`}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-[#1E3A8A]/5 transition-shadow duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" strokeLinecap="round" strokeLinejoin="round"/>
                        <rect x="9" y="3" width="6" height="4" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <h2 className="text-[17px] font-extrabold text-[#0f2233] m-0 font-cairo">الاختبارات</h2>
                </div>
                <div className="flex gap-2">
                    {!showManual && (
                        <button onClick={() => { setShowManual(true); setTopic(''); }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 text-[13px] font-semibold hover:bg-amber-100 transition-colors duration-200 cursor-pointer font-cairo">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            إنشاء يدوي
                        </button>
                    )}
                    {showManual && (
                        <button onClick={() => setShowManual(false)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-200 transition-colors duration-200 cursor-pointer font-cairo">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            AI
                        </button>
                    )}
                </div>
            </div>

            <div className="p-4">
                {/* AI Generate Form */}
                {!showManual && (
                    <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-5 mb-5">
                        <h3 className="text-[15px] font-bold text-[#0f2233] mb-4 font-cairo">إنشاء اختبار بالذكاء الاصطناعي</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                            <div className="col-span-2">
                                <input value={topic} onChange={e => setTopic(e.target.value)}
                                    placeholder="موضوع الاختبار"
                                    className={`${inputCls} w-full`} />
                            </div>
                            <input type="number" value={questionCount} onChange={e => setQuestionCount(Number(e.target.value))}
                                min={1} max={20} placeholder="عدد الأسئلة"
                                className={inputCls} />
                            <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))}
                                min={1} placeholder="المدة (دقائق)"
                                className={inputCls} />
                        </div>
                        <button onClick={handleGenerate} disabled={generating || !topic.trim()}
                            className="bg-gradient-to-r from-[#f59e0b] to-[#d97706] border-none rounded-xl px-5 py-2.5 text-white text-sm font-bold cursor-pointer font-cairo hover:opacity-90 transition-opacity duration-200 disabled:opacity-50 shadow-lg shadow-amber-500/20">
                            {generating ? 'جاري الإنشاء...' : 'إنشاء الاختبار'}
                        </button>
                    </div>
                )}

                {/* Manual Create Form */}
                {showManual && (
                    <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-5 mb-5">
                        <h3 className="text-[15px] font-bold text-[#0f2233] mb-4 font-cairo">إنشاء اختبار يدوي</h3>
                        <div className="flex gap-3 mb-4">
                            <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                                placeholder="عنوان الاختبار"
                                className={`${inputCls} flex-1`} />
                            <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))}
                                min={1} placeholder="المدة (دقائق)"
                                className={`${inputCls} w-32`} />
                        </div>
                        <div className="space-y-4 mb-4">
                            {newQuestions.map((q, qi) => (
                                <div key={qi} className="bg-white border border-slate-200 rounded-2xl p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-xs text-slate-500 font-bold font-cairo shrink-0">س{qi + 1}</span>
                                        <input value={q.text} onChange={e => updateQuestion(qi, 'text', e.target.value)}
                                            placeholder={`السؤال ${qi + 1}`}
                                            className={`${inputCls} flex-1 !py-2`} />
                                        <input type="number" value={q.points} onChange={e => updateQuestion(qi, 'points', Number(e.target.value))}
                                            min={1} className={`${inputCls} w-16 !py-2 text-center`} title="الدرجة" />
                                        {newQuestions.length > 1 && (
                                            <button onClick={() => removeQuestion(qi)}
                                                className="text-[#DC2626] hover:text-red-700 bg-transparent border-none cursor-pointer p-1">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                                            </button>
                                        )}
                                    </div>
                                    {q.options.map((opt, oi) => (
                                        <div key={oi} className="flex items-center gap-2 mb-1.5">
                                            <input type="radio" name={`correct-${qi}`} checked={q.correctAnswer === oi}
                                                onChange={() => updateQuestion(qi, 'correctAnswer', oi)}
                                                className="accent-amber-500 cursor-pointer shrink-0" />
                                            <span className="text-xs text-slate-500 w-4 font-cairo shrink-0">{oi + 1}</span>
                                            <input value={opt} onChange={e => updateOption(qi, oi, e.target.value)}
                                                placeholder={`الخيار ${oi + 1}`}
                                                className={`${inputCls} flex-1 !py-1.5`} />
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={addQuestion}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 text-[13px] font-semibold hover:bg-amber-100 transition-colors duration-200 cursor-pointer font-cairo">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                إضافة سؤال
                            </button>
                            <button onClick={handleCreate}
                                className="bg-gradient-to-r from-[#f59e0b] to-[#d97706] border-none rounded-xl px-5 py-2.5 text-white text-sm font-bold cursor-pointer font-cairo hover:opacity-90 transition-opacity duration-200 shadow-lg shadow-amber-500/20">
                                حفظ الاختبار
                            </button>
                        </div>
                    </div>
                )}

                {/* Exam list */}
                {loading ? (
                    <div className="text-center py-14">
                        <div className="w-10 h-10 rounded-full border-[3px] border-amber-500/15 border-t-amber-500 animate-spin mx-auto" />
                    </div>
                ) : exams.length === 0 ? (
                    <div className="text-center py-14 px-5">
                        <div className="w-16 h-16 rounded-[18px] bg-amber-50 flex items-center justify-center mx-auto mb-4">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5">
                                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" strokeLinecap="round" strokeLinejoin="round"/>
                                <rect x="9" y="3" width="6" height="4" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M9 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <h3 className="text-[17px] font-bold text-[#0f2233] mb-2 font-cairo">لا توجد اختبارات بعد</h3>
                        <p className="text-[13px] text-slate-500 font-cairo">استخدم النموذج أعلاه لإنشاء أول اختبار</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                        {exams.map(e => (
                            <ExamCard key={e.id} exam={e} onView={() => handleView(e.id)} onDelete={() => handleDelete(e.id)} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExamViewer;