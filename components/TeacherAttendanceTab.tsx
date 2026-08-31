import React, { useState, useEffect, useCallback } from 'react';
import {
    AttendanceStudent, AttendanceStatsRow, AttendanceStatus,
    getTeacherAttendanceSheet, getTeacherAttendanceStats, saveTeacherAttendance,
} from '../api/attendance.api';

interface TeacherAttendanceTabProps {
    showToast: (msg: string, ok?: boolean) => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    present: { label: 'حاضر', color: '#22c55e' },
    absent: { label: 'غائب', color: '#ef4444' },
    late: { label: 'متأخر', color: '#f59e0b' },
    excused: { label: 'معذور', color: '#38bdf8' },
    unmarked: { label: 'لم يُسجل', color: '#64748b' },
};

function StatusPill({ status, onClick }: { status: AttendanceStatus | 'unmarked'; onClick?: () => void }) {
    const meta = STATUS_LABELS[status] || STATUS_LABELS.unmarked;
    const Tag = onClick ? 'button' : 'span';
    return (
        <Tag
            onClick={onClick}
            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${onClick ? 'cursor-pointer transition-transform hover:scale-105' : ''}`}
            style={{ background: `${meta.color}20`, color: meta.color, borderColor: `${meta.color}40` }}
        >
            {meta.label}
        </Tag>
    );
}

const STATUS_CYCLE: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];

function todayStr() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}

export default function TeacherAttendanceTab({ showToast }: TeacherAttendanceTabProps) {
    const [subjects, setSubjects] = useState<{ id: string; title: string }[]>([]);
    const [subjectId, setSubjectId] = useState('');
    const [date, setDate] = useState(todayStr());
    const [sheet, setSheet] = useState<AttendanceStudent[]>([]);
    const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});
    const [stats, setStats] = useState<AttendanceStatsRow[]>([]);
    const [view, setView] = useState<'sheet' | 'stats'>('sheet');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        import('../api/teacher.api').then(({ fetchTeacherSubjects }) =>
            fetchTeacherSubjects()
                .then((r: any) => {
                    const list = Array.isArray(r) ? r : r?.data || [];
                    setSubjects(list.map((s: any) => ({ id: s.id?.toString(), title: s.title || s.name || '' })));
                })
                .catch(() => {})
        );
    }, []);

    const loadSheet = useCallback(async (sid: string, d: string) => {
        setLoading(true);
        try {
            const r = await getTeacherAttendanceSheet(sid, d);
            const rows: AttendanceStudent[] = r?.data || [];
            setSheet(rows);
            const dd: Record<string, AttendanceStatus> = {};
            rows.forEach(s => { if (s.status !== 'unmarked') dd[s.studentId] = s.status as AttendanceStatus; });
            setDraft(dd);
        } catch { setSheet([]); setDraft({}); }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (subjectId) loadSheet(subjectId, date);
    }, [subjectId, date, loadSheet]);

    useEffect(() => {
        if (view === 'stats' && subjectId) {
            getTeacherAttendanceStats(subjectId).then(r => setStats(r?.data || [])).catch(() => setStats([]));
        }
    }, [view, subjectId]);

    const cycle = (studentId: string) => {
        setDraft(prev => {
            const cur = prev[studentId];
            const next = cur ? STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length] : STATUS_CYCLE[0];
            return { ...prev, [studentId]: next };
        });
    };

    const handleSave = async () => {
        if (!subjectId) return;
        setSaving(true);
        try {
            const items = Object.entries(draft)
                .map(([studentId, status]) => ({ studentId, subjectId, date, status }));
            if (items.length === 0) {
                showToast('لا توجد حالات لتسجيلها', false);
                return;
            }
            const r = await saveTeacherAttendance(items);
            showToast(`تم تسجيل الحضور (${r?.created ?? 0} جديد، ${r?.updated ?? 0} محدث)`);
            loadSheet(subjectId, date);
        } catch (e: any) {
            showToast(e?.message || 'حدث خطأ في الحفظ', false);
        }
        setSaving(false);
    };

    const unmarkedCount = sheet.filter(s => !draft[s.studentId]).length;

    const selectCls = "font-cairo px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-[#0f2233] text-sm outline-none focus:border-[#1E3A8A]/40 focus:ring-2 focus:ring-[#1E3A8A]/10 cursor-pointer select-light";

    return (
        <div>
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                    <select
                        value={subjectId}
                        onChange={e => setSubjectId(e.target.value)}
                        className={selectCls}
                    >
                        <option value="">-- اختر مادة --</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="font-cairo px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-[#0f2233] text-sm outline-none focus:border-[#1E3A8A]/40 focus:ring-2 focus:ring-[#1E3A8A]/10"
                    />
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => setView('sheet')}
                            className={`font-cairo px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${view === 'sheet' ? '' : 'text-slate-500 hover:text-[#0f2233]'}`}
                            style={view === 'sheet' ? { background: '#22c55e20', color: '#16a34a', border: '1px solid #22c55e40' } : { border: '1px solid transparent' }}
                        >
                            تسجيل الحضور
                        </button>
                        <button
                            onClick={() => setView('stats')}
                            className={`font-cairo px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${view === 'stats' ? '' : 'text-slate-500 hover:text-[#0f2233]'}`}
                            style={view === 'stats' ? { background: '#38bdf820', color: '#0284c7', border: '1px solid #38bdf840' } : { border: '1px solid transparent' }}
                        >
                            الإحصائيات
                        </button>
                    </div>
                </div>
                {view === 'sheet' && subjectId && (
                    <div className="flex items-center gap-2.5">
                        <span className="text-slate-500 text-[13px]">{unmarkedCount} بدون تسجيل</span>
                        <button
                            onClick={handleSave}
                            disabled={saving || !subjectId}
                            className="font-cairo cursor-pointer px-4 py-[7px] text-[13px] rounded-lg font-semibold text-white transition-opacity disabled:opacity-50"
                            style={{ background: '#22c55e' }}
                        >
                            {saving ? 'جاري الحفظ...' : 'حفظ الحضور'}
                        </button>
                    </div>
                )}
            </div>

            {/* Sheet view */}
            {view === 'sheet' && (
                <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-[#1E3A8A]/5 transition-shadow duration-200">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/60">
                                    <th className="font-cairo px-3.5 py-2.5 text-slate-500 font-semibold text-right whitespace-nowrap text-[13px]">الطالب</th>
                                    <th className="font-cairo px-3.5 py-2.5 text-slate-500 font-semibold text-right whitespace-nowrap text-[13px]">البريد الإلكتروني</th>
                                    <th className="font-cairo px-3.5 py-2.5 text-slate-500 font-semibold text-right whitespace-nowrap text-[13px]">الحالة (اضغط للتغيير)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    [1, 2, 3, 4, 5].map(i => (
                                        <tr key={i} className="border-b border-slate-100">
                                            <td className="px-3.5 py-3"><div className="animate-pulse bg-slate-100 rounded h-4 w-full" /></td>
                                            <td className="px-3.5 py-3"><div className="animate-pulse bg-slate-100 rounded h-4 w-full" /></td>
                                            <td className="px-3.5 py-3"><div className="animate-pulse bg-slate-100 rounded h-4 w-24" /></td>
                                        </tr>
                                    ))
                                ) : sheet.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-3.5 py-10 text-center text-slate-500">اختر مادة لعرض الطلاب المسجلين فيها</td>
                                    </tr>
                                ) : sheet.map(s => (
                                    <tr key={s.studentId} className="border-b border-slate-100 hover:bg-[#1E3A8A]/[0.03] transition-colors duration-150">
                                        <td className="px-3.5 py-2.5 text-[#0f2233] align-middle font-medium font-cairo">{s.studentName}</td>
                                        <td className="px-3.5 py-2.5 align-middle">
                                            <span style={{ direction: 'ltr' }} className="inline-block text-slate-500 text-[13px]">{s.studentEmail || '—'}</span>
                                        </td>
                                        <td className="px-3.5 py-2.5 align-middle">
                                            <StatusPill status={draft[s.studentId] || 'unmarked'} onClick={() => cycle(s.studentId)} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Stats view */}
            {view === 'stats' && (
                <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-[#1E3A8A]/5 transition-shadow duration-200">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/60">
                                    <th className="font-cairo px-3.5 py-2.5 text-slate-500 font-semibold text-right whitespace-nowrap text-[13px]">الطالب</th>
                                    <th className="font-cairo px-3.5 py-2.5 text-slate-500 font-semibold text-right whitespace-nowrap text-[13px]">حاضر</th>
                                    <th className="font-cairo px-3.5 py-2.5 text-slate-500 font-semibold text-right whitespace-nowrap text-[13px]">غائب</th>
                                    <th className="font-cairo px-3.5 py-2.5 text-slate-500 font-semibold text-right whitespace-nowrap text-[13px]">متأخر</th>
                                    <th className="font-cairo px-3.5 py-2.5 text-slate-500 font-semibold text-right whitespace-nowrap text-[13px]">معذور</th>
                                    <th className="font-cairo px-3.5 py-2.5 text-slate-500 font-semibold text-right whitespace-nowrap text-[13px]">الإجمالي</th>
                                    <th className="font-cairo px-3.5 py-2.5 text-slate-500 font-semibold text-right whitespace-nowrap text-[13px]">نسبة الحضور</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-3.5 py-10 text-center text-slate-500">لا توجد إحصائيات مسجلة بعد لهذه المادة</td>
                                    </tr>
                                ) : stats.map(s => {
                                    const rateColor = s.attendanceRate >= 75 ? '#16a34a' : s.attendanceRate >= 50 ? '#d97706' : '#dc2626';
                                    return (
                                        <tr key={s.studentId} className="border-b border-slate-100 hover:bg-[#1E3A8A]/[0.03] transition-colors duration-150">
                                            <td className="px-3.5 py-2.5 text-[#0f2233] align-middle font-medium font-cairo">{s.studentName}</td>
                                            <td className="px-3.5 py-2.5 align-middle"><span style={{ color: '#16a34a' }}>{s.present}</span></td>
                                            <td className="px-3.5 py-2.5 align-middle"><span style={{ color: '#dc2626' }}>{s.absent}</span></td>
                                            <td className="px-3.5 py-2.5 align-middle"><span style={{ color: '#d97706' }}>{s.late}</span></td>
                                            <td className="px-3.5 py-2.5 align-middle"><span style={{ color: '#0284c7' }}>{s.excused}</span></td>
                                            <td className="px-3.5 py-2.5 align-middle text-[#0f2233] font-cairo">{s.total}</td>
                                            <td className="px-3.5 py-2.5 align-middle">
                                                <span
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border"
                                                    style={{ background: `${rateColor}20`, color: rateColor, borderColor: `${rateColor}40` }}
                                                >
                                                    {s.attendanceRate}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}