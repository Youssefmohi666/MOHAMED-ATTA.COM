import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    fetchAvailableExams, fetchExamDetail, submitExam,
    ExamListItem, ExamDetail, ExamResult,
} from '../api/exams.api';
import { authedImageUrl } from '../api/media.api';
import { useToast } from '../contexts/ToastContext';

const ARABIC_LETTERS = ['أ', 'ب', 'ج', 'د', 'ه', 'و', 'ز', 'ح'];

const ExamTakingView: React.FC<{
    exam: ExamDetail;
    onBack: () => void;
    onComplete: (result: ExamResult) => void;
}> = ({ exam, onBack, onComplete }) => {
    const { showToast } = useToast();
    const [answers, setAnswers] = useState<number[]>(new Array(exam.questions.length).fill(-1));
    const [violations, setViolations] = useState(0);
    const [timeLeft, setTimeLeft] = useState(exam.durationMinutes * 60);
    const [submitting, setSubmitting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [started] = useState(Date.now());
    const maxViolations = 3;

    useEffect(() => {
        if (timeLeft <= 0) {
            handleSubmit(true);
            return;
        }
        const t = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(t);
    }, [timeLeft]);

    useEffect(() => {
        const handleVisibility = () => {
            if (document.hidden) {
                setViolations(prev => {
                    const next = prev + 1;
                    if (next >= maxViolations) {
                        handleSubmit(true);
                    }
                    return next;
                });
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    const handleSubmit = useCallback(async (autoSubmit = false) => {
        if (submitting) return;
        setSubmitting(true);
        const timeSpentSeconds = Math.floor((Date.now() - started) / 1000);
        try {
            const result = await submitExam(exam.id, {
                answers: answers.map(a => a === -1 ? -1 : a),
                violations,
                timeSpentSeconds,
            });
            onComplete(result);
        } catch {
            showToast('فشل تسليم الاختبار', 'error');
            setSubmitting(false);
        }
    }, [answers, violations, exam.id, submitting, started, onComplete, showToast]);

    const formatTime = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const answeredCount = answers.filter(a => a !== -1).length;

    return (
        <div className="bg-[#0d0d0d] border border-amber-500/20 overflow-hidden">
            {/* Quiz Player Header - matching demo.dev-core.site structure */}
            <div className="flex items-center justify-between p-5 border-b border-amber-500/20 bg-[#0a0a0a]">
                <div className="quiz-player-info">
                    <h3 className="text-base font-bold text-slate-100 font-cairo">{exam.title}</h3>
                    <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-amber-400/70 border border-amber-500/20 px-2 py-0.5 font-cairo">تقييم منهج</span>
                        <span className="text-xs text-amber-400 font-bold font-cairo">
                            مخالفات التنقل: {violations} / {maxViolations}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-[#0d0d0d] border border-amber-500/20 px-4 py-2.5">
                    <span className="text-lg">⏳</span>
                    <span className="text-amber-400 font-bold text-lg font-mono" dir="ltr">{formatTime(timeLeft)}</span>
                </div>
            </div>

            {/* Quiz Player Body */}
            <div className="p-5">
                {/* Warning Box - matching demo structure */}
                <div className="text-center border border-red-500/20 bg-red-500/5 p-4 mb-5">
                    <p className="text-sm text-red-400 font-cairo">
                        ⚠️ <strong>تنبيه هام:</strong> يرجى عدم مغادرة تبويب الاختبار أو التقاط صور شاشة. سيتم تقديم إجاباتك تلقائياً في حال تكرار الخروج من الصفحة لحماية تكافؤ الفرص.
                    </p>
                </div>

                {/* Progress bar */}
                <div className="mb-5 p-3 border border-white/[0.06] bg-white/[0.02]">
                    <div className="flex justify-between text-xs text-slate-500 mb-2 font-cairo">
                        <span>تم الإجابة: {answeredCount} / {exam.questions.length}</span>
                        <span>{Math.round((answeredCount / exam.questions.length) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-white/5">
                        <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${(answeredCount / exam.questions.length) * 100}%` }} />
                    </div>
                </div>

                {/* Questions render area */}
                <div className="space-y-4 mb-6">
                    {exam.questions.map((q, i) => (
                        <div key={q.id} className="border border-white/[0.08] bg-[#0a0a0a] p-5">
                            {q.imageUrl && (
                                <div className="mb-4">
                                    <img src={authedImageUrl(q.imageUrl)} alt="صورة السؤال"
                                        className="max-w-full max-h-72 object-contain rounded-lg border border-white/10 bg-white p-1" />
                                </div>
                            )}
                            <p className="text-sm font-bold text-slate-100 mb-4 font-cairo">
                                س {i + 1}: {q.text}
                                <span className="text-amber-400 text-xs font-normal mr-2">({q.points} درجات)</span>
                            </p>
                            <div className="grid grid-cols-1 gap-2">
                                {q.options.map((opt, j) => (
                                    <label
                                        key={j}
                                        className={`flex items-center gap-3 px-4 py-3 border cursor-pointer transition-all duration-200 font-cairo
                                            ${answers[i] === j
                                                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                                                : 'bg-white/[0.02] border-white/[0.06] text-slate-300 hover:bg-white/[0.05] hover:border-white/20'}`}
                                    >
                                        <input
                                            type="radio"
                                            name={`q-${i}`}
                                            checked={answers[i] === j}
                                            onChange={() => setAnswers(prev => { const n = [...prev]; n[i] = j; return n; })}
                                            className="sr-only"
                                        />
                                        <span className={`w-7 h-7 flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-200 border
                                            ${answers[i] === j
                                                ? 'bg-amber-500 text-white border-amber-500'
                                                : 'bg-transparent text-slate-500 border-white/10'}`}
                                        >
                                            {ARABIC_LETTERS[j] || j + 1}
                                        </span>
                                        <span className="text-sm">{opt}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quiz Player Footer - matching demo button structure */}
                <div className="flex gap-3 justify-center pt-4 border-t border-white/[0.06]">
                    <button
                        onClick={() => { if (!submitting) onBack(); }}
                        disabled={submitting}
                        className="px-8 py-3 border-2 border-red-500/40 bg-transparent text-red-400 text-sm font-bold font-cairo hover:bg-red-500/10 transition-all duration-200 cursor-pointer disabled:opacity-50"
                    >
                        انسحاب وإلغاء
                    </button>
                    <button
                        onClick={() => setShowConfirm(true)}
                        disabled={submitting}
                        className="px-8 py-3 border-2 border-amber-500 bg-amber-500 text-white text-sm font-bold font-cairo hover:bg-amber-600 transition-all duration-200 cursor-pointer disabled:opacity-50 shadow-[3px_3px_0px_rgba(245,158,11,0.3)]"
                    >
                        {submitting ? 'جاري التسليم...' : 'تسليم الاختبار وإنهاء الإجابة'}
                    </button>
                </div>
            </div>

            {/* Confirm Dialog */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowConfirm(false)}>
                    <div className="bg-[#0d0d0d] border-2 border-amber-500/30 p-6 max-w-sm mx-4 shadow-[5px_5px_0px_rgba(245,158,11,0.2)]" onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-bold text-slate-100 mb-2 font-cairo">تأكيد تسليم الاختبار</h3>
                        <p className="text-sm text-slate-400 mb-1 font-cairo">هل أنت متأكد من تسليم الاختبار؟</p>
                        <p className="text-xs text-amber-400 mb-5 font-cairo">لقد أجبت على {answeredCount} من {exam.questions.length} أسئلة</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowConfirm(false)}
                                className="flex-1 py-2.5 border-2 border-white/10 bg-transparent text-slate-400 text-sm font-bold font-cairo hover:bg-white/5 transition-all duration-200 cursor-pointer">
                                العودة
                            </button>
                            <button onClick={() => { setShowConfirm(false); handleSubmit(); }}
                                className="flex-1 py-2.5 border-2 border-amber-500 bg-amber-500 text-white text-sm font-bold font-cairo hover:bg-amber-600 transition-all duration-200 cursor-pointer shadow-[2px_2px_0px_rgba(245,158,11,0.3)]">
                                تسليم
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ExamResultsView: React.FC<{
    result: ExamResult;
    onBack: () => void;
}> = ({ result, onBack }) => {
    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${String(sec).padStart(2, '0')}`;
    };

    return (
        <div className="max-w-3xl mx-auto">
            <button onClick={onBack}
                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm mb-4 cursor-pointer bg-transparent border-none font-cairo">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                العودة إلى الاختبارات
            </button>

            <div className="border border-white/[0.08] bg-[#0a0a0a] p-6 mb-5 text-center">
                <div className={`w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold border-2
                    ${result.passed ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                    {result.passed ? '✓' : '✗'}
                </div>
                <h2 className="text-xl font-bold text-slate-100 mb-2 font-cairo">{result.examTitle}</h2>
                <p className="text-sm text-slate-500 mb-4 font-cairo">النتيجة</p>
                <div className="flex items-center justify-center gap-8">
                    <div>
                        <div className={`text-3xl font-extrabold font-cairo ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                            {result.percentage}%
                        </div>
                        <div className="text-xs text-slate-500 mt-1 font-cairo">النسبة المئوية</div>
                    </div>
                    <div className="w-px h-12 bg-white/[0.08]" />
                    <div>
                        <div className="text-3xl font-extrabold text-amber-400 font-cairo">{result.score}/{result.totalPoints}</div>
                        <div className="text-xs text-slate-500 mt-1 font-cairo">الدرجة</div>
                    </div>
                    <div className="w-px h-12 bg-white/[0.08]" />
                    <div>
                        <div className="text-2xl font-extrabold text-sky-400 font-cairo">{formatTime(result.timeSpentSeconds)}</div>
                        <div className="text-xs text-slate-500 mt-1 font-cairo">الوقت المستغرق</div>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {result.questionResults.map((qr, i) => (
                    <div key={qr.questionId} className={`border p-4 ${qr.isCorrect ? 'bg-green-500/5 border-green-500/15' : 'bg-red-500/5 border-red-500/15'}`}>
                        <p className="text-sm font-bold text-slate-100 mb-3 font-cairo">
                            س {i + 1}: {qr.text}
                            <span className="text-xs font-normal mr-2 text-slate-500">({qr.earnedPoints}/{qr.points})</span>
                        </p>
                        <div className="space-y-1.5">
                            {[
                                { label: 'إجابتك', value: qr.yourAnswer, isCorrect: qr.isCorrect },
                                { label: 'الإجابة الصحيحة', value: qr.correctAnswer },
                            ].map((item, j) => (
                                <div key={j} className="flex items-center gap-2 text-xs font-cairo">
                                    <span className="text-slate-500 shrink-0">{item.label}:</span>
                                    <span className={`${j === 0 ? (item.isCorrect ? 'text-green-400' : 'text-red-400') : 'text-[#EF4444]'} font-bold`}>
                                        {item.value >= 0 ? ARABIC_LETTERS[item.value] || String(item.value + 1) : '——'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const StudentExamViewer: React.FC = () => {
    const { showToast } = useToast();
    const [exams, setExams] = useState<ExamListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentExam, setCurrentExam] = useState<ExamDetail | null>(null);
    const [currentResult, setCurrentResult] = useState<ExamResult | null>(null);

    const loadExams = async () => {
        setLoading(true);
        try { setExams(await fetchAvailableExams()); }
        catch { showToast('فشل تحميل الاختبارات المتاحة', 'error'); }
        setLoading(false);
    };
    useEffect(() => { loadExams(); }, []);

    const handleStartExam = async (id: string) => {
        try {
            const detail = await fetchExamDetail(id);
            setCurrentExam(detail);
            setCurrentResult(null);
        } catch { showToast('فشل تحميل الاختبار', 'error'); }
    };

    const handleComplete = (result: ExamResult) => {
        setCurrentExam(null);
        setCurrentResult(result);
    };

    const handleBack = () => {
        setCurrentExam(null);
        setCurrentResult(null);
        loadExams();
    };

    if (currentExam) {
        return (
            <div className="animate-fade-in max-w-3xl mx-auto">
                <ExamTakingView exam={currentExam} onBack={handleBack} onComplete={handleComplete} />
            </div>
        );
    }

    if (currentResult) {
        return <ExamResultsView result={currentResult} onBack={handleBack} />;
    }

    return (
        <div>
            <div className="flex items-center gap-2.5 mb-5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="9" y="3" width="6" height="4" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h2 className="text-lg font-extrabold text-slate-200 font-cairo">الاختبارات المتاحة</h2>
            </div>

            {loading ? (
                <div className="text-center py-14">
                    <div className="w-10 h-10 rounded-full border-[3px] border-amber-500/15 border-t-amber-500 animate-spin mx-auto" />
                </div>
            ) : exams.length === 0 ? (
                <div className="text-center py-14 px-5 bg-white/[0.02] border border-white/[0.06]">
                    <div className="w-16 h-16 bg-amber-500/[0.08] flex items-center justify-center mx-auto mb-4">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" strokeLinecap="round" strokeLinejoin="round"/>
                            <rect x="9" y="3" width="6" height="4" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M9 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <h3 className="text-base font-bold text-slate-200 mb-2 font-cairo">لا توجد اختبارات متاحة حالياً</h3>
                    <p className="text-sm text-slate-500 font-cairo">سيتم إضافة الاختبارات هنا عندما ينشرها المعلمون</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {exams.map(e => (
                        <div key={e.id} className="border border-white/[0.08] bg-[#0a0a0a] p-5 hover:border-amber-500/30 transition-all duration-200">
                            <h3 className="text-sm font-bold text-slate-100 mb-4 font-cairo">{e.title}</h3>
                            <div className="flex gap-4 mb-4">
                                <div className="text-center">
                                    <div className="text-lg font-extrabold text-amber-400">{e.questionCount}</div>
                                    <div className="text-[10px] text-slate-500 font-cairo">أسئلة</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-extrabold text-sky-400">{e.durationMinutes}</div>
                                    <div className="text-[10px] text-slate-500 font-cairo">دقائق</div>
                                </div>
                            </div>
                            <button onClick={() => handleStartExam(e.id)}
                                className="w-full py-2.5 border-2 border-amber-500 bg-amber-500 text-white text-sm font-bold font-cairo hover:bg-amber-600 transition-all duration-200 cursor-pointer shadow-[3px_3px_0px_rgba(245,158,11,0.3)]">
                                بدء الاختبار
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StudentExamViewer;
