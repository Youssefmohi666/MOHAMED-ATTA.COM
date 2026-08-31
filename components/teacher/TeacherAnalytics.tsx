import React, { useState, useEffect, useCallback } from 'react';
import { Subject } from './types';
import TeacherStats from './TeacherStats';
import {
    fetchAnalyticsOverview,
    fetchStudentAnalytics,
    createAssessment,
    recordAssessmentGrade,
    recordAttendance,
    fetchClassrooms,
    createClassroom,
} from '../../api/analytics.api';

interface Activity { text: string; time: string; icon?: string }

interface TeacherAnalyticsProps {
    subjects: Subject[];
    totalSubjects: number;
    totalStudents: number;
    totalLectures: number;
    publishedCount: number;
    activities: Activity[];
}

const statusLabels: Record<string, string> = {
    Present: 'حاضر',
    Absent: 'غائب',
    Late: 'متأخر',
};

const statusColors: Record<string, string> = {
    Present: 'bg-emerald-50 text-emerald-600',
    Absent: 'bg-rose-50 text-rose-600',
    Late: 'bg-amber-50 text-amber-600',
};

const typeLabels: Record<string, string> = {
    Quiz: 'كويز',
    Midterm: 'منتصف الفصل',
    Final: 'نهائي',
    Homework: 'واجب',
    Assignment: 'تقييم',
    Oral: 'شفوي',
};

const inputCls = "w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[#0f2233] text-sm font-cairo outline-none focus:border-[#1E3A8A]/40 focus:ring-2 focus:ring-[#1E3A8A]/10 transition-all duration-150 placeholder:text-slate-400 [&>option]:text-[#0f2233]";
const selectCls = `${inputCls} appearance-none cursor-pointer`;

