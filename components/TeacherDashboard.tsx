import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Page } from '../App';
import { Subject, Level, Lecture, TeacherNavItem } from './teacher/types';
import {
    fetchTeacherSubjects, fetchTeacherStats, fetchTeacherStudents, pingTeacherAuth,
    updateTeacherSubject, deleteTeacherSubject,
    publishTeacherSubject, createCourseWithCurriculum
} from '../api/teacher.api';
import TeacherSidebar from './teacher/TeacherSidebar';
import TeacherStats from './teacher/TeacherStats';
import TeacherSubjectsGrid from './teacher/TeacherSubjectsGrid';
import TeacherStudents from './teacher/TeacherStudents';
import TeacherAnalytics from './teacher/TeacherAnalytics';
import TeacherProfile from './teacher/TeacherProfile';
import SubjectModal from './teacher/SubjectModal';
import TeacherLecturesView from './teacher/TeacherLecturesView';
import AccountingTab from './AccountingTab';
import TeacherAttendanceTab from './TeacherAttendanceTab';
import ExamViewer from './teacher/ExamViewer';
import QuestionBank from './teacher/QuestionBank';
import StudentGroupsTab from './teacher/StudentGroupsTab';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import StreakBadge from './StreakBadge';
import { computeStreak, recordStudyDay } from '../utils/streak';

interface TeacherDashboardProps {
    onNavigate: (page: Page, payload?: { tab?: string }) => void;
    initialTab?: string;
}

const GUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const maybeGuid = (id?: string) => (id && GUID_RE.test(id) ? id : undefined);

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onNavigate, initialTab }) => {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [streak, setStreak] = useState(0);
    const [activeNav, setActiveNav] = useState<TeacherNavItem>((initialTab as TeacherNavItem) || 'subjects');
    const [mobileSidebar, setMobileSidebar] = useState(false);

    // Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createStep, setCreateStep] = useState(1);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    // ID of the subject that was last saved — used to route background upload completions
    const [savedSubjectId, setSavedSubjectId] = useState<string | undefined>();

    // Lectures view state
    const [viewingSubject, setViewingSubject] = useState<Subject | null>(null);

    // API data
    const [apiStats, setApiStats] = useState<any>(null);
    const [apiStudents, setApiStudents] = useState<any[]>([]);
    const [apiActivities, setApiActivities] = useState<any[]>([]);
    const [studentsLoading, setStudentsLoading] = useState(false);

    // Form state
    const [newSubjectName, setNewSubjectName] = useState('');
    const [newSubjectDesc, setNewSubjectDesc] = useState('');
    const [newSubjectIcon, setNewSubjectIcon] = useState('📚');
    const [newSubjectPrice, setNewSubjectPrice] = useState(0);
    const [newSubjectLevel, setNewSubjectLevel] = useState('مبتدئ');
    const [newSubjectGrade, setNewSubjectGrade] = useState('الرابع الابتدائي');
    const [newSubjectTerm, setNewSubjectTerm] = useState('الترم الأول');
    const [newSubjectCategory, setNewSubjectCategory] = useState('عام');
    const [newSubjectImageUrl, setNewSubjectImageUrl] = useState('');
    const [newLevels, setNewLevels] = useState<Level[]>([{ id: 'new-l1', title: 'المستوى 1', lectures: [] }]);

    // ── Load subjects + stats ──────────────────────────────────────────────
    useEffect(() => {
        const loadData = async () => {
            setIsLoadingData(true);
            try {
                const ok = await pingTeacherAuth();
                if (!ok) {
                    setIsLoadingData(false);
                    showToast('تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى.', 'error');
                    return;
                }

                const [subjectsData, statsData] = await Promise.all([
                    fetchTeacherSubjects(),
                    fetchTeacherStats(),
                ]);

                if (Array.isArray(subjectsData)) {
                    setSubjects(subjectsData.filter((s: any) => s.id != null).map((s: any) => ({
                        id: s.id.toString(),
                        title: s.title || s.name || '',
                        description: s.description || '',
                        icon: s.icon || '📚',
                        category: s.category || 'عام',
                        price: s.price || 0,
                        level: s.level || 'مبتدئ',
                        grade: s.grade || '',
                        term: s.term || '',
                        levels: (s.levels || []).map((l: any) => ({
                            id: l.id?.toString() || `lev-${Date.now()}`,
                            title: l.title || l.name || '',
                            lectures: (l.lectures || []).map((lec: any) => {
                                const allFiles: any[] = lec.mediaFiles || [];
                                const videoFile = allFiles.find((f: any) => f.fileType === 'video')
                                    || (lec.mediaFileId ? allFiles.find((f: any) => f.id === lec.mediaFileId) : null);
                                const docFiles = allFiles.filter((f: any) =>
                                    f.fileType !== 'video' && f.id !== videoFile?.id
                                );
                                return {
                                    id: lec.id?.toString() || `lec-${Date.now()}`,
                                    title: lec.title || '',
                                    duration: lec.duration || '00:00',
                                    videoUrl: lec.videoUrl || '',
                                    mediaFileId: lec.mediaFileId,
                                    uploadStatus: videoFile ? 'success' : 'idle',
                                    uploadProgress: videoFile ? 100 : 0,
                                    videoFileName: videoFile?.originalFileName || '',
                                    docs: docFiles.map((f: any) => ({
                                        id: f.id,
                                        fileName: f.originalFileName || '',
                                        mediaFileId: f.id,
                                        uploadStatus: 'success',
                                        uploadProgress: 100,
                                    })),
                                };
                            }),
                        })),
                        students: s.studentsCount || 0,
                        status: s.status === 'published' || s.status === 'Published' ? 'published' : 'draft',
                        createdAt: s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    })));
                }

                if (statsData) {
                    setApiStats(statsData);
                    if (Array.isArray(statsData.recentActivities)) {
                        setApiActivities(statsData.recentActivities.map((a: any) => ({
                            text: a.description || a.text || '',
                            time: a.time || a.createdAt || '',
                        })));
                    }
                }
            } catch (err) {
                console.error('Error loading teacher data', err);
            }
            setIsLoadingData(false);
        };

        loadData();
    }, []);

    // ── Streak (daily activity) ────────────────────────────────────────────
    useEffect(() => {
        const uid = user?.id;
        if (!uid || uid === 'guest') { setStreak(0); return; }
        setStreak(computeStreak(uid));
        const t = setTimeout(() => setStreak(recordStudyDay(uid)), 500);
        return () => clearTimeout(t);
    }, [user?.id]);

    // ── Load students on tab switch ────────────────────────────────────────
    useEffect(() => {
        if (activeNav !== 'students') return;
        setStudentsLoading(true);
        fetchTeacherStudents()
            .then((data: any) => {
                if (Array.isArray(data)) {
                    setApiStudents(data.map((st: any) => ({ name: st.name || 'طالب', email: st.email || '', avatar: '', id: st.id })));
                }
            })
            .catch(() => {})
            .finally(() => setStudentsLoading(false));
    }, [activeNav]);

    // ── Computed stats ─────────────────────────────────────────────────────
    const totalStudents = apiStats?.totalStudents ?? subjects.reduce((a, s) => a + s.students, 0);
    const totalLectures = apiStats?.totalLectures ?? subjects.reduce((a, s) => a + s.levels.reduce((b, l) => b + l.lectures.length, 0), 0);
    const publishedCount = apiStats?.publishedCount ?? subjects.filter(s => s.status === 'published').length;
    const totalSubjects = apiStats?.totalSubjects ?? subjects.length;

    // ── Form helpers ───────────────────────────────────────────────────────
    const resetForm = () => {
        setNewSubjectName('Science'); setNewSubjectDesc(''); setNewSubjectIcon('📚');
        setNewSubjectPrice(0); setNewSubjectLevel('مبتدئ'); setNewSubjectCategory('عام');
        setNewSubjectGrade('الرابع الابتدائي'); setNewSubjectTerm('الترم الأول');
        setNewSubjectImageUrl('');
        setNewLevels([{ id: 'new-l1', title: 'المستوى 1', lectures: [] }]);
        setCreateStep(1); setEditingSubject(null);
    };

    const openCreateModal = () => { resetForm(); setShowCreateModal(true); };
    const openEditModal = (subject: Subject) => {
        setEditingSubject(subject);
        setNewSubjectName('Science'); setNewSubjectDesc(subject.description);
        setNewSubjectIcon(subject.icon);
        setNewSubjectPrice(subject.price || 0);
        setNewSubjectLevel(subject.level || 'مبتدئ');
        setNewSubjectGrade(subject.grade || 'الرابع الابتدائي');
        setNewSubjectTerm(subject.term || 'الترم الأول');
        setNewSubjectCategory(subject.category || 'عام');
        setNewSubjectImageUrl('');
        setNewLevels(JSON.parse(JSON.stringify(subject.levels)));
        setCreateStep(1); setShowCreateModal(true);
    };

    const addLevel = () => setNewLevels(prev => [...prev, { id: `new-l${prev.length + 1}-${Date.now()}`, title: `المستوى ${prev.length + 1}`, lectures: [] }]);
    const removeLevel = (id: string) => { if (newLevels.length > 1) setNewLevels(prev => prev.filter(l => l.id !== id)); };
    const updateLevelName = (id: string, title: string) => setNewLevels(prev => prev.map(l => l.id === id ? { ...l, title } : l));
    const addLecture = (levelId: string) => setNewLevels(prev => prev.map(l => l.id === levelId ? { ...l, lectures: [...l.lectures, { id: `lec-${Date.now()}-${Math.random().toString(36).substr(2,5)}`, title: '', duration: '00:00', videoUrl: '' }] } : l));
    const removeLecture = (levelId: string, lecId: string) => setNewLevels(prev => prev.map(l => l.id === levelId ? { ...l, lectures: l.lectures.filter(lec => lec.id !== lecId) } : l));
    const updateLecture = (levelId: string, lecId: string, field: keyof Lecture, value: any) => {
        console.log(`[updateLecture] levelId=${levelId} lecId=${lecId} field=${field} value=`, typeof value === 'function' ? '[fn]' : value);
        setNewLevels(prev => prev.map(l =>
            l.id === levelId
                ? {
                    ...l, lectures: l.lectures.map(lec => {
                        if (lec.id !== lecId) return lec;
                        const resolved = typeof value === 'function' ? value(lec[field]) : value;
                        return { ...lec, [field]: resolved };
                    })
                }
                : l
        ));
    };

    // ── Save subject ───────────────────────────────────────────────────────
    /**
     * Called by SubjectModal when a background upload (started before save)
     * completes after the modal is already closed.
     * Patches the subject in local state and persists the mediaFileId to the backend.
     */
    const handleBackgroundUploadComplete = useCallback(async (
        subjectId: string,
        levelId: string,
        lecId: string,
        mediaFileId: string,
        fileType: 'video' | 'document',
        fileName: string,
    ) => {
        // 1. Patch local state so the teacher sees the file immediately
        setSubjects(prev => prev.map(s => {
            if (s.id !== subjectId) return s;
            return {
                ...s,
                levels: s.levels.map(l => {
                    if (l.id !== levelId) return l;
                    return {
                        ...l,
                        lectures: l.lectures.map(lec => {
                            if (lec.id !== lecId) return lec;
                            if (fileType === 'video') {
                                return { ...lec, mediaFileId, uploadStatus: 'success' as const, uploadProgress: 100, videoFileName: fileName, uploadProcessing: false };
                            } else {
                                const existingDocs = lec.docs || [];
                                const alreadyAdded = existingDocs.some(d => d.mediaFileId === mediaFileId);
                                return {
                                    ...lec,
                                    docs: alreadyAdded ? existingDocs : [
                                        ...existingDocs,
                                        { id: mediaFileId, fileName, mediaFileId, uploadStatus: 'success' as const, uploadProgress: 100 },
                                    ],
                                };
                            }
                        }),
                    };
                }),
            };
        }));

        // 2. Persist to backend — re-fetch the subject's current state then patch it
        try {
            const subject = subjects.find(s => s.id === subjectId);
            if (!subject) return;

            const updatedLevels = subject.levels.map((l, li) => ({
                id: l.id,
                title: l.title,
                sortOrder: li,
                lectures: l.lectures.map((lec, ji) => {
                    const isTarget = l.id === levelId && lec.id === lecId;
                    const docIds = (lec.docs || [])
                        .filter(d => d.uploadStatus === 'success' && d.mediaFileId)
                        .map(d => d.mediaFileId!);
                    if (isTarget && fileType === 'document' && !docIds.includes(mediaFileId)) {
                        docIds.push(mediaFileId);
                    }
                    return {
                        id: lec.id,
                        title: lec.title,
                        sortOrder: ji,
                        mediaFileId: isTarget && fileType === 'video' ? mediaFileId : (lec.mediaFileId || undefined),
                        videoFileId: isTarget && fileType === 'video' ? mediaFileId : (lec.mediaFileId || undefined),
                        documentFileIds: docIds,
                        videoUrl: lec.videoUrl || undefined,
                    };
                }),
            }));

            await updateTeacherSubject(subjectId, { levels: updatedLevels });
            showToast(`✓ اكتمل رفع "${fileName}" وتم حفظه`, 'success');
        } catch {
            // Non-critical — the file is already on the server, just the link wasn't saved
            showToast(`تم رفع "${fileName}" لكن تعذّر حفظ الرابط — يرجى تعديل المادة`, 'error');
        }
    }, [subjects, showToast]);
    const saveSubject = async () => {
        if (!user) { showToast('يجب تسجيل الدخول أولاً', 'error'); onNavigate('login'); return; }

        setIsSaving(true);
        try {
            if (editingSubject) {
                const totalDuration = newLevels.reduce((total, level) => total + level.lectures.reduce((sum, lec) => {
                    const parts = lec.duration.trim().split(':').map(p => parseInt(p) || 0);
                    return sum + (parts.length === 3 ? parts[0] * 60 + parts[1] : parts.length === 2 ? parts[0] : 0);
                }, 0), 0);

                const editLevels = newLevels
                    .filter(l => (l.title || (l as any).Title || '').trim())
                    .map((level, i) => ({
                        id: maybeGuid(level.id),
                        title: level.title || (level as any).Title,
                        sortOrder: i,
                        lectures: level.lectures.filter(lec => lec.title.trim()).map((lec, j) => ({
                            id: maybeGuid(lec.id),
                            title: lec.title,
                            duration: lec.duration || undefined,
                            videoUrl: lec.videoUrl || undefined,
                            mediaFileId: lec.mediaFileId || undefined,
                            videoFileId: lec.mediaFileId || undefined,
                            documentFileIds: (lec.docs || [])
                                .filter((d: any) => d.uploadStatus === 'success' && d.mediaFileId)
                                .map((d: any) => d.mediaFileId as string),
                            sortOrder: j,
                        })),
                    }));

                await updateTeacherSubject(editingSubject.id, {
                    title: newSubjectName,
                    description: newSubjectDesc,
                    price: newSubjectPrice,
                    level: newSubjectLevel,
                    grade: newSubjectGrade,
                    term: newSubjectTerm,
                    category: newSubjectCategory,
                    imageUrl: newSubjectImageUrl || undefined,
                    duration: Math.max(1, totalDuration),
                    levels: editLevels,
                });
                setSubjects(subjects.map(s => s.id === editingSubject.id ? {
                    ...s,
                    title: newSubjectName,
                    description: newSubjectDesc,
                    icon: newSubjectIcon,
                    price: newSubjectPrice,
                    level: newSubjectLevel,
                    grade: newSubjectGrade,
                    term: newSubjectTerm,
                    category: newSubjectCategory,
                    levels: newLevels
                } : s));
                showToast('تم تحديث المادة بنجاح', 'success');
                setSavedSubjectId(editingSubject.id);
            } else {                const totalDuration = newLevels.reduce((total, level) => total + level.lectures.reduce((sum, lec) => {
                    const parts = lec.duration.trim().split(':').map(p => parseInt(p) || 0);
                    return sum + (parts.length === 3 ? parts[0] * 60 + parts[1] : parts.length === 2 ? parts[0] : 0);
                }, 0), 0);

                const sections = newLevels
                    .filter(l => l.title.trim())
                    .map((level, i) => ({
                        title: level.title,
                        sortOrder: i,
                        lectures: level.lectures.filter(lec => lec.title.trim()).map((lec, j) => ({
                            title: lec.title,
                            duration: lec.duration || undefined,
                            videoUrl: lec.videoUrl || undefined,
                            mediaFileId: lec.mediaFileId || undefined,
                            videoFileId: lec.mediaFileId || undefined,
                            documentFileIds: (lec.docs || [])
                                .filter((d: any) => d.uploadStatus === 'success' && d.mediaFileId)
                                .map((d: any) => d.mediaFileId as string),
                            sortOrder: j,
                            isPreview: j === 0,
                        })),
                    }));

                const created = await createCourseWithCurriculum({
                    title: newSubjectName,
                    description: newSubjectDesc || undefined,
                    category: newSubjectCategory || 'عام',
                    duration: Math.max(1, totalDuration),
                    level: newSubjectLevel !== 'جميع المستويات' ? newSubjectLevel : undefined,
                    grade: newSubjectGrade,
                    term: newSubjectTerm,
                    language: 'العربية',
                    price: newSubjectPrice,
                    imageUrl: newSubjectImageUrl || undefined,
                    sections,
                });

                if (!created) throw new Error('لم يتم استلام رد من الخادم');
                const rd = created.data || created;
                if (!rd.id) throw new Error('الرد من الخادم لا يحتوي على معرف المادة');

                setSubjects([...subjects, {
                    id: rd.id.toString(),
                    title: rd.title || newSubjectName,
                    description: rd.description || '',
                    icon: newSubjectIcon,
                    price: rd.price || newSubjectPrice,
                    level: rd.level || newSubjectLevel,
                    grade: rd.grade || newSubjectGrade,
                    term: rd.term || newSubjectTerm,
                    category: rd.category || newSubjectCategory,
                    levels: (rd.levels || []).map((s: any) => ({
                        id: s.id?.toString() || `lev-${Date.now()}`,
                        title: s.title || s.name || '',
                        lectures: (s.lectures || []).map((l: any) => ({
                            id: l.id?.toString() || `lec-${Date.now()}`,
                            title: l.title,
                            duration: l.duration || '00:00',
                            videoUrl: l.videoUrl || '',
                            mediaFileId: l.mediaFileId,
                        })),
                    })),
                    students: rd.studentsCount || 0,
                    status: rd.status === 'published' ? 'published' : 'draft',
                    createdAt: rd.createdAt ? new Date(rd.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                }]);
                showToast('تم إنشاء المادة بنجاح', 'success');
                setSavedSubjectId(rd.id.toString());
            }
            // Close modal immediately — background uploads will complete on their own
            setShowCreateModal(false);
            resetForm();
            setIsSaving(false);
        } catch (err: any) {
            const msg = err.status === 401 ? 'انتهت صلاحية الجلسة'
                : err.status === 403 ? 'غير مصرح'
                : err.response?.error?.message || err.message || 'حدث خطأ أثناء حفظ المادة';
            showToast(msg, 'error');
            setIsSaving(false);
        }
    };

    const deleteSubject = async (id: string) => {
        try { await deleteTeacherSubject(id); showToast('تم حذف المادة', 'success'); }
        catch { showToast('حدث خطأ أثناء الحذف', 'error'); }
        setSubjects(subjects.filter(s => s.id !== id));
    };

    const togglePublish = async (id: string) => {
        const subject = subjects.find(s => s.id === id);
        if (!subject) return;
        const newStatus = subject.status === 'published' ? 'draft' : 'published';
        try { await publishTeacherSubject(id, newStatus); showToast(newStatus === 'published' ? 'تم نشر المادة' : 'تم إيقاف النشر', 'success'); }
        catch { showToast('حدث خطأ', 'error'); }
        setSubjects(subjects.map(s => s.id === id ? { ...s, status: newStatus as 'published' | 'draft' } : s));
    };

    // ── Loading screen ─────────────────────────────────────────────────────
    if (isLoadingData) {
        return (
            <div dir="rtl" className="flex min-h-screen bg-[#0a1628] font-cairo items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full border-[3px] border-amber-500/15 border-t-amber-500 animate-spin mx-auto mb-4" />
                    <div className="text-slate-200 text-[15px] font-semibold">جاري تحميل البيانات...</div>
                </div>
            </div>
        );
    }

    return (
        <div dir="rtl" className="flex min-h-screen bg-[#0a1628] font-cairo">

            {/* Desktop sidebar */}
            <div className="hidden md:flex">
                <TeacherSidebar activeNav={activeNav} onNavChange={setActiveNav} onNavigate={onNavigate} />
            </div>

            {/* Mobile sidebar overlay */}
            {mobileSidebar && (
                <div className="fixed inset-0 z-[200] flex md:hidden">
                    <div
                        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
                        onClick={() => setMobileSidebar(false)}
                    />
                    <div className="relative z-10 max-w-[80vw] overflow-y-auto max-h-screen">
                        <TeacherSidebar
                            activeNav={activeNav}
                            onNavChange={(nav) => { setActiveNav(nav); setMobileSidebar(false); }}
                            onNavigate={onNavigate}
                        />
                    </div>
                </div>
            )}

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <header className="sticky top-0 z-40 bg-[#0f172a] border-b border-white/[0.06] px-5 py-3.5 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <button
                            className="md:hidden bg-white/[0.05] border border-white/[0.08] rounded-lg p-2 text-slate-400 cursor-pointer hover:bg-white/10 transition-colors duration-200 flex items-center justify-center shrink-0"
                            onClick={() => setMobileSidebar(true)}
                            aria-label="فتح القائمة"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round"/>
                                <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round"/>
                                <line x1="3" y1="18" x2="21" y2="18" strokeLinecap="round"/>
                            </svg>
                        </button>
                        <h1 className="text-base sm:text-lg font-extrabold text-slate-100 m-0 truncate">
                            مرحباً، أ. {user?.name || 'المدرس'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onNavigate('home')}
                            className="hidden sm:flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2 text-slate-400 text-sm hover:bg-white/[0.08] hover:text-slate-100 transition-all duration-200 cursor-pointer font-cairo"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round"/>
                                <polyline points="9,22 9,12 15,12 15,22" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            الموقع الرئيسي
                        </button>
                        <button
                            onClick={openCreateModal}
                            className="flex items-center gap-1.5 bg-gradient-to-r from-[#f59e0b] to-[#d97706] border-none rounded-xl px-4 py-2 text-white text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity duration-200 shadow-lg shadow-amber-500/25 font-cairo"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            مادة جديدة
                        </button>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto p-5">
                    {(activeNav === 'dashboard' || activeNav === 'subjects') && (
                        <>
                            <div className="relative overflow-hidden bg-[#121f36] border border-white/[0.06] rounded-3xl p-6 sm:p-7 mb-6 shadow-xl shadow-black/20">
                                <div className="absolute top-0 left-0 w-56 h-56 rounded-full bg-[#1E3A8A]/25 -translate-x-20 -translate-y-20" />
                                <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full bg-amber-500/[0.08] translate-x-14 translate-y-14" />
                                <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                                    <div className="max-w-xl">
                                        <div className="flex items-center gap-2 mb-2">
                                            <StreakBadge days={streak} variant="dark" />
                                            <span className="text-xs font-bold text-slate-400 hidden sm:inline">كل يوم تنتظرك فايدة…</span>
                                        </div>
                                        <h1 className="text-xl sm:text-2xl font-black text-slate-100 font-cairo m-0">
                                            أ. {user?.name || 'مدرس'}, شغلك بيوصّل 💪
                                        </h1>
                                        <p className="text-sm text-slate-400/90 mt-1.5 leading-relaxed m-0">
                                            كل محاضرة جديدة بتاخد طلابك خطوة قدام، وكل امتحان بيثبت المعلومة. استمر في النشر وشوف النتيجة في التحليلات.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                                        <button
                                            onClick={openCreateModal}
                                            className="flex items-center gap-2 bg-gradient-to-r from-[#f59e0b] to-[#d97706] border-none rounded-xl px-5 py-3 text-white text-sm font-extrabold cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-200 shadow-lg shadow-amber-500/20 font-cairo"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                            مادة جديدة
                                        </button>
                                        <button
                                            onClick={() => setActiveNav('students')}
                                            className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-slate-300 text-sm font-bold cursor-pointer hover:bg-white/10 hover:text-slate-100 transition-all duration-200 font-cairo"
                                        >
                                            حوّل الطلاب
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <TeacherStats totalSubjects={totalSubjects} totalStudents={totalStudents} totalLectures={totalLectures} publishedCount={publishedCount} />
                            <TeacherSubjectsGrid subjects={subjects} onEdit={openEditModal} onTogglePublish={togglePublish} onDelete={deleteSubject} onCreateNew={openCreateModal} onViewLectures={setViewingSubject} />
                        </>
                    )}
                    {activeNav === 'students' && <TeacherStudents />}
                    {activeNav === 'groups' && <StudentGroupsTab />}
                    {activeNav === 'analytics' && (
                        <TeacherAnalytics subjects={subjects} totalSubjects={totalSubjects} totalStudents={totalStudents} totalLectures={totalLectures} publishedCount={publishedCount} activities={apiActivities} />
                    )}
                    {activeNav === 'profile' && <TeacherProfile />}
                    {activeNav === 'exams' && <ExamViewer />}
                    {activeNav === 'bank' && <QuestionBank />}
                    {activeNav === 'accounting' && <AccountingTab mode="teacher" teacherId={user?.id} showToast={(msg, ok) => showToast(msg, ok ? 'success' : 'error')} />}
                    {activeNav === 'attendance' && <TeacherAttendanceTab showToast={(msg, ok) => showToast(msg, ok ? 'success' : 'error')} />}
                </main>
            </div>

            {/* Lectures view panel */}
            <TeacherLecturesView subject={viewingSubject} onClose={() => setViewingSubject(null)} />

            {/* Modal */}
            <SubjectModal
                show={showCreateModal}
                onClose={() => { setShowCreateModal(false); resetForm(); }}
                editingSubject={editingSubject}
                createStep={createStep} setCreateStep={setCreateStep}
                newSubjectName={newSubjectName} setNewSubjectName={setNewSubjectName}
                newSubjectDesc={newSubjectDesc} setNewSubjectDesc={setNewSubjectDesc}
                newSubjectIcon={newSubjectIcon} setNewSubjectIcon={setNewSubjectIcon}
                newSubjectPrice={newSubjectPrice} setNewSubjectPrice={setNewSubjectPrice}
                newSubjectGrade={newSubjectGrade} setNewSubjectGrade={setNewSubjectGrade}
                newSubjectTerm={newSubjectTerm} setNewSubjectTerm={setNewSubjectTerm}
                newSubjectCategory={newSubjectCategory} setNewSubjectCategory={setNewSubjectCategory}
                newSubjectImageUrl={newSubjectImageUrl} setNewSubjectImageUrl={setNewSubjectImageUrl}
                newLevels={newLevels}
                addLevel={addLevel} removeLevel={removeLevel} updateLevelName={updateLevelName}
                addLecture={addLecture} removeLecture={removeLecture} updateLecture={updateLecture}
                onSave={saveSubject} isSaving={isSaving}
                savedSubjectId={savedSubjectId}
                onBackgroundUploadComplete={handleBackgroundUploadComplete}
            />
        </div>
    );
};

export default TeacherDashboard;
