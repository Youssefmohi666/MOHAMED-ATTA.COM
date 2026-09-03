import React, { useState, useEffect, useCallback } from 'react';
import {
    fetchTeacherStudents, fetchStudentDetail,
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

const initials = (name: string) => {
    const parts = (name || 'طالب').trim().split(/\s+/);
    const first = parts[0]?.[0] || 'ط';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
    return (first + last).slice(0, 2);
};

const avatarColors = ['#f59e0b', '#38bdf8', '#34d399', '#a78bfa', '#f472b6', '#fb7185'];

const ProgressBar: React.FC<{ value: number; color?: string; height?: number }> = ({ value, color = '#38bdf8', height = 6 }) => (
    <div style={{ width: '100%', height: `${height}px`, background: '#eef2f7', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
    </div>
);

const ProgressRing: React.FC<{ value: number; size?: number; stroke?: number }> = ({ value, size = 52, stroke = 5 }) => {
    const radius = (size - stroke) / 2;
    const circ = 2 * Math.PI * radius;
    const pct = Math.min(100, Math.max(0, value));
    const color = pct >= 75 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size}>
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eef2f7" strokeWidth={stroke} />
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
                    strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: '#0f2233', fontFamily: "'Cairo', sans-serif" }}>
                {pct}%
            </div>
        </div>
    );
};

const TeacherStudents: React.FC<TeacherStudentsProps> = () => {
    const { showToast } = useToast();
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [searching, setSearching] = useState(false);

    const [selected, setSelected] = useState<StudentDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

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

    const avgProgress = students.length
        ? Math.round(students.reduce((sum, s) => sum + s.progressPercentage, 0) / students.length)
        : 0;
    const atRisk = students.filter(s => s.progressPercentage < 40).length;
    const totalCompleted = students.reduce((sum, s) => sum + s.completedLectures, 0);
    const totalWatched = students.reduce((sum, s) => sum + s.watchedLectures, 0);

    const stats = [
        { label: 'إجمالي الطلاب', value: students.length, color: '#38bdf8', icon: 'users' },
        { label: 'متوسط التقدم', value: `${avgProgress}%`, color: '#10b981', icon: 'trend' },
        { label: 'دروس مُشاهدة', value: `${totalWatched}/${students.reduce((s, x) => s + x.totalLectures, 0)}`, color: '#a78bfa', icon: 'play' },
        { label: 'دروس منجزة', value: totalCompleted, color: '#f59e0b', icon: 'check' },
        { label: 'بحاجة لمتابعة', value: atRisk, color: '#ef4444', icon: 'alert' },
    ];

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
                    طلابي
                </h2>
                <form onSubmit={onSearch} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="ابحث بالاسم أو البريد..."
                        style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px', color: '#0f2233', fontSize: '13px', fontFamily: "'Cairo', sans-serif", minWidth: '200px', outline: 'none' }}
                    />
                    <button type="submit" disabled={searching} style={{ background: 'linear-gradient(90deg,#f59e0b,#d97706)', border: 'none', borderRadius: '10px', padding: '8px 14px', color: '#ffffff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: searching ? 0.6 : 1, fontFamily: "'Cairo', sans-serif" }}>
                        بحث
                    </button>
                </form>
            </div>

            {/* Stats cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                {stats.map((s, i) => (
                    <div key={s.label} style={{
                        background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px',
                        display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${s.color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {s.icon === 'users' ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                ) : s.icon === 'trend' ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2"><path d="M23 6l-9.5 9.5-5-5L1 18" strokeLinecap="round" strokeLinejoin="round" /><path d="M17 6h6v6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                ) : s.icon === 'play' ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M10 8l6 4-6 4V8z" strokeLinejoin="round" /></svg>
                                ) : s.icon === 'check' ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" /><path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" /></svg>
                                )}
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', fontFamily: "'Cairo', sans-serif" }}>{s.label}</span>
                        </div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f2233', fontFamily: "'Cairo', sans-serif", lineHeight: 1 }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Students table */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
                {/* header */}
                <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.1fr 1.3fr 1.4fr 0.9fr', padding: '12px 18px', borderBottom: '1px solid #f1f5f9', gap: '12px' }}
                    className="tch-stu-head">
                    {['الطالب', 'المواد', 'التقدم', 'الدروس', 'الحالة'].map(h => (
                        <span key={h} style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', fontFamily: "'Cairo', sans-serif" }}>{h}</span>
                    ))}
                </div>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8', fontFamily: "'Cairo', sans-serif" }}>جاري تحميل الطلاب...</div>
                ) : students.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8', fontFamily: "'Cairo', sans-serif" }}>لا يوجد طلاب مطابقون</div>
                ) : (
                    students.map((st, idx) => {
                        const pct = st.progressPercentage;
                        const status = pct >= 75 ? { label: 'متميز', color: '#10b981', bg: 'rgba(16,185,129,0.1)' }
                            : pct >= 40 ? { label: 'يسير بانتظام', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' }
                            : { label: 'يحتاج متابعة', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
                        const avatarColor = avatarColors[idx % avatarColors.length];
                        return (
                            <div key={st.id} onClick={() => openDetail(st)}
                                style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.1fr 1.3fr 1.4fr 0.9fr', padding: '12px 18px', gap: '12px', alignItems: 'center', cursor: 'pointer', borderBottom: idx < students.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.15s' }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(245,158,11,0.04)'}
                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                    {st.avatar ? (
                                        <img src={st.avatar} alt="" style={{ width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0, objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0, background: `${avatarColor}1a`, color: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, fontFamily: "'Cairo', sans-serif" }}>
                                            {initials(st.name)}
                                        </div>
                                    )}
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f2233', fontFamily: "'Cairo', sans-serif" }}>{st.name}</div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: "'Cairo', sans-serif", direction: 'ltr', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.email}</div>
                                    </div>
                                </div>
                                <span style={{ fontSize: '13px', color: '#475569', fontFamily: "'Cairo', sans-serif" }}>{st.enrolledSubjects} مادة</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <ProgressBar value={pct} color={status.color} />
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f2233', fontFamily: "'Cairo', sans-serif", whiteSpace: 'nowrap' }}>{pct}%</span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', fontFamily: "'Cairo', sans-serif" }}>
                                    <span style={{ color: '#0f2233', fontWeight: 700 }}>{st.completedLectures}</span> منجزة · {st.watchedLectures} مشاهدة
                                </div>
                                <div>
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: status.color, background: status.bg, padding: '4px 10px', borderRadius: '8px', fontFamily: "'Cairo', sans-serif", whiteSpace: 'nowrap' }}>
                                        {status.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: "'Cairo', sans-serif", padding: '0 4px' }}>
                اضغط على أي طالب لعرض تفاصيل تقدمه في كل مادة. البيانات تُحدَّث تلقائياً من مشاهدات الدروس.
            </div>

            {/* Student detail drawer */}
            {selected && (
                <div className="fixed inset-0 z-[300] flex" style={{ direction: 'rtl' }}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
                    <div className="relative z-10 ml-auto w-full max-w-[520px] h-full overflow-y-auto bg-white border-l border-slate-200 p-5" style={{ animation: 'fadeIn 0.2s ease' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {selected.avatarUrl ? (
                                    <img src={selected.avatarUrl} alt="" style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245,158,11,0.1)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, fontFamily: "'Cairo', sans-serif" }}>
                                        {initials(selected.name)}
                                    </div>
                                )}
                                <div>
                                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f2233', fontFamily: "'Cairo', sans-serif" }}>{selected.name}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontFamily: "'Cairo', sans-serif", direction: 'ltr', textAlign: 'right' }}>{selected.email}</div>
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
                                            <ProgressBar value={s.progressPercentage} color={s.progressPercentage >= 75 ? '#34d399' : s.progressPercentage >= 40 ? '#fbbf24' : '#f87171'} />
                                            <div style={{ fontSize: '11px', color: '#64748b', fontFamily: "'Cairo', sans-serif", marginTop: '6px' }}>
                                                {s.watchedLectures} مشاهدة · {s.completedLectures} منجزة · من أصل {s.totalLectures} درس
                                            </div>
                                        </div>
                                    )) : (
                                        <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '13px', fontFamily: "'Cairo', sans-serif" }}>لا توجد مواد مسجلة</div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '18px' }}>
                                    <ProgressRing value={selected.progressPercentage} />
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