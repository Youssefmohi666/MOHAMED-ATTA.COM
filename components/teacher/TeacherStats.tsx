import React from 'react';

interface Stat { label: string; value: string; color: string; bg: string; border: string; icon: React.ReactNode }

interface TeacherStatsProps {
    totalSubjects: number;
    totalStudents: number;
    totalLectures: number;
    publishedCount: number;
}

const TeacherStats: React.FC<TeacherStatsProps> = ({ totalSubjects, totalStudents, totalLectures, publishedCount }) => {
    const stats: Stat[] = [
        {
            label: 'عدد المواد', value: totalSubjects.toString(),
            color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)',
            icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" strokeLinecap="round" strokeLinejoin="round"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
        },
        {
            label: 'إجمالي الطلاب', value: totalStudents.toString(),
            color: '#38bdf8', bg: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.18)',
            icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round"/></svg>,
        },
        {
            label: 'المحاضرات', value: totalLectures.toString(),
            color: '#a855f7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.18)',
            icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7" strokeLinecap="round" strokeLinejoin="round"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
        },
        {
            label: 'منشورة', value: publishedCount.toString(),
            color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.18)',
            icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" strokeLinecap="round" strokeLinejoin="round"/><polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round"/></svg>,
        },
    ];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '24px' }}
            className="teacher-stats">
            {stats.map((s, i) => (
                <div key={i} style={{
                    background: s.bg, border: `1px solid ${s.border}`,
                    borderRadius: '14px', padding: '18px 16px',
                    display: 'flex', alignItems: 'center', gap: '14px',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
                    onMouseOver={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseOut={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                    <div style={{
                        width: '44px', height: '44px', borderRadius: '12px',
                        background: '#ffffff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        {s.icon}
                    </div>
                    <div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', fontFamily: "'Cairo', sans-serif" }}>{s.label}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TeacherStats;
