import React, { useState, useEffect, useRef } from 'react';
import { Page } from '../App';
import { fetchCourseById, fetchSubjectById } from '../api/courses.api';
import { validateSession } from '../api/auth.api';
import { getProgress } from '../api/student.api';
import { useAuth } from '../contexts/AuthContext';
import {
    Lecture, Subject,
    useScreenProtection, Watermark, RecordingBlocker,
    PlyrYouTube, PlyrVideo, getVideoType, extractYouTubeId, getDriveFileId,
} from './videoViewerUtils';
import MediaGallery from './MediaGallery';
import SecureVideoPlayer from './SecureVideoPlayer';

const FONT = "'Cairo', sans-serif";

// Format duration from either "mm:ss" string or raw seconds number
const formatDuration = (d: any): string => {
    if (!d) return '00:00';
    if (typeof d === 'string' && d.includes(':')) return d;
    const s = Number(d) || 0;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

interface VideoViewerProps {
    onNavigate: (page: Page, payload?: { courseId?: number | string }) => void;
    courseId?: number | string | null;
    lectureData?: { subjectName: string; lectureName: string; lectureIndex: number; subjectIndex: number };
}

// ── Loading state ─────────────────────────────────────────────────────────────
const LoadingScreen: React.FC = () => (
    <div dir="rtl" style={{ display: 'flex', minHeight: '100vh', background: '#0a0f1e', fontFamily: FONT, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.5" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
            </svg>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 600, marginTop: '16px' }}>جاري تحميل المحاضرة...</div>
        </div>
    </div>
);

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyScreen: React.FC<{ hasSubjects: boolean; onBack: () => void }> = ({ hasSubjects, onBack }) => (
    <div dir="rtl" style={{ display: 'flex', minHeight: '100vh', background: '#0a0f1e', fontFamily: FONT, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1">
            <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" strokeLinecap="round" />
        </svg>
        <div style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 700 }}>
            {hasSubjects ? 'لا توجد محاضرات بعد' : 'لم يتم العثور على المادة'}
        </div>
        <div style={{ color: '#64748b', fontSize: '14px' }}>
            {hasSubjects ? 'لم يقم المعلم بإضافة محاضرات لهذه المادة حتى الآن' : 'تحقق من الرابط أو عد إلى لوحة التحكم'}
        </div>
        <button onClick={onBack} style={{ marginTop: '8px', padding: '10px 28px', borderRadius: '10px', background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, fontFamily: FONT }}>
            العودة للوحة التحكم
        </button>
    </div>
);

// ── Drive video player (Google Drive /preview embed) ─────────────────────────
const DriveVideo: React.FC<{ lecture: Lecture }> = ({ lecture }) => {
    const driveId = getDriveFileId(lecture.videoUrl!);
    const viewUrl = driveId ? `https://drive.google.com/file/d/${driveId}/view` : null;

    if (!driveId) {
        return (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: 'radial-gradient(ellipse at center, #111827 0%, #0a0f1e 100%)' }}>
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M10 8l6 4-6 4V8z" /></svg>
                <span style={{ color: '#94a3b8', fontSize: '14px', fontFamily: FONT }}>تعذّر تشغيل الفيديو</span>
                {viewUrl && (
                    <a href={viewUrl} target="_blank" rel="noopener noreferrer"
                        style={{ padding: '9px 22px', borderRadius: '8px', background: 'linear-gradient(135deg,#0ea5e9,#2563eb)', color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: 600, fontFamily: FONT }}>
                        فتح في Google Drive
                    </a>
                )}
            </div>
        );
    }

    const embedUrl = `https://drive.google.com/file/d/${driveId}/preview`;

    return (
        <iframe
            key={lecture.id}
            src={embedUrl}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            allow="autoplay; fullscreen"
            title={lecture.title}
        />
    );
};

// ── Video area ────────────────────────────────────────────────────────────────
const VideoArea: React.FC<{ lecture: Lecture; watermarkLabel: string; sessionId: string; isRecording: boolean; userEmail?: string }> = ({ lecture, watermarkLabel, sessionId, isRecording, userEmail }) => {
    const vtype = lecture.videoUrl ? getVideoType(lecture.videoUrl) : null;
    const hasUploadedMedia = !!lecture.mediaFileId;

    return (
        <div style={{ flex: 1, background: '#000', position: 'relative', minHeight: 0, overflow: 'hidden' }} onContextMenu={e => e.preventDefault()}>
            <Watermark label={watermarkLabel} sessionId={sessionId} />
            {isRecording && <RecordingBlocker />}

            {hasUploadedMedia ? (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <SecureVideoPlayer lectureId={lecture.id} mediaFileId={lecture.mediaFileId!} userEmail={userEmail} userName={watermarkLabel} />
                </div>
            ) : lecture.videoUrl && vtype === 'youtube' ? (() => {
                const ytId = extractYouTubeId(lecture.videoUrl!);
                return ytId
                    ? <PlyrYouTube key={lecture.id} videoId={ytId} />
                    : <CenteredMsg>رابط يوتيوب غير صالح</CenteredMsg>;
            })() : lecture.videoUrl && vtype === 'drive' ? (
                <DriveVideo lecture={lecture} />
            ) : lecture.videoUrl ? (
                <PlyrVideo src={lecture.videoUrl} />
            ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', background: 'radial-gradient(ellipse at center, #111827 0%, #0a0f1e 100%)' }}>
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M10 8l6 4-6 4V8z" /></svg>
                    <span style={{ color: '#334155', fontSize: '14px', fontFamily: FONT }}>لا يوجد فيديو لهذه المحاضرة</span>
                </div>
            )}
        </div>
    );
};

const CenteredMsg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontFamily: FONT }}>{children}</div>
);

// ── Sidebar lecture item ──────────────────────────────────────────────────────
const LectureItem: React.FC<{ lec: Lecture; active: boolean; onClick: () => void }> = ({ lec, active, onClick }) => (
    <button
        onClick={onClick}
        style={{ width: '100%', background: active ? 'rgba(56,189,248,0.08)' : 'transparent', border: active ? '1px solid rgba(56,189,248,0.2)' : '1px solid transparent', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '2px', fontFamily: FONT, transition: 'background 0.15s' }}
        onMouseOver={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
        onMouseOut={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
        {active ? (
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(56,189,248,0.15)', border: '2px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#38bdf8', display: 'block' }} />
            </span>
        ) : lec.completed ? (
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
        ) : (
            <span style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid #1e293b', flexShrink: 0, display: 'block' }} />
        )}
        <span style={{ flex: 1, textAlign: 'right', fontSize: '13px', color: active ? '#38bdf8' : '#94a3b8', fontWeight: active ? 600 : 400 }}>{lec.title}</span>
        {lec.duration && lec.duration !== '00:00' && (
            <span style={{ fontSize: '11px', color: active ? '#38bdf8' : '#334155', flexShrink: 0 }}>{lec.duration}</span>
        )}
    </button>
);

// ── Main component ────────────────────────────────────────────────────────────
const VideoViewer: React.FC<VideoViewerProps> = ({ onNavigate, lectureData, courseId }) => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [currentLecture, setCurrentLecture] = useState<Lecture | null>(null);
    const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
    const [notes, setNotes] = useState('');
    const [showNotes, setShowNotes] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const { user } = useAuth();
    const isRecording = useScreenProtection();
    const watermarkLabel = user?.name || user?.email || 'mohamed-atta.com';
    const sessionId = useRef(`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`).current;

    useEffect(() => {
        const load = async () => {
            if (!courseId) { setIsLoading(false); return; }
            setIsLoading(true);
            try {
                if (user?.role === 'student') {
                    const session = await validateSession(String(courseId)).catch(() => null);
                    if (!session?.enrolled) {
                        onNavigate('course-detail', { courseId: typeof courseId === 'number' ? courseId : undefined });
                        return;
                    }
                }
                let courseData: any = null;
                if (typeof courseId === 'string' && courseId.includes('-')) {
                    const result = await fetchSubjectById(courseId);
                    courseData = result.data;
                } else {
                    const result = await fetchCourseById(Number(courseId));
                    courseData = result.data;
                }
                if (courseData?.curriculum) {
                    const mapped: Subject[] = courseData.curriculum.map((section: any, idx: number) => ({
                        id: `section-${idx}`,
                        name: section.section || section.title,
                        instructor: courseData.instructorName || 'المعلم',
                        avatarBg: 'linear-gradient(135deg,#667eea,#764ba2)',
                        lectureCount: `${section.lectures?.length || 0} محاضرات`,
                        lectures: (section.lectures || []).map((lec: any, lIdx: number) => ({
                            id: String(lec.id ?? `lec-${idx}-${lIdx}`),
                            title: typeof lec === 'string' ? lec : lec.title,
                            duration: formatDuration(lec.duration),
                            videoUrl: lec.videoUrl || '',
                            mediaFileId: lec.mediaFileId || undefined,
                            completed: false,
                        })),
                    }));
                    setSubjects(mapped);

                    // Fetch progress for students and mark completed lectures
                    if (user?.role === 'student') {
                        try {
                            const progressData = await getProgress();
                            const completedIds = new Set<string>();
                            const progressMap = new Map<string, number>();
                            if (progressData?.subjects) {
                                for (const subj of progressData.subjects) {
                                    for (const lec of subj.lectures || []) {
                                        if (lec.completed) completedIds.add(lec.lectureId);
                                        progressMap.set(lec.lectureId, lec.progressPct || 0);
                                    }
                                }
                            }
                            for (const subj of mapped) {
                                for (const lec of subj.lectures) {
                                    lec.completed = completedIds.has(lec.id);
                                }
                            }
                            setSubjects([...mapped]);
                        } catch { /* progress fetch is non-critical */ }
                    }

                    if (mapped.length > 0 && mapped[0].lectures.length > 0) {
                        setCurrentSubject(mapped[0]);
                        setCurrentLecture(mapped[0].lectures[0]);
                    }
                }
            } catch (err) { console.error('Error loading course', err); }
            finally { setIsLoading(false); }
        };
        load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId]);

    useEffect(() => {
        if (lectureData && subjects.length > 0) {
            const subject = subjects[lectureData.subjectIndex];
            if (subject) {
                const lecture = subject.lectures[lectureData.lectureIndex];
                if (lecture) { setCurrentLecture(lecture); setCurrentSubject(subject); }
            }
        }
    }, [lectureData, subjects]);

    const selectLecture = (lecture: Lecture, subject: Subject) => { setCurrentLecture(lecture); setCurrentSubject(subject); };

    const findAdjacent = (dir: 'next' | 'prev') => {
        if (!currentSubject || !currentLecture) return null;
        const idx = currentSubject.lectures.findIndex(l => l.id === currentLecture.id);
        if (idx === -1) return null;
        const next = dir === 'next' ? idx + 1 : idx - 1;
        if (next < 0 || next >= currentSubject.lectures.length) return null;
        return { lecture: currentSubject.lectures[next], subject: currentSubject };
    };

    if (isLoading) return <LoadingScreen />;
    if (!currentLecture || !currentSubject) return <EmptyScreen hasSubjects={subjects.length > 0} onBack={() => onNavigate('dashboard')} />;

    const prevLec = findAdjacent('prev');
    const nextLec = findAdjacent('next');

    const ghostBtn: React.CSSProperties = { background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '7px 14px', color: '#64748b', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: FONT, transition: 'all 0.15s' };

    return (
        <div dir="rtl" style={{ minHeight: '100vh', background: '#0a0f1e', color: '#e2e8f0', fontFamily: FONT, display: 'flex', flexDirection: 'column' }} onContextMenu={e => e.preventDefault()}>

            {/* ── Top bar ── */}
            <header style={{ background: '#0d1424', borderBottom: '1px solid rgba(56,189,248,0.08)', padding: '0 20px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                    <button onClick={() => onNavigate('dashboard')} style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: '8px', padding: '6px 14px', color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, fontFamily: FONT, flexShrink: 0, transition: 'background 0.15s' }}
                        onMouseOver={e => (e.currentTarget.style.background = 'rgba(56,189,248,0.15)')}
                        onMouseOut={e => (e.currentTarget.style.background = 'rgba(56,189,248,0.08)')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        لوحة التحكم
                    </button>
                    <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {currentSubject.name} — {currentLecture.title}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button onClick={() => setShowNotes(!showNotes)} style={{ ...ghostBtn, color: showNotes ? '#38bdf8' : '#64748b', borderColor: showNotes ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.08)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        ملاحظاتي
                    </button>
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ ...ghostBtn, color: sidebarOpen ? '#e2e8f0' : '#64748b' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /></svg>
                        المحتوى
                    </button>
                </div>
            </header>

            {/* ── Body ── */}
            <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 52px)', overflow: 'hidden' }}>

                {/* ── Video column ── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                    <VideoArea lecture={currentLecture} watermarkLabel={watermarkLabel} sessionId={sessionId} isRecording={isRecording} userEmail={user?.email} />

                    {/* ── Info bar ── */}
                    <div style={{ background: '#0d1424', borderTop: '1px solid rgba(255,255,255,0.04)', padding: '14px 20px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                            <div style={{ minWidth: 0 }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentLecture.title}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569' }}>
                                    <span>{currentSubject.name}</span>
                                    <span>·</span>
                                    <span>{currentSubject.instructor}</span>
                                    {currentLecture.duration && currentLecture.duration !== '10:00' && (
                                        <><span>·</span>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" strokeLinecap="round" /></svg>
                                        <span>{currentLecture.duration}</span></>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                <button onClick={() => prevLec && selectLecture(prevLec.lecture, prevLec.subject)} disabled={!prevLec}
                                    style={{ ...ghostBtn, opacity: prevLec ? 1 : 0.3, cursor: prevLec ? 'pointer' : 'default' }}>
                                    السابقة
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </button>
                                <button onClick={() => nextLec && selectLecture(nextLec.lecture, nextLec.subject)} disabled={!nextLec}
                                    style={{ background: nextLec ? 'linear-gradient(135deg,#0ea5e9,#2563eb)' : 'rgba(255,255,255,0.04)', border: 'none', borderRadius: '8px', padding: '7px 16px', color: nextLec ? '#fff' : '#334155', cursor: nextLec ? 'pointer' : 'default', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontFamily: FONT, opacity: nextLec ? 1 : 0.3, transition: 'opacity 0.15s' }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    التالية
                                </button>
                            </div>
                        </div>

                        {showNotes && (
                            <div style={{ marginTop: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>ملاحظاتي</div>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="اكتب ملاحظاتك هنا..."
                                    style={{ width: '100%', minHeight: '72px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px', color: '#e2e8f0', fontSize: '13px', fontFamily: FONT, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                        )}

                        {/* ── Documents / materials for this lecture ── */}
                        {currentLecture.mediaFileId && (
                            <div style={{ marginTop: '12px' }}>
                                <MediaGallery lectureId={currentLecture.id} lectureTitle={undefined} docsOnly />
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Sidebar ── */}
                {sidebarOpen && (
                    <aside style={{ width: '300px', background: '#0d1424', borderRight: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>{currentSubject.name}</div>
                            <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{currentSubject.instructor} · {subjects.reduce((t, s) => t + s.lectures.length, 0)} محاضرات</div>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                            {subjects.map(subject => (
                                <div key={subject.id}>
                                    {/* Level header */}
                                    <div style={{ padding: '8px 10px 4px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {subject.name}
                                    </div>
                                    {subject.lectures.map(lec => (
                                        <LectureItem key={lec.id} lec={lec} active={lec.id === currentLecture.id} onClick={() => selectLecture(lec, subject)} />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
};

export default VideoViewer;
