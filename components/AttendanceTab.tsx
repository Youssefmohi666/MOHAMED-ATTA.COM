import React, { useState, useEffect, useCallback } from 'react';
import {
    AttendanceStudent, AttendanceStatsRow, AttendanceStatus,
    getAttendanceSheet, getAttendanceStats, saveAttendance,
} from '../api/attendance.api';

interface AttendanceTabProps {
    showToast: (msg: string, ok?: boolean) => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    present: { label: 'حاضر', color: '#16a34a', bg: '#16a34a15' },
    absent: { label: 'غائب', color: '#dc2626', bg: '#dc262615' },
    late: { label: 'متأخر', color: '#d97706', bg: '#d9770615' },
    excused: { label: 'معذور', color: '#0284c7', bg: '#0284c715' },
    unmarked: { label: 'لم يُسجل', color: '#64748b', bg: '#64748b15' },
};

function StatusPill({ status, onClick }: { status: AttendanceStatus | 'unmarked'; onClick?: () => void }) {
    const meta = STATUS_LABELS[status] || STATUS_LABELS.unmarked;
    const Tag = onClick ? 'button' : 'span';
    return (
        <Tag
            onClick={onClick}
            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[12px] font-semibold border transition-all duration-150 ${onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}`}
            style={{ background: meta.bg, color: meta.color, borderColor: `${meta.color}25` }}
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

export default function AttendanceTab({ showToast }: AttendanceTabProps) {
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
        import('../api/admin.api').then(({ getSubjectsList }) =>
            getSubjectsList().then((r: any) => setSubjects(r?.data || [])).catch(() => {})
        );
    }, []);

    const loadSheet = useCallback(async (sid: string, d: string) => {
        setLoading(true);
        try {
            const r = await getAttendanceSheet(sid, d);
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
            getAttendanceStats(subjectId).then(r => setStats(r?.data || [])).catch(() => setStats([]));
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
            const r = await saveAttendance(items);
            showToast(`تم تسجيل الحضور (${r?.created ?? 0} جديد، ${r?.updated ?? 0} محدث)`);
            loadSheet(subjectId, date);
        } catch (e: any) {
            showToast(e?.message || 'حدث خطأ في الحفظ', false);
        }
        setSaving(false);
    };

    const unmarkedCount = sheet.filter(s => !draft[s.studentId]).length;
    const markedCount = sheet.length - unmarkedCount;

    const fieldCls = "font-cairo px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-[#0f2233] text-sm outline-none focus:border-[#1E3A8A]/40 focus:ring-2 focus:ring-[#1E3A8A]/10 transition-all duration-150 cursor-pointer select-light";

    return (
        <div>
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <select
                        value={subjectId}
                        onChange={e => setSubjectId(e.target.value)}
                        className={fieldCls}
                    >
                        <option value="">-- اختر مادة --</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className={fieldCls}
                    />
                    <div className="flex gap-1 p-0.5 bg-slate-100 rounded-xl border border-slate-200">
                        <button
                            onClick={() => setView('sheet')}
                            className={`font-cairo px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 cursor-pointer border-none ${view === 'sheet' ? 'bg-emerald-600 text-white' : 'bg-transparent text-slate-500 hover:text-[#0f2233]'}`}
                        >
                            تسجيل الحضور
                        </button>
                        <button
                            onClick={() => setView('stats')}
                            className={`font-cairo px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 cursor-pointer border-none ${view === 'stats' ? 'bg-[#1E3A8A] text-white' : 'bg-transparent text-slate-500 hover:text-[#0f2233]'}`}
                        >
                            الإحصائيات
                        </button>
                    </div>
                </div>
                {view === 'sheet' && subjectId && (
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-slate-500 text-[13px]">{markedCount} مسجل</span>
                            {unmarkedCount > 0 && (
                                <>
                                    <span className="text-slate-300">·</span>
                                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                                    <span className="text-slate-400 text-[13px]">{unmarkedCount} بدون تسجيل</span>
                                </>
                            )}
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving || !subjectId}
                            className="font-cairo cursor-pointer px-4 py-2 text-[13px] rounded-lg font-semibold text-white transition-all duration-150 border-none bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
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
                                    <th className="font-cairo px-4 py-3 text-right text-[11px] text-slate-500 font-semibold whitespace-nowrap">الطالب</th>
                                    <th className="font-cairo px-4 py-3 text-right text-[11px] text-slate-500 font-semibold whitespace-nowrap">البريد الإلكتروني</th>
                                    <th className="font-cairo px-4 py-3 text-right text-[11px] text-slate-500 font-semibold whitespace-nowrap">الحالة (اضغط للتغيير)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    [1, 2, 3, 4, 5].map(i => (
                                        <tr key={i} className="border-b border-slate-100">
                                            <td className="px-4 py-3"><div className="animate-pulse bg-slate-100 rounded-lg h-4 w-full" /></td>
                                            <td className="px-4 py-3"><div className="animate-pulse bg-slate-100 rounded-lg h-4 w-full" /></td>
                                            <td className="px-4 py-3"><div className="animate-pulse bg-slate-100 rounded-lg h-4 w-24" /></td>
                                        </tr>
                                    ))
                                ) : sheet.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-16 text-center text-slate-500">
                                            <p className="m-0">اختر مادة لعرض الطلاب المسجلين فيها</p>
                                        </td>
                                    </tr>
                                ) : sheet.map(s => (
                                    <tr key={s.studentId} className="border-b border-slate-100 hover:bg-[#1E3A8A]/[0.03] transition-colors duration-100">
                                        <td className="px-4 py-3 text-[#0f2233] align-middle font-medium font-cairo">{s.studentName}</td>
                                        <td className="px-4 py-3 align-middle">
                                            <span style={{ direction: 'ltr' }} className="inline-block text-slate-500 text-[13px]">{s.studentEmail || '—'}</span>
                                        </td>
                                        <td className="px-4 py-3 align-middle">
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
                                    <th className="font-cairo px-4 py-3 text-right text-[11px] text-slate-500 font-semibold whitespace-nowrap">الطالب</th>
                                    <th className="font-cairo px-4 py-3 text-right text-[11px] text-emerald-600 font-semibold whitespace-nowrap">حاضر</th>
                                    <th className="font-cairo px-4 py-3 text-right text-[11px] text-red-600 font-semibold whitespace-nowrap">غائب</th>
                                    <th className="font-cairo px-4 py-3 text-right text-[11px] text-amber-600 font-semibold whitespace-nowrap">متأخر</th>
                                    <th className="font-cairo px-4 py-3 text-right text-[11px] text-blue-600 font-semibold whitespace-nowrap">معذور</th>
                                    <th className="font-cairo px-4 py-3 text-right text-[11px] text-slate-500 font-semibold whitespace-nowrap">الإجمالي</th>
                                    <th className="font-cairo px-4 py-3 text-right text-[11px] text-slate-500 font-semibold whitespace-nowrap">نسبة الحضور</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-16 text-center text-slate-500">
                                            <p className="m-0">لا توجد إحصائيات مسجلة بعد لهذه المادة</p>
                                        </td>
                                    </tr>
                                ) : stats.map(s => {
                                    const rateColor = s.attendanceRate >= 75 ? '#16a34a' : s.attendanceRate >= 50 ? '#d97706' : '#dc2626';
                                    return (
                                        <tr key={s.studentId} className="border-b border-slate-100 hover:bg-[#1E3A8A]/[0.03] transition-colors duration-100">
                                            <td className="px-4 py-3 text-[#0f2233] align-middle font-medium font-cairo">{s.studentName}</td>
                                            <td className="px-4 py-3 align-middle"><span className="text-emerald-600 font-semibold">{s.present}</span></td>
                                            <td className="px-4 py-3 align-middle"><span className="text-red-600 font-semibold">{s.absent}</span></td>
                                            <td className="px-4 py-3 align-middle"><span className="text-amber-600 font-semibold">{s.late}</span></td>
                                            <td className="px-4 py-3 align-middle"><span className="text-blue-600 font-semibold">{s.excused}</span></td>
                                            <td className="px-4 py-3 align-middle text-slate-600 font-medium">{s.total}</td>
                                            <td className="px-4 py-3 align-middle">
                                                <span
                                                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-[12px] font-semibold border"
                                                    style={{ background: `${rateColor}15`, color: rateColor, borderColor: `${rateColor}25` }}
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