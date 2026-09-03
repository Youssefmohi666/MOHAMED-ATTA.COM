import React, { useEffect, useState } from "react";
import {
    TeacherDashboardOverview as OverviewData,
    fetchTeacherDashboardOverview,
    DashboardAlert,
    StudentGradeSummary,
} from "../../api/teacherDashboard.api";

// Distinct color scheme for this dashboard (emerald / teal / amber — distinct from indigo elsewhere)
const COLORS = {
    pass: "#10b981",
    fail: "#f43f5e",
    chart: ["#0d9488", "#14b8a6", "#2dd4bf", "#f59e0b", "#fbbf24", "#8b5cf6", "#3b82f6", "#ec4899", "#84cc16", "#06b6d4"],
};

const severityMeta: Record<DashboardAlert["severity"], { label: string; dot: string; bg: string; border: string }> = {
    danger: { label: "خطير", dot: "#dc2626", bg: "#dc262614", border: "#dc262640" },
    warning: { label: "تنبيه", dot: "#d97706", bg: "#d9770614", border: "#d9770640" },
    info: { label: "معلومة", dot: "#0284c7", bg: "#0284c714", border: "#0284c740" },
};

const alertTypeLabel: Record<DashboardAlert["type"], string> = {
    attendance: "الحضور",
    lecture: "المحاضرات",
};

function isEmpty(o: OverviewData | null): boolean {
    return !o || o.empty || (o.totalStudents === 0 && o.totalAssessments === 0 && o.gradeByStudent.length === 0 && o.gradeByClass.length === 0 && o.alerts.length === 0);
}

function PieDonut({ pass, fail }: { pass: number; fail: number }) {
    const total = pass + fail;
    if (total === 0) {
        return (
            <div className="w-40 h-40 rounded-full border-8 border-slate-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-2xl font-extrabold text-slate-400 font-cairo">—</div>
                </div>
            </div>
        );
    }
    const passPct = (pass / total) * 100;
    const circumference = 2 * Math.PI * 60;
    const passLen = (passPct / 100) * circumference;
    const failLen = circumference - passLen;
    return (
        <svg width="160" height="160" viewBox="0 0 160 160" className="rotate-[-90deg]">
            <circle cx="80" cy="80" r="60" fill="none" stroke={COLORS.fail} strokeWidth="20" />
            <circle cx="80" cy="80" r="60" fill="none" stroke={COLORS.pass} strokeWidth="20"
                strokeDasharray={`${passLen} ${failLen}`} strokeLinecap="round" />
        </svg>
    );
}

function BarChart({ students }: { students: StudentGradeSummary[] }) {
    if (!students.length) return null;
    const top = [...students].sort((a, b) => b.averageGrade - a.averageGrade).slice(0, 8);
    return (
        <div className="space-y-3">
            {top.map((s, i) => (
                <div key={s.studentId + i} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 truncate text-[13px] font-medium text-slate-600 font-cairo text-right">{s.studentName}</span>
                    <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                                width: `${Math.min(100, Math.max(0, s.averageGrade))}%`,
                                background: s.passed
                                    ? `linear-gradient(to left, ${COLORS.chart[i % COLORS.chart.length]}, ${COLORS.chart[(i + 1) % COLORS.chart.length]})`
                                    : `linear-gradient(to left, ${COLORS.fail}, #fb7185)`,
                            }}
                        />
                    </div>
                    <span className="w-12 shrink-0 text-[12px] font-bold font-cairo text-slate-700">{Number(s.averageGrade).toFixed(1)}%</span>
                </div>
            ))}
        </div>
    );
}

function StatCard({ label, value, suffix, color, icon }: { label: string; value: number; suffix?: string; color: string; icon: string }) {
    return (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[12px] text-slate-500 m-0 font-cairo">{label}</p>
                    <p className="text-2xl font-extrabold font-cairo m-0 mt-1" style={{ color: "#0f2233" }}>
                        {Number(value).toLocaleString('ar-EG')}{suffix && <span className="text-sm text-slate-400 mr-0.5">{suffix}</span>}
                    </p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: `${color}15` }}>{icon}</div>
            </div>
        </div>
    );
}