const TeacherAnalytics: React.FC<TeacherAnalyticsProps> = ({
    subjects, totalSubjects, totalStudents, totalLectures, publishedCount, activities,
}) => {
    const [overview, setOverview] = useState<any>(null);
    const [overviewLoading, setOverviewLoading] = useState(true);
    const [students, setStudents] = useState<any[]>([]);

    // Per-student detail
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [studentDetail, setStudentDetail] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // Recording forms
    const [showForms, setShowForms] = useState(false);
    const [classrooms, setClassrooms] = useState<any[]>([]);

    // Assessment form state
    const [assessTitle, setAssessTitle] = useState('');
    const [assessType, setAssessType] = useState('Quiz');
    const [assessMax, setAssessMax] = useState(100);
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [savingAssess, setSavingAssess] = useState(false);

    // Attendance state
    const [attStudentId, setAttStudentId] = useState('');
    const [attStatus, setAttStatus] = useState<'Present' | 'Absent' | 'Late'>('Present');
    const [attSubjectId, setAttSubjectId] = useState('');
    const [savingAtt, setSavingAtt] = useState(false);

    // ClassForm
    const [roomName, setRoomName] = useState('');
    const [roomSubjectId, setRoomSubjectId] = useState('');
    const [savingRoom, setSavingRoom] = useState(false);

    const [error, setError] = useState('');

    const loadOverview = useCallback(async () => {
        setOverviewLoading(true);
        try {
            const data = await fetchAnalyticsOverview();
            setOverview(data);
            setError('');
        } catch (e: any) {
            setError(e.message || 'تعذر تحميل الإحصائيات');
        } finally {
            setOverviewLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOverview();
        fetchClassrooms().then(setClassrooms).catch(() => {});
    }, [loadOverview]);

    const openStudent = async (student: any) => {
        setSelectedStudent(student);
        setDetailLoading(true);
        setStudentDetail(null);
        try {
            const data = await fetchStudentAnalytics(student.id);
            setStudentDetail(data);
        } catch (e: any) {
            setError(e.message || 'تعذر تحميل تفاصيل الطالب');
        } finally {
            setDetailLoading(false);
        }
    };

    const closeStudent = () => {
        setSelectedStudent(null);
        setStudentDetail(null);
    };

    const handleSaveAssessment = async () => {
        if (!assessTitle.trim() || !selectedSubjectId) {
            setError('أدخل عنوان التقييم واختر المادة');
            return;
        }
        setSavingAssess(true);
        setError('');
        try {
            await createAssessment({
                title: assessTitle,
                type: assessType,
                maxGrade: assessMax,
                subjectId: selectedSubjectId,
            });
            setAssessTitle(''); setAssessMax(100);
            alert('✓ تم إنشاء التقييم');
        } catch (e: any) {
            setError(e.message || 'حدث خطأ أثناء إنشاء التقييم');
        } finally {
            setSavingAssess(false);
        }
    };

    const handleSaveAttendance = async () => {
        if (!attStudentId) {
            setError('اختر الطالب');
            return;
        }
        setSavingAtt(true);
        setError('');
        try {
            await recordAttendance({
                studentId: attStudentId,
                subjectId: attSubjectId || selectedSubjectId || undefined,
                status: attStatus,
            });
            setAttStudentId('');
            alert('✓ تم تسجيل الحضور');
        } catch (e: any) {
            setError(e.message || 'حدث خطأ أثناء تسجيل الحضور');
        } finally {
            setSavingAtt(false);
        }
    };

    const handleSaveRoom = async () => {
        if (!roomName.trim() || !roomSubjectId) {
            setError('أدخل اسم الفصل واختر المادة');
            return;
        }
        setSavingRoom(true);
        setError('');
        try {
            const room = await createClassroom({ name: roomName, subjectId: roomSubjectId });
            setClassrooms(prev => [...prev, room]);
            setRoomName('');
            alert('✓ تم إنشاء الفصل');
        } catch (e: any) {
            setError(e.message || 'حدث خطأ أثناء إنشاء الفصل');
        } finally {
            setSavingRoom(false);
        }
    };

    const statCards = [
        { label: 'إجمالي الطلاب', value: overview?.totalStudents ?? totalStudents, icon: '👥' },
        { label: 'إجمالي المحاضرات', value: overview?.totalLectures ?? totalLectures, icon: '🎬' },
        { label: 'مشاهدات الأنشطة الأسبوعية', value: overview?.totalWatchedLectures ?? 0, icon: '📊' },
        { label: 'طلبة نشطون', value: overview?.distinctActiveStudents ?? 0, icon: '⚡' },
        { label: 'متوسط المشاهدات/طالب', value: overview?.averageViewsPerStudent?.toFixed?.(1) ?? overview?.averageViewsPerStudent ?? 0, icon: '👁️' },
        { label: 'تراكمات الأسبوع', value: overview?.accumulatedLectures ?? 0, icon: '📚' },
    ];

    const selectableSubjects = Array.isArray(subjects) ? subjects : [];

    return (
        <div className="animate-fade-in space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-extrabold text-[#0f2233] mb-0 font-cairo flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
                        <line x1="18" y1="20" x2="18" y2="10" strokeLinecap="round"/>
                        <line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round"/>
                        <line x1="6" y1="20" x2="6" y2="14" strokeLinecap="round"/>
                    </svg>
                    نظام تحليل بيانات الطلاب
                </h2>
                <button
                    onClick={() => setShowForms(f => !f)}
                    className="bg-gradient-to-r from-[#1E3A8A] to-[#0d1f33] border-none rounded-xl px-4 py-2 text-white text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity font-cairo"
                >
                    {showForms ? 'إخفاء أدوات الإدخال' : '+ إدخال درجات / حضور'}
                </button>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5 text-rose-700 text-[13px] font-cairo">
                    {error}
                </div>
            )}

            {overviewLoading ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 text-center text-slate-500 text-sm font-cairo">
                    جاري تحميل الإحصائيات...
                </div>
            ) : (
                <>
                    {/* Overview stat cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                        {statCards.map((card, i) => (
                            <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-4 hover:shadow-lg hover:shadow-[#1E3A8A]/5 transition-shadow duration-200">
                                <div className="text-[22px] mb-1.5">{card.icon}</div>
                                <div className="text-xl font-extrabold text-[#0f2233] font-cairo">{card.value}</div>
                                <div className="text-[11px] text-slate-500 font-cairo mt-0.5">{card.label}</div>
                            </div>
                        ))}
                    </div>

                    {overview?.mostRegularClass && (
                        <div className="bg-gradient-to-l from-[#a855f7]/10 to-transparent border border-[#a855f7]/20 rounded-2xl px-4 py-3 flex items-center justify-between flex-wrap gap-2">
                            <span className="text-sm text-slate-600 font-cairo">
                                🏆 الفصل الأكثر انتظاماً: <b className="text-purple-700">{overview.mostRegularClass}</b>
                            </span>
                            <span className="text-sm text-purple-700 font-cairo">معدل الحضور: {overview.mostRegularClassRate}%</span>
                        </div>
                    )}

                    {/* Most watched lectures */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4">
                        <h3 className="text-sm font-bold text-[#0f2233] mb-4 font-cairo">أكثر المحاضرات مشاهدة</h3>
                        {(!overview?.mostWatched || overview.mostWatched.length === 0) ? (
                            <p className="text-center text-slate-500 text-[13px] font-cairo">لا توجد بيانات مشاهدة بعد</p>
                        ) : (
                            overview.mostWatched.map((lec: any, i: number) => (
                                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                                    <span className="text-[13px] text-slate-600 font-cairo flex-1 min-w-0 truncate pl-3">
                                        <span className="text-slate-400 ml-2">{i + 1}.</span>{lec.title}
                                    </span>
                                    <span className="text-[12px] text-amber-600 font-bold font-cairo whitespace-nowrap">{lec.viewCount} مشاهدة</span>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* Recording forms */}
            {showForms && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Assessment */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4">
                        <h3 className="text-sm font-bold text-[#0f2233] mb-3 font-cairo">📝 إضافة تقييم (درجات)</h3>
                        <input
                            value={assessTitle}
                            onChange={e => setAssessTitle(e.target.value)}
                            placeholder="عنوان التقييم (مثال: كويز 2)"
                            className={`${inputCls} mb-2`}
                        />
                        <select
                            value={selectedSubjectId}
                            onChange={e => setSelectedSubjectId(e.target.value)}
                            className={`${selectCls} mb-2`}
                        >
                            <option value="">اختر المادة</option>
                            {selectableSubjects.map(s => (
                                <option key={s.id} value={s.id}>{s.title}</option>
                            ))}
                        </select>
                        <select
                            value={assessType}
                            onChange={e => setAssessType(e.target.value)}
                            className={`${selectCls} mb-2`}
                        >
                            {Object.entries(typeLabels).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                        <input
                            type="number"
                            value={assessMax}
                            onChange={e => setAssessMax(Number(e.target.value))}
                            placeholder="الدرجة العظمى"
                            className={`${inputCls} mb-3`}
                        />
                        <button
                            onClick={handleSaveAssessment}
                            disabled={savingAssess}
                            className="w-full bg-gradient-to-r from-[#1E3A8A] to-[#0d1f33] border-none rounded-xl px-4 py-2 text-white text-sm font-bold cursor-pointer hover:opacity-90 disabled:opacity-50 transition-opacity font-cairo"
                        >
                            {savingAssess ? 'جاري الحفظ...' : 'حفظ التقييم'}
                        </button>
                    </div>

                    {/* Attendance */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4">
                        <h3 className="text-sm font-bold text-[#0f2233] mb-3 font-cairo">✅ تسجيل حضور</h3>
                        <select
                            value={attStudentId}
                            onChange={e => setAttStudentId(e.target.value)}
                            className={`${selectCls} mb-2`}
                        >
                            <option value="">اختر الطالب</option>
                            {students.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <select
                            value={attStatus}
                            onChange={e => setAttStatus(e.target.value as any)}
                            className={`${selectCls} mb-2`}
                        >
                            <option value="Present">حاضر</option>
                            <option value="Absent">غائب</option>
                            <option value="Late">متأخر</option>
                        </select>
                        <select
                            value={attSubjectId}
                            onChange={e => setAttSubjectId(e.target.value)}
                            className={`${selectCls} mb-3`}
                        >
                            <option value="">اختر المادة (اختياري)</option>
                            {selectableSubjects.map(s => (
                                <option key={s.id} value={s.id}>{s.title}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleSaveAttendance}
                            disabled={savingAtt}
                            className="w-full bg-gradient-to-r from-[#f59e0b] to-[#d97706] border-none rounded-xl px-4 py-2 text-white text-sm font-bold cursor-pointer hover:opacity-90 disabled:opacity-50 transition-opacity font-cairo"
                        >
                            {savingAtt ? 'جاري التسجيل...' : 'تسجيل الحضور'}
                        </button>
                    </div>

                    {/* Classroom */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4">
                        <h3 className="text-sm font-bold text-[#0f2233] mb-3 font-cairo">🏫 إدارة الفصول</h3>
                        <input
                            value={roomName}
                            onChange={e => setRoomName(e.target.value)}
                            placeholder="اسم الفصل (مثال: 4 أ)"
                            className={`${inputCls} mb-2`}
                        />
                        <select
                            value={roomSubjectId}
                            onChange={e => setRoomSubjectId(e.target.value)}
                            className={`${selectCls} mb-3`}
                        >
                            <option value="">اختر المادة</option>
                            {selectableSubjects.map(s => (
                                <option key={s.id} value={s.id}>{s.title}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleSaveRoom}
                            disabled={savingRoom}
                            className="w-full bg-gradient-to-r from-[#34d399] to-[#10b981] border-none rounded-xl px-4 py-2 text-white text-sm font-bold cursor-pointer hover:opacity-90 disabled:opacity-50 transition-opacity font-cairo"
                        >
                            {savingRoom ? 'جاري الإضافة...' : 'إنشاء فصل'}
                        </button>
                        {classrooms.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {classrooms.map((c: any) => (
                                    <span key={c.id} className="text-[11px] bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1 text-slate-600 font-cairo">
                                        {c.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Student list */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4">
                <h3 className="text-sm font-bold text-[#0f2233] mb-3 font-cairo">👨‍🎓 أداء الطلاب — اضغط على طالب لعرض التفاصيل</h3>
                {students.length === 0 ? (
                    <button
                        onClick={async () => {
                            try {
                                const { fetchTeacherStudents } = await import('../../api/teacher.api');
                                const list = await fetchTeacherStudents();
                                setStudents(Array.isArray(list) ? list : []);
                            } catch (e: any) {
                                setError(e.message || 'تعذر تحميل قائمة الطلاب');
                            }
                        }}
                        className="text-[#1E3A8A] text-[13px] font-cairo underline hover:text-[#0d1f33]"
                    >
                        تحميل قائمة الطلاب
                    </button>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {students.map((st: any) => (
                            <button
                                key={st.id}
                                onClick={() => openStudent(st)}
                                className="text-right bg-slate-50 hover:bg-[#1E3A8A]/[0.05] border border-slate-200 rounded-xl px-3.5 py-3 transition-colors cursor-pointer"
                            >
                                <div className="text-[13px] font-bold text-[#0f2233] font-cairo">{st.name}</div>
                                <div className="text-[11px] text-slate-500 font-cairo truncate">{st.email}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Student detail drawer */}
            {selectedStudent && (
                <div className="fixed inset-0 z-[300] flex justify-end">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeStudent} />
                    <div className="relative z-10 w-full max-w-lg bg-white border-l border-slate-200 h-full overflow-y-auto p-5">
                        <button onClick={closeStudent} className="float-left text-slate-400 hover:text-[#0f2233] cursor-pointer text-xl leading-none">✕</button>
                        <h3 className="text-base font-extrabold text-[#0f2233] font-cairo mb-0.5">{selectedStudent.name}</h3>
                        <p className="text-[12px] text-slate-500 font-cairo mb-4">{selectedStudent.email}</p>

                        {detailLoading ? (
                            <div className="text-center text-slate-500 text-sm font-cairo py-8">جاري التحميل...</div>
                        ) : studentDetail ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                                        <div className="text-lg font-extrabold text-amber-600 font-cairo">{studentDetail.overallProgress ?? 0}%</div>
                                        <div className="text-[11px] text-slate-500 font-cairo">نسبة الإنجاز</div>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                                        <div className="text-lg font-extrabold text-emerald-600 font-cairo">{(studentDetail.averageGradePercentage ?? 0).toFixed?.(1) ?? studentDetail.averageGradePercentage}%</div>
                                        <div className="text-[11px] text-slate-500 font-cairo">متوسط الدرجات</div>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                                        <div className="text-lg font-extrabold text-sky-600 font-cairo">{studentDetail.attendanceRate ?? 0}%</div>
                                        <div className="text-[11px] text-slate-500 font-cairo">نسبة الحضور</div>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                                        <div className="text-lg font-extrabold text-fuchsia-600 font-cairo">{studentDetail.accumulationRate ?? 0}%</div>
                                        <div className="text-[11px] text-slate-500 font-cairo">تراكم المحاضرات</div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                                    <div className="text-[11px] text-slate-500 font-cairo mb-1">المحاضرات</div>
                                    <div className="text-sm font-bold text-[#0f2233] font-cairo">
                                        {studentDetail.watchedLectures} / {studentDetail.totalLectures} مشاهدة
                                    </div>
                                    <div className="h-[7px] rounded-full bg-slate-100 mt-2 overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-amber-500 to-amber-600" style={{ width: `${studentDetail.overallProgress || 0}%` }} />
                                    </div>
                                </div>

                                {studentDetail.grades && studentDetail.grades.length > 0 && (
                                    <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                                        <div className="text-[11px] text-slate-500 font-cairo mb-2">الدرجات</div>
                                        {studentDetail.grades.map((g: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                                                <div>
                                                    <span className="text-[13px] text-[#0f2233] font-cairo">{g.title}</span>
                                                    <span className="text-[10px] text-slate-500 mr-2 font-cairo">{typeLabels[g.type] || g.type}</span>
                                                </div>
                                                <span className={`text-[12px] font-bold font-cairo ${g.percentage >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {g.grade}/{g.maxGrade} ({g.percentage}%)
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                                    <div className="text-[11px] text-slate-500 font-cairo mb-2">الحضور</div>
                                    <div className="flex gap-2 text-[12px] font-cairo flex-wrap">
                                        <span className="bg-emerald-50 text-emerald-600 rounded-full px-2.5 py-1">حاضر: {studentDetail.attendancePresent ?? 0}</span>
                                        <span className="bg-rose-50 text-rose-600 rounded-full px-2.5 py-1">غائب: {studentDetail.attendanceAbsent ?? 0}</span>
                                        <span className="bg-amber-50 text-amber-600 rounded-full px-2.5 py-1">متأخر: {studentDetail.attendanceLate ?? 0}</span>
                                    </div>
                                </div>

                                {studentDetail.monthlyWatches && studentDetail.monthlyWatches.length > 0 && (
                                    <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                                        <div className="text-[11px] text-slate-500 font-cairo mb-2">المشاهدات الشهرية</div>
                                        <div className="flex items-end gap-2 h-20">
                                            {studentDetail.monthlyWatches.slice(-8).map((m: any, i: number) => (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                                    <div className="w-full bg-gradient-to-t from-[#a855f7] to-[#c084fc] rounded-t" style={{ height: `${Math.max(8, (m.count / (studentDetail.monthlyAverage || 1)) * 100)}%` }} />
                                                    <span className="text-[9px] text-slate-500 font-cairo">{m.month}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherAnalytics;