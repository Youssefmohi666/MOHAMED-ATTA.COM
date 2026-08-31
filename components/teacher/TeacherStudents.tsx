import React, { useState, useEffect, useCallback } from 'react';
import {
    fetchTeacherStudents, fetchStudentDetail, analyzeFile, generateReport,
} from '../../api/teacher.api';
import { useToast } from '../../contexts/ToastContext';

interface Student {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    enrolledSubjects: number;
    totalLectures: number;
    watchedLectures: number;
    completedLectures: number;
    progressPercentage: number;
    lastActiveAt?: string | null;
}

interface SubjectProgress {
    subjectId: string;
    subjectName: string;
    totalLectures: number;
    watchedLectures: number;
    completedLectures: number;
    progressPercentage: number;
}

interface StudentDetail {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    enrolledSubjects: number;
    totalLectures: number;
    watchedLectures: number;
    completedLectures: number;
    progressPercentage: number;
    subjects: SubjectProgress[];
}

interface TeacherStudentsProps {
    onNavigate?: (page: string, payload?: any) => void;
}

const formatDate = (iso?: string | null) => {
    if (!iso) return '—';
    try {
        return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(new Date(iso));
    } catch {
        return '—';
    }
};

const ProgressBar: React.FC<{ value: number; color?: string }> = ({ value, color = '#38bdf8' }) => (
    <div style={{ width: '100%', height: '6px', background: '#eef2f7', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.4s ease' }} />
    </div>
);

const TeacherStudents: React.FC<TeacherStudentsProps> = () => {
    const { showToast } = useToast();
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [searching, setSearching] = useState(false);

    const [selected, setSelected] = useState<StudentDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // AI state
    const [aiTab, setAiTab] = useState<'file' | 'report'>('file');
    const [file, setFile] = useState<File | null>(null);
    const [fileContext, setFileContext] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState('');
    const [reportType, setReportType] = useState<'student' | 'subject' | 'class'>('class');
    const [reportContext, setReportContext] = useState('');
    const [generating, setGenerating] = useState(false);
    const [report, setReport] = useState('');

    const loadStudents = useCallback(async (q?: string) => {
        setLoading(true);
        try {
            const data = await fetchTeacherStudents(q);
            setStudents(Array.isArray(data) ? data.map((st: any) => ({
                id: st.id?.toString(),
                name: st.name || 'طالب',
                email: st.email || '',
                avatar: st.avatarUrl || '',
                enrolledSubjects: st.enrolledSubjects ?? 0,
                totalLectures: st.totalLectures ?? 0,
                watchedLectures: st.watchedLectures ?? 0,
                completedLectures: st.completedLectures ?? 0,
                progressPercentage: st.progressPercentage ?? 0,
                lastActiveAt: st.lastActiveAt || null,
            })) : []);
        } catch {
            setStudents([]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadStudents();
    }, [loadStudents]);

    const onSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearching(true);
        loadStudents(search.trim()).finally(() => setSearching(false));
    };

    const openDetail = async (s: Student) => {
        setSelected(null);
        setDetailLoading(true);
        try {
            const detail = await fetchStudentDetail(s.id);
            setSelected(detail);
        } catch {
            showToast('تعذر تحميل تفاصيل الطالب', 'error');
        }
        setDetailLoading(false);
    };

    const onAnalyze = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            showToast('يرجى اختيار ملف لتحليله', 'error');
            return;
        }
        setAnalyzing(true);
        setAnalysis('');
        try {
            const res: any = await analyzeFile(file, fileContext);
            const text = res?.data?.analysis || res?.analysis || '';
            setAnalysis(text);
            if (!text) showToast('لم يتم استلام نتيجة التحليل', 'error');
        } catch (err: any) {
            showToast(err?.message || 'حدث خطأ أثناء تحليل الملف', 'error');
        }
        setAnalyzing(false);
    };

    const onGenerateReport = async (e: React.FormEvent) => {
        e.preventDefault();
        setGenerating(true);
        setReport('');
        try {
            const res: any = await generateReport({
                reportType,
                contextJson: reportContext.trim() ? reportContext : '{}',
            });
            const text = res?.data?.report || res?.report || '';
            setReport(text);
            if (!text) showToast('لم يتم استلام التقرير', 'error');
        } catch (err: any) {
            showToast(err?.message || 'حدث خطأ أثناء توليد التقرير', 'error');
        }
        setGenerating(false);
    };

    return (
        <div style={{ animation: 'fadeIn 0.3s ease' }} className="space-y-5">
            {/* Header + search */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#0f2233', margin: 0, fontFamily: "'Cairo', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    طلابي — متابعة حقيقية
                </h2>
                <form onSubmit={onSearch} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="ابحث بالاسم أو البريد..."
                        style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px', color: '#0f2233', fontSize: '13px', fontFamily: "'Cairo', sans-serif", minWidth: '200px', outline: 'none' }}
                    />
                    <button type="submit" disabled={searching} style={{ background: 'linear-gradient(90deg,#38bdf8,#0ea5e9)', border: 'none', borderRadius: '10px', padding: '8px 14px', color: '#ffffff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: searching ? 0.6 : 1, fontFamily: "'Cairo', sans-serif" }}>
                        بحث
                    </button>
                </form>
            </div>

            {/* Students table */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
                {/* header */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 1.2fr 1.2fr 1fr', padding: '12px 18px', borderBottom: '1px solid #f1f5f9', gap: '12px' }}
                    className="tch-stu-head">
                    {['الطالب', 'المواد المسجلة', 'الدروس المشاهدة', 'المنجزة', 'التقدم'].map(h => (
                        <span key={h} style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', fontFamily: "'Cairo', sans-serif" }}>{h}</span>
                    ))}
                </div>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8', fontFamily: "'Cairo', sans-serif" }}>جاري تحميل الطلاب...</div>
                ) : students.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8', fontFamily: "'Cairo', sans-serif" }}>لا يوجد طلاب مطابقون</div>
                ) : (
                    students.map((st, idx) => (
                        <div key={st.id} onClick={() => openDetail(st)}
                            style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 1.2fr 1.2fr 1fr', padding: '12px 18px', gap: '12px', alignItems: 'center', cursor: 'pointer', borderBottom: idx < students.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.15s' }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(245,158,11,0.05)'}
                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0, background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                                        <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f2233', fontFamily: "'Cairo', sans-serif" }}>{st.name}</div>
                                    <div style={{ fontSize: '11px', color: '#64748b', fontFamily: "'Cairo', sans-serif" }}>{st.email}</div>
                                </div>
                            </div>
                            <span style={{ fontSize: '13px', color: '#475569', fontFamily: "'Cairo', sans-serif" }}>{st.enrolledSubjects} مادة</span>
                            <span style={{ fontSize: '13px', color: '#475569', fontFamily: "'Cairo', sans-serif" }}>{st.watchedLectures} / {st.totalLectures}</span>
                            <span style={{ fontSize: '13px', color: '#475569', fontFamily: "'Cairo', sans-serif" }}>{st.completedLectures}</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <ProgressBar value={st.progressPercentage} />
                                <span style={{ fontSize: '11px', color: '#64748b', fontFamily: "'Cairo', sans-serif" }}>{st.progressPercentage}%</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: "'Cairo', sans-serif", padding: '0 4px' }}>
                آخر نشاط: اضغط على أي طالب لعرض تفاصيل تقدمه في كل مادة. البيانات تُحدَّث تلقائياً من مشاهدات الدروس.
            </div>

            {/* AI Features */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <button onClick={() => setAiTab('file')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer', fontWeight: 700, fontFamily: "'Cairo', sans-serif", background: aiTab === 'file' ? '#38bdf8' : '#f8fafc', color: aiTab === 'file' ? '#ffffff' : '#64748b' }}>
                        📎 تحليل ملف
                    </button>
                    <button onClick={() => setAiTab('report')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer', fontWeight: 700, fontFamily: "'Cairo', sans-serif", background: aiTab === 'report' ? '#38bdf8' : '#f8fafc', color: aiTab === 'report' ? '#ffffff' : '#64748b' }}>
                        📊 توليد تقرير
                    </button>
                </div>

                {aiTab === 'file' ? (
                    <form onSubmit={onAnalyze} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input type="file" accept="image/*,application/pdf,.doc,.docx,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)}
                            style={{ color: '#475569', fontSize: '13px', fontFamily: "'Cairo', sans-serif" }} />
                        <textarea value={fileContext} onChange={(e) => setFileContext(e.target.value)} placeholder="سياق اختياري (مثال: هذا ورقة عمل لدرس القوى والحركة للصف السادس)..."
                            rows={2} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', color: '#0f2233', fontSize: '13px', fontFamily: "'Cairo', sans-serif", outline: 'none', resize: 'vertical' }} />
                        <button type="submit" disabled={analyzing} style={{ alignSelf: 'flex-start', background: 'linear-gradient(90deg,#38bdf8,#0ea5e9)', border: 'none', borderRadius: '10px', padding: '9px 18px', color: '#ffffff', fontWeight: 700, cursor: 'pointer', opacity: analyzing ? 0.6 : 1, fontFamily: "'Cairo', sans-serif" }}>
                            {analyzing ? 'جاري التحليل...' : 'تحليل الملف'}
                        </button>
                        {analysis && (
                            <div style={{ background: '#f8fafc', border: '1px solid #eef2f7', borderRadius: '10px', padding: '14px', color: '#334155', fontSize: '13px', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: "'Cairo', sans-serif", maxHeight: '400px', overflowY: 'auto' }}>
                                {analysis}
                            </div>
                        )}
                    </form>
                ) : (
                    <form onSubmit={onGenerateReport} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {(['class', 'subject', 'student'] as const).map(t => (
                                <button type="button" key={t} onClick={() => setReportType(t)} style={{ flex: 1, padding: '9px', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer', fontWeight: 700, fontFamily: "'Cairo', sans-serif", background: reportType === t ? '#38bdf8' : '#f8fafc', color: reportType === t ? '#ffffff' : '#64748b' }}>
                                    {t === 'class' ? 'الصف كاملاً' : t === 'subject' ? 'مادة' : 'طالب'}
                                </button>
                            ))}
                        </div>
                        <textarea value={reportContext} onChange={(e) => setReportContext(e.target.value)} placeholder="بيانات المتابعة (JSON) أو ملاحظات لتوليد التقرير... اتركه فارغاً لاستخدام ملخص عام."
                            rows={4} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', color: '#0f2233', fontSize: '13px', fontFamily: "'Cairo', sans-serif", outline: 'none', resize: 'vertical', direction: 'ltr', textAlign: 'left' }} />
                        <button type="submit" disabled={generating} style={{ alignSelf: 'flex-start', background: 'linear-gradient(90deg,#38bdf8,#0ea5e9)', border: 'none', borderRadius: '10px', padding: '9px 18px', color: '#ffffff', fontWeight: 700, cursor: 'pointer', opacity: generating ? 0.6 : 1, fontFamily: "'Cairo', sans-serif" }}>
                            {generating ? 'جاري التوليد...' : 'توليد التقرير'}
                        </button>
                        {report && (
                            <div style={{ background: '#f8fafc', border: '1px solid #eef2f7', borderRadius: '10px', padding: '14px', color: '#334155', fontSize: '13px', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: "'Cairo', sans-serif", maxHeight: '400px', overflowY: 'auto' }}>
                                {report}
                            </div>
                        )}
                    </form>
                )}
            </div>

            {/* Student detail drawer */}
            {selected && (
                <div className="fixed inset-0 z-[300] flex" style={{ direction: 'rtl' }}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
                    <div className="relative z-10 ml-auto w-full max-w-[520px] h-full overflow-y-auto bg-white border-l border-slate-200 p-5" style={{ animation: 'fadeIn 0.2s ease' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                                        <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div>
                                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f2233', fontFamily: "'Cairo', sans-serif" }}>{selected.name}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontFamily: "'Cairo', sans-serif" }}>{selected.email}</div>
                                </div>
                            </div>
                            <button onClick={() => setSelected(null)} style={{ background: 'rgba(245,158,11,0.08)', border: 'none', borderRadius: '8px', padding: '6px 12px', color: '#b45309', cursor: 'pointer', fontFamily: "'Cairo', sans-serif", fontWeight: 700 }}>إغلاق</button>
                        </div>

                        {detailLoading ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8', fontFamily: "'Cairo', sans-serif" }}>جاري التحميل...</div>
                        ) : (
                            <>
                                {/* Summary cards */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                                    <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '10px', padding: '12px' }}>
                                        <div style={{ fontSize: '11px', color: '#64748b', fontFamily: "'Cairo', sans-serif" }}>إجمالي الدروس</div>
                                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f2233', fontFamily: "'Cairo', sans-serif" }}>{selected.totalLectures}</div>
                                    </div>
                                    <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '10px', padding: '12px' }}>
                                        <div style={{ fontSize: '11px', color: '#64748b', fontFamily: "'Cairo', sans-serif" }}>المنجزة</div>
                                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', fontFamily: "'Cairo', sans-serif" }}>{selected.completedLectures}</div>
                                    </div>
                                    <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '10px', padding: '12px' }}>
                                        <div style={{ fontSize: '11px', color: '#64748b', fontFamily: "'Cairo', sans-serif" }}>المشاهدة</div>
                                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563eb', fontFamily: "'Cairo', sans-serif" }}>{selected.watchedLectures}</div>
                                    </div>
                                    <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '10px', padding: '12px' }}>
                                        <div style={{ fontSize: '11px', color: '#64748b', fontFamily: "'Cairo', sans-serif" }}>نسبة التقدم</div>
                                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b', fontFamily: "'Cairo', sans-serif" }}>{selected.progressPercentage}%</div>
                                    </div>
                                </div>

                                {/* Per-subject breakdown */}
                                <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0f2233', margin: '0 0 12px', fontFamily: "'Cairo', sans-serif" }}>التفصيل حسب المادة</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {(selected.subjects && selected.subjects.length > 0) ? selected.subjects.map((s) => (
                                        <div key={s.subjectId} style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '10px', padding: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f2233', fontFamily: "'Cairo', sans-serif" }}>{s.subjectName}</span>
                                                <span style={{ fontSize: '12px', color: '#64748b', fontFamily: "'Cairo', sans-serif" }}>{s.progressPercentage}%</span>
                                            </div>
                                            <ProgressBar value={s.progressPercentage} color="#34d399" />
                                            <div style={{ fontSize: '11px', color: '#64748b', fontFamily: "'Cairo', sans-serif", marginTop: '6px' }}>
                                                {s.watchedLectures} مشاهدة · {s.completedLectures} منجزة · من أصل {s.totalLectures} درس
                                            </div>
                                        </div>
                                    )) : (
                                        <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '13px', fontFamily: "'Cairo', sans-serif" }}>لا توجد مواد مسجلة</div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherStudents;