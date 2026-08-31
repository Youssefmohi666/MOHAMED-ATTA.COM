import React from 'react';
import { Subject } from './types';

interface TeacherSubjectsGridProps {
    subjects: Subject[];
    onEdit: (subject: Subject) => void;
    onTogglePublish: (id: string) => void;
    onDelete: (id: string) => void;
    onCreateNew: () => void;
    onViewLectures: (subject: Subject) => void;
}

const SubjectCard: React.FC<{
    subject: Subject;
    onEdit: () => void;
    onTogglePublish: () => void;
    onDelete: () => void;
    onViewLectures: () => void;
}> = ({ subject, onEdit, onTogglePublish, onDelete, onViewLectures }) => {
    const lecCount = subject.levels.reduce((a, l) => a + l.lectures.length, 0);
    const isPublished = subject.status === 'published';

    return (
        <div
            className="bg-white border border-slate-200/80 rounded-2xl p-4 transition-all duration-200 hover:border-amber-400/60 hover:shadow-lg hover:shadow-amber-500/5 cursor-default"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3.5">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl shrink-0 bg-amber-50 flex items-center justify-center">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-[15px] font-bold text-[#0f2233] m-0 font-cairo overflow-hidden text-ellipsis whitespace-nowrap">
                            {subject.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 m-0 font-cairo overflow-hidden text-ellipsis whitespace-nowrap">
                            {subject.description || '—'}
                        </p>
                    </div>
                </div>
                <span className={[
                    'shrink-0 mr-2 px-2.5 py-0.5 rounded-md text-[11px] font-bold border font-cairo',
                    isPublished
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-amber-50 text-amber-600 border-amber-100',
                ].join(' ')}>
                    {isPublished ? 'منشورة' : 'مسودة'}
                </span>
            </div>

            {/* Metrics */}
            <div className="flex mb-3.5 bg-slate-50 rounded-xl overflow-hidden border border-slate-200/70">
                {[
                    { label: 'مستوى', value: subject.levels.length, color: 'text-amber-500' },
                    { label: 'محاضرة', value: lecCount, color: 'text-sky-600' },
                    { label: 'طالب', value: subject.students, color: 'text-purple-600' },
                ].map((m, i, arr) => (
                    <div
                        key={i}
                        className={['flex-1 text-center py-2.5 px-1', i < arr.length - 1 ? 'border-l border-slate-200' : ''].join(' ')}
                    >
                        <div className={`text-[17px] font-extrabold ${m.color}`}>{m.value}</div>
                        <div className="text-[11px] text-slate-500 font-cairo">{m.label}</div>
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="flex gap-1.5">
                <button
                    onClick={onViewLectures}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-sky-50 border border-sky-100 text-sky-700 text-[13px] font-semibold hover:bg-sky-100 transition-colors duration-200 cursor-pointer font-cairo"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                    المحاضرات
                </button>
                <button
                    onClick={onEdit}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 text-[13px] font-semibold hover:bg-amber-100 transition-colors duration-200 cursor-pointer font-cairo"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    تعديل
                </button>
                <button
                    onClick={onTogglePublish}
                    className={[
                        'flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[13px] font-semibold transition-colors duration-200 cursor-pointer border font-cairo',
                        isPublished
                            ? 'bg-red-50 border-red-100 text-[#DC2626] hover:bg-red-100'
                            : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100',
                    ].join(' ')}
                >
                    {isPublished ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="6" y="4" width="4" height="16" rx="1"/>
                            <rect x="14" y="4" width="4" height="16" rx="1"/>
                        </svg>
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="5 3 19 12 5 21 5 3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    )}
                </button>
                <button
                    onClick={onDelete}
                    className="p-2 rounded-xl bg-red-50 border border-red-100 text-[#DC2626] hover:bg-red-100 transition-colors duration-200 cursor-pointer shrink-0"
                >
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

const TeacherSubjectsGrid: React.FC<TeacherSubjectsGridProps> = ({
    subjects, onEdit, onTogglePublish, onDelete, onCreateNew, onViewLectures,
}) => (
    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-[#1E3A8A]/5 transition-shadow duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h2 className="text-[17px] font-extrabold text-[#0f2233] m-0 font-cairo">موادي التعليمية</h2>
            </div>
            <span className="text-xs text-slate-500 font-cairo">{subjects.length} مادة</span>
        </div>

        <div className="p-4">
            {subjects.length === 0 ? (
                <div data-testid="empty-state" className="text-center py-14 px-5">
                    <div className="w-16 h-16 rounded-[18px] bg-amber-50 flex items-center justify-center mx-auto mb-4">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5">
                            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <h3 className="text-[17px] font-bold text-[#0f2233] mb-2 font-cairo">لا توجد مواد بعد</h3>
                    <p className="text-[13px] text-slate-500 mb-5 font-cairo">ابدأ بإنشاء مادتك الأولى</p>
                    <button
                        onClick={onCreateNew}
                        className="bg-gradient-to-r from-[#f59e0b] to-[#d97706] border-none rounded-xl px-5 py-2.5 text-white text-sm font-bold cursor-pointer font-cairo hover:opacity-90 transition-opacity duration-200 shadow-lg shadow-amber-500/20"
                    >
                        إنشاء مادة جديدة
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                    {subjects.map(s => (
                        <SubjectCard
                            key={s.id}
                            subject={s}
                            onEdit={() => onEdit(s)}
                            onTogglePublish={() => onTogglePublish(s.id)}
                            onDelete={() => onDelete(s.id)}
                            onViewLectures={() => onViewLectures(s)}
                        />
                    ))}
                    {/* Add new card */}
                    <button
                        onClick={onCreateNew}
                        className="bg-slate-50 border-2 border-dashed border-slate-300 hover:border-amber-400/50 hover:bg-white rounded-2xl py-9 px-5 cursor-pointer flex flex-col items-center justify-center gap-2.5 text-slate-500 font-cairo transition-all duration-200"
                    >
                        <div className="w-12 h-12 rounded-[14px] bg-amber-50 flex items-center justify-center">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                                <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <span className="text-[13px] font-semibold">إضافة مادة جديدة</span>
                    </button>
                </div>
            )}
        </div>
    </div>
);

export default TeacherSubjectsGrid;