export default function TeacherDashboardOverview() {
    const [data, setData] = useState<OverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchTeacherDashboardOverview()
            .then(setData)
            .catch((e: any) => setError(e?.message || "تعذر تحميل لوحة التحكم"))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center text-slate-500 text-sm font-cairo">
                جاري تحميل لوحة التحكم...
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-700 text-sm font-cairo">
                {error}
            </div>
        );
    }

    const empty = isEmpty(data);

    return (
        <div className="animate-fade-in space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-extrabold text-[#0f2233] mb-0 font-cairo flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M9 8v8M12 11v5M15 8v8M18 13v3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    نظرة عامة على أداء الطلاب
                </h2>
            </div>

            {empty ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <path d="M12 8v8M8 12h8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h3 className="text-base font-bold text-[#0f2233] font-cairo mb-1.5">لا توجد بيانات بعد</h3>
                    <p className="text-[13px] text-slate-500 font-cairo leading-relaxed max-w-md mx-auto">
                        بمجرد تسجيل طلابك في موادك، وإدخال درجات التقييمات وتسجيل الحضور، ستظهر هنا النسب والإحصائيات وتنبيهات المتابعة.
                    </p>
                </div>
            ) : (
                <>
                    {/* Stat cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatCard label="متوسط الدرجات" value={data!.overallAverageGrade} suffix="%" color="#0d9488" icon="📊" />
                        <StatCard label="إجمالي الطلاب" value={data!.totalStudents} color="#14b8a6" icon="👥" />
                        <StatCard label="متوسط التقدم" value={data!.avgProgress} suffix="%" color="#f59e0b" icon="📈" />
                        <StatCard label="نسبة النجاح" value={data!.passFail.passRate} suffix="%" color="#10b981" icon="🏆" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Pass/Fail pie */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
                            <h3 className="text-sm font-bold text-[#0f2233] mb-4 font-cairo">نسبة النجاح / الرسوب</h3>
                            <div className="flex items-center gap-6 flex-wrap">
                                <div className="relative">
                                    <PieDonut pass={data!.passFail.passCount} fail={data!.passFail.failCount} />
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <span className="text-base font-extrabold font-cairo text-[#0f2233]">{data!.passFail.passRate}%</span>
                                    </div>
                                </div>
                                <div className="space-y-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full" style={{ background: COLORS.pass }} />
                                        <span className="text-sm font-medium text-slate-600 font-cairo">ناجح: <b className="text-emerald-600">{data!.passFail.passCount}</b></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full" style={{ background: COLORS.fail }} />
                                        <span className="text-sm font-medium text-slate-600 font-cairo">راسب: <b className="text-rose-600">{data!.passFail.failCount}</b></span>
                                    </div>
                                    {data!.gradeByClass.length > 0 && (
                                        <div className="pt-2 border-t border-slate-100 mt-1 space-y-1.5">
                                            {data!.gradeByClass.map((c) => (
                                                <div key={c.classRoomId} className="text-[12px] text-slate-500 font-cairo">
                                                    <span className="text-slate-600 font-bold">{c.className}:</span> {Number(c.averageGrade).toFixed(1)}%
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Grades per student bar chart */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
                            <h3 className="text-sm font-bold text-[#0f2233] mb-4 font-cairo">متوسط الدرجات لكل طالب</h3>
                            {data!.gradeByStudent.length === 0 ? (
                                <p className="text-center text-slate-500 text-[13px] font-cairo py-6">لا توجد درجات مسجلة بعد</p>
                            ) : (
                                <BarChart students={data!.gradeByStudent} />
                            )}
                        </div>
                    </div>

                    {/* Alerts feed */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-[#0f2233] font-cairo">تنبيهات المتابعة</h3>
                            <span className="text-[11px] text-slate-400 font-cairo">{data!.alerts.length} تنبيه</span>
                        </div>
                        {data!.alerts.length === 0 ? (
                            <p className="text-center text-slate-500 text-[13px] font-cairo py-4">لا توجد تنبيهات — كل شيء على ما يرام 🎉</p>
                        ) : (
                            <div className="space-y-2.5 max-h-72 overflow-y-auto pl-1">
                                {data!.alerts.map((a, i) => {
                                    const meta = severityMeta[a.severity];
                                    return (
                                        <div key={i} className="flex items-start gap-3 rounded-xl px-3.5 py-3 border" style={{ background: meta.bg, borderColor: meta.border }}>
                                            <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: meta.dot }} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[13px] font-bold text-[#0f2233] font-cairo">{a.title}</span>
                                                    <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 font-cairo" style={{ background: `${meta.dot}18`, color: meta.dot }}>
                                                        {alertTypeLabel[a.type]} · {meta.label}
                                                    </span>
                                                </div>
                                                <p className="text-[12px] text-slate-600 font-cairo mt-0.5 m-0">
                                                    {a.studentName ? <span className="font-semibold text-[#0f2233]">{a.studentName}: </span> : null}{a.message}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
