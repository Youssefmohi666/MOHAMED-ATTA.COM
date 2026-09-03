
import React, { useRef, useEffect } from 'react';
import { Subject, Level, Lecture, LectureDoc, categoryIcons } from './types';
import { uploadMediaFile, uploadDocumentFile, uploadSubjectImage, authedImageUrl, waitForHlsReady } from '../../api/media.api';
import SelectField from '../SelectField';

interface SubjectModalProps {
    show: boolean;
    onClose: () => void;
    editingSubject: Subject | null;
    createStep: number;
    setCreateStep: (step: number) => void;
    newSubjectName: string;
    setNewSubjectName: (name: string) => void;
    newSubjectDesc: string;
    setNewSubjectDesc: (desc: string) => void;
    newSubjectIcon: string;
    setNewSubjectIcon: (icon: string) => void;
    newSubjectPrice: number;
    setNewSubjectPrice: (price: number) => void;
    newSubjectGrade: string;
    setNewSubjectGrade: (grade: string) => void;
    newSubjectTerm: string;
    setNewSubjectTerm: (term: string) => void;
    newSubjectCategory: string;
    setNewSubjectCategory: (category: string) => void;
    newSubjectImageUrl: string;
    setNewSubjectImageUrl: (url: string) => void;
    newLevels: Level[];
    addLevel: () => void;
    removeLevel: (id: string) => void;
    updateLevelName: (id: string, name: string) => void;
    addLecture: (levelId: string) => void;
    removeLecture: (levelId: string, lecId: string) => void;
    updateLecture: (levelId: string, lecId: string, field: keyof Lecture, value: any) => void;
    onSave: () => void;
    isSaving?: boolean;
    /**
     * Called when an upload that was still in-flight at save time completes in the background.
     * subjectId is the ID of the subject that was just saved/created.
     */
    onBackgroundUploadComplete?: (
        subjectId: string,
        levelId: string,
        lecId: string,
        mediaFileId: string,
        fileType: 'video' | 'document',
        fileName: string,
    ) => void;
    /** The subject ID assigned after a successful save — used to route background completions */
    savedSubjectId?: string;
}

const CATEGORIES = ['علوم', 'العلوم المتكاملة', 'عام', 'رياضيات', 'لغة عربية', 'لغة إنجليزية', 'علوم الحاسب', 'برمجة', 'فنون', 'تربية دينية'];

const GRADES = [
    'الرابع الابتدائي',
    'الخامس الابتدائي',
    'السادس الابتدائي',
    'الأول الإعدادي',
    'الثاني الإعدادي',
    'الثالث الإعدادي',
    'الأول الثانوي',
];

const TERMS = ['الترم الأول', 'الترم الثاني'];

const SubjectModal: React.FC<SubjectModalProps> = ({
    show, onClose, editingSubject, createStep, setCreateStep,
    newSubjectName, setNewSubjectName, newSubjectDesc, setNewSubjectDesc,
    newSubjectIcon, setNewSubjectIcon, newSubjectPrice, setNewSubjectPrice,
    newSubjectGrade, setNewSubjectGrade, newSubjectTerm, setNewSubjectTerm,
    newSubjectCategory, setNewSubjectCategory,
    newSubjectImageUrl, setNewSubjectImageUrl, newLevels,
    addLevel, removeLevel, updateLevelName,
    addLecture, removeLecture, updateLecture, onSave, isSaving = false,
    onBackgroundUploadComplete, savedSubjectId,
}) => {
    const videoInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
    const docInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
    const coverInputRef = useRef<HTMLInputElement | null>(null);
    const [coverUploading, setCoverUploading] = React.useState(false);
    const [coverHovering, setCoverHovering] = React.useState(false);
    // Keep a ref to the latest savedSubjectId so upload callbacks can read it
    // even after the modal closes (closures would capture stale value otherwise)
    const savedSubjectIdRef = useRef<string | undefined>(savedSubjectId);
    useEffect(() => { savedSubjectIdRef.current = savedSubjectId; }, [savedSubjectId]);

    useEffect(() => {
        if (categoryIcons[newSubjectCategory]) {
            setNewSubjectIcon(categoryIcons[newSubjectCategory]);
        }
    }, [newSubjectCategory, setNewSubjectIcon]);

    if (!show) return null;

    const handleVideoUpload = async (levelId: string, lecId: string, file: File) => {
        console.log(`[VideoUpload] START — file="${file.name}" size=${file.size} levelId=${levelId} lecId=${lecId}`);
        updateLecture(levelId, lecId, 'uploadStatus' as keyof Lecture, 'uploading');
        updateLecture(levelId, lecId, 'uploadProgress' as keyof Lecture, 0);
        updateLecture(levelId, lecId, 'videoFileName' as keyof Lecture, file.name);
        updateLecture(levelId, lecId, 'hlsReady' as keyof Lecture, false);
        updateLecture(levelId, lecId, 'uploadProcessing' as keyof Lecture, false);
        try {
            const mediaFile = await uploadMediaFile(file, undefined, (pct) => {
                console.log(`[VideoUpload] progress=${pct}%`);
                updateLecture(levelId, lecId, 'uploadProgress' as keyof Lecture, pct);
                if (pct === 100) {
                    updateLecture(levelId, lecId, 'uploadProcessing' as keyof Lecture, true);
                }
            });
            console.log(`[VideoUpload] SUCCESS — mediaFileId=${mediaFile.id}`, mediaFile);
            updateLecture(levelId, lecId, 'uploadProcessing' as keyof Lecture, false);
            updateLecture(levelId, lecId, 'mediaFileId' as keyof Lecture, mediaFile.id);
            updateLecture(levelId, lecId, 'title' as keyof Lecture, file.name.replace(/\.[^/.]+$/, ''));
            updateLecture(levelId, lecId, 'uploadStatus' as keyof Lecture, 'success');
            updateLecture(levelId, lecId, 'uploadProgress' as keyof Lecture, 100);
            if (mediaFile.hlsReady) {
                updateLecture(levelId, lecId, 'hlsReady' as keyof Lecture, true);
            } else {
                waitForHlsReady(mediaFile.id, () => {
                    console.log(`[HLS] Ready — mediaFileId=${mediaFile.id}`);
                    updateLecture(levelId, lecId, 'hlsReady' as keyof Lecture, true);
                });
            }
            // If the modal was already closed (save happened while uploading),
            // notify the dashboard so it can patch the subject and persist to backend
            const subjectId = savedSubjectIdRef.current;
            if (subjectId && onBackgroundUploadComplete) {
                onBackgroundUploadComplete(subjectId, levelId, lecId, mediaFile.id, 'video', file.name);
            }
        } catch (err: any) {
            console.error('[VideoUpload] FAILED:', err);
            updateLecture(levelId, lecId, 'uploadProcessing' as keyof Lecture, false);
            updateLecture(levelId, lecId, 'uploadStatus' as keyof Lecture, 'error');
            updateLecture(levelId, lecId, 'uploadError' as keyof Lecture, err.message || 'فشل رفع الملف');
        }
    };

    const handleDocUpload = async (levelId: string, lecId: string, file: File) => {
        const docId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        console.log(`[DocUpload] START — file="${file.name}" docId=${docId}`);

        const newDoc: LectureDoc = { id: docId, fileName: file.name, uploadStatus: 'uploading', uploadProgress: 0 };

        updateLecture(levelId, lecId, 'docs' as keyof Lecture, (prev: LectureDoc[] | undefined) => [...(prev || []), newDoc]);

        try {
            const mediaFile = await uploadDocumentFile(file, undefined, (pct) => {
                updateLecture(levelId, lecId, 'docs' as keyof Lecture, (prev: LectureDoc[] | undefined) =>
                    (prev || []).map(d => d.id === docId ? { ...d, uploadProgress: pct } : d)
                );
            });
            console.log(`[DocUpload] SUCCESS — mediaFileId=${mediaFile.id} docId=${docId}`);
            updateLecture(levelId, lecId, 'docs' as keyof Lecture, (prev: LectureDoc[] | undefined) =>
                (prev || []).map(d => d.id === docId ? { ...d, uploadStatus: 'success', uploadProgress: 100, mediaFileId: mediaFile.id } : d)
            );
            updateLecture(levelId, lecId, 'documentFileId' as keyof Lecture, mediaFile.id);
            // Notify dashboard if save already happened
            const subjectId = savedSubjectIdRef.current;
            if (subjectId && onBackgroundUploadComplete) {
                onBackgroundUploadComplete(subjectId, levelId, lecId, mediaFile.id, 'document', file.name);
            }
        } catch (err: any) {
            console.error('[DocUpload] FAILED:', err);
            updateLecture(levelId, lecId, 'docs' as keyof Lecture, (prev: LectureDoc[] | undefined) =>
                (prev || []).map(d => d.id === docId ? { ...d, uploadStatus: 'error', uploadError: err.message || 'فشل رفع الملف' } : d)
            );
        }
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!/^image\/(png|jpe?g|webp|gif|bmp|tiff?)/i.test(file.type)) {
            alert('يرجى اختيار صورة (PNG / JPG / WebP)');
            return;
        }
        setCoverUploading(true);
        try {
            const mediaFile = await uploadSubjectImage(file);
            const stored = `/api/v1/media/image/${mediaFile.id}`;
            setNewSubjectImageUrl(stored);
            console.log('[CoverUpload] OK', stored);
        } catch (err: any) {
            console.error('[CoverUpload] FAILED:', err);
            alert(err?.message || 'فشل رفع صورة الغلاف');
        }
        setCoverUploading(false);
    };

    const handleVideoInputChange = (levelId: string, lecId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleVideoUpload(levelId, lecId, file);
        e.target.value = '';
    };

    const handleDocInputChange = (levelId: string, lecId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        // Fire all doc uploads in parallel — don't wait for each one before starting the next
        files.forEach(file => handleDocUpload(levelId, lecId, file));
        e.target.value = ''; // reset so same file can be re-added
    };

    const totalSteps = 3;
    const stepTitles = ['معلومات المادة', 'إضافة المستويات', 'إضافة المحاضرات'];

    // Count files still actively transferring bytes (not yet at server-processing stage).
    // Files at 100% with uploadProcessing=true are already sent — don't show them as blocking.
    const uploadingCount = newLevels.reduce((total, l) =>
        total + l.lectures.reduce((sum, lec) => {
            const videoUploading = (lec.uploadStatus === 'uploading' && !lec.uploadProcessing) ? 1 : 0;
            const docsUploading = (lec.docs || []).filter(d => d.uploadStatus === 'uploading').length;
            return sum + videoUploading + docsUploading;
        }, 0)
    , 0);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 300,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
                onClick={onClose}
            />
            <div style={{
                position: 'relative', zIndex: 1,
                width: '90%', maxWidth: '680px', maxHeight: '85vh',
                background: 'linear-gradient(135deg, #0d1f3c, #132742)',
                border: '1px solid rgba(245, 158, 11, 0.15)',
                borderRadius: '24px', overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            }}>
                {/* Modal header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '12px',
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                        }}>{editingSubject ? '✏️' : '➕'}</div>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#e2e8f0', margin: 0 }}>
                                {editingSubject ? 'تعديل المادة' : 'إنشاء مادة جديدة'}
                            </h3>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                                الخطوة {createStep} من {totalSteps}: {stepTitles[createStep - 1]}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px', padding: '8px', color: '#94a3b8', cursor: 'pointer',
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                {/* Progress bar */}
                <div style={{ padding: '0 24px', display: 'flex', gap: '6px', marginTop: '16px' }}>
                    {[1, 2, 3].map(s => (
                        <div key={s} style={{
                            flex: 1, height: '4px', borderRadius: '2px',
                            background: s <= createStep ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.08)',
                            transition: 'all 0.3s',
                        }} />
                    ))}
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

                {/* Modal content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                    {/* Step 1: Subject Info */}
                    {createStep === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', display: 'block' }}>
                                    أيقونة المادة (تُختار تلقائياً حسب التصنيف)
                                </label>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '12px 16px',
                                    background: 'rgba(245,158,11,0.08)',
                                    border: '1px solid rgba(245,158,11,0.2)',
                                    borderRadius: '12px',
                                }}>
                                    <span style={{ fontSize: '32px' }}>{newSubjectIcon}</span>
                                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                                        سيتم تحديد الأيقونة تلقائياً عند اختيار التصنيف
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="subject-name" style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', display: 'block' }}>
                                    اسم المادة *
                                </label>
                                <input
                                    id="subject-name"
                                    name="subjectName"
                                    type="text"
                                    value={newSubjectName}
                                    onChange={e => setNewSubjectName(e.target.value)}
                                    placeholder="اكتب اسم المادة هنا (مثال: الرياضيات، العلوم المتكاملة...)"
                                    style={{
                                        width: '100%', padding: '12px 16px',
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px', color: '#e2e8f0', fontSize: '15px',
                                        fontFamily: "'Cairo', sans-serif", outline: 'none',
                                    }}
                                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.4)'}
                                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                            </div>
                            <div>
                                <label htmlFor="subject-desc" style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', display: 'block' }}>
                                    وصف المادة
                                </label>
                                <textarea
                                    id="subject-desc"
                                    name="subjectDesc"
                                    value={newSubjectDesc}
                                    onChange={e => setNewSubjectDesc(e.target.value)}
                                    placeholder="وصف مختصر عن محتوى المادة..."
                                    rows={3}
                                    style={{
                                        width: '100%', padding: '12px 16px',
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px', color: '#e2e8f0', fontSize: '14px',
                                        fontFamily: "'Cairo', sans-serif", outline: 'none', resize: 'vertical',
                                    }}
                                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.4)'}
                                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                            </div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '16px',
                            }}>
                                <div>
                                    <label htmlFor="subject-grade" style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', display: 'block' }}>
                                        الصف الدراسي *
                                    </label>
                                    <SelectField
                                        id="subject-grade"
                                        name="subjectGrade"
                                        value={newSubjectGrade}
                                        onChange={e => setNewSubjectGrade(e.target.value)}
                                    >
                                        {GRADES.map(grade => (
                                            <option key={grade} value={grade}>{grade}</option>
                                        ))}
                                    </SelectField>
                                </div>
                                <div>
                                    <label htmlFor="subject-term" style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', display: 'block' }}>
                                        الترم *
                                    </label>
                                    <SelectField
                                        id="subject-term"
                                        name="subjectTerm"
                                        value={newSubjectTerm}
                                        onChange={e => setNewSubjectTerm(e.target.value)}
                                    >
                                        {TERMS.map(term => (
                                            <option key={term} value={term}>{term}</option>
                                        ))}
                                    </SelectField>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="subject-category" style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', display: 'block' }}>
                                    التصنيف *
                                </label>
                                <SelectField
                                    id="subject-category"
                                    name="subjectCategory"
                                    value={newSubjectCategory}
                                    onChange={e => setNewSubjectCategory(e.target.value)}
                                >
                                    {['علوم', 'العلوم المتكاملة', 'عام', 'رياضيات', 'لغة عربية', 'لغة إنجليزية', 'علوم الحاسب', 'برمجة', 'فنون', 'تربية دينية'].map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </SelectField>
                            </div>
                            <div>
                                <label htmlFor="subject-image" style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', display: 'block' }}>
                                    صورة الغلاف (اختياري)
                                </label>
                                <div
                                    onClick={() => coverInputRef.current?.click()}
                                    style={{
                                        width: '100%', padding: newSubjectImageUrl ? '8px' : '12px 16px',
                                        background: newSubjectImageUrl ? '#0b1727' : 'rgba(255,255,255,0.05)',
                                        border: '1px dashed rgba(245,158,11,0.35)',
                                        borderRadius: '12px', cursor: 'pointer',
                                        minHeight: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        overflow: 'hidden', transition: 'border-color 0.2s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(245,158,11,0.7)'}
                                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(245,158,11,0.35)'}
                                >
                                    {coverUploading ? (
                                        <span style={{ color: '#f59e0b', fontSize: '14px', fontWeight: 600, fontFamily: "'Cairo', sans-serif" }}>
                                            جارٍ رفع الصورة...
                                        </span>
                                    ) : newSubjectImageUrl ? (
                                        <div style={{ position: 'relative', width: '100%' }}>
                                            <img
                                                src={authedImageUrl(newSubjectImageUrl)}
                                                alt="غلاف المادة"
                                                style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '8px', display: 'block' }}
                                            />
                                            <div style={{
                                                position: 'absolute', inset: '0 0 0 0', borderRadius: '8px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: 'rgba(0,0,0,0.45)', opacity: 0, transition: 'opacity 0.2s',
                                            }} className="cover-hover-overlay">
                                                <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
                                                    اضغط لتغيير الصورة
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '22px', marginBottom: '4px' }}>🖼️</div>
                                            <div style={{ color: '#94a3b8', fontSize: '13px', fontFamily: "'Cairo', sans-serif" }}>
                                                اضغط لرفع صورة الغلاف من جهازك
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <input
                                    ref={coverInputRef}
                                    id="subject-image"
                                    name="subjectImage"
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
                                    onChange={handleCoverUpload}
                                    style={{ display: 'none' }}
                                />
                                {newSubjectImageUrl && (
                                    <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setNewSubjectImageUrl('')}
                                            style={{
                                                background: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'none',
                                                borderRadius: '8px', padding: '4px 12px', fontSize: '12px', fontWeight: 700,
                                                cursor: 'pointer', fontFamily: "'Cairo', sans-serif",
                                            }}
                                        >
                                            إزالة الصورة
                                        </button>
                                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                                            ✅ تم رفع الصورة من جهازك
                                        </span>
                                    </div>
                                )}
                                <div style={{
                                    fontSize: '11px',
                                    color: '#64748b',
                                    marginTop: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    🖼️ يمكنك رفع صورة الغلاف من جهازك (PNG / JPG / WebP)
                                </div>
                            </div>
                            <div>
                                <label htmlFor="subject-price" style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', display: 'block' }}>
                                    السعر *
                                </label>
                                <div style={{
                                    display: 'flex', alignItems: 'stretch',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px', overflow: 'hidden',
                                    background: 'rgba(255,255,255,0.05)',
                                    transition: 'border-color 0.2s',
                                }}
                                    onFocusCapture={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(245,158,11,0.4)'}
                                    onBlurCapture={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.1)'}
                                >
                                    <input
                                        id="subject-price"
                                        name="subjectPrice"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={newSubjectPrice}
                                        onChange={e => setNewSubjectPrice(parseFloat(e.target.value) || 0)}
                                        placeholder="0.00"
                                        style={{
                                            flex: 1, padding: '12px 16px',
                                            background: 'transparent',
                                            border: 'none', outline: 'none',
                                            color: '#e2e8f0', fontSize: '15px',
                                            fontFamily: "'Cairo', sans-serif",
                                            minWidth: 0,
                                        }}
                                    />
                                    {/* Currency badge */}
                                    <div style={{
                                        padding: '0 14px',
                                        background: 'rgba(245,158,11,0.12)',
                                        borderLeft: '1px solid rgba(245,158,11,0.2)',
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        color: '#f59e0b', fontSize: '13px', fontWeight: 700,
                                        whiteSpace: 'nowrap', flexShrink: 0,
                                    }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <path d="M15 8.5a4 4 0 00-6 3.5c0 2 1.5 3 3 3.5s3 1.5 3 3.5a4 4 0 01-6 3.5" strokeLinecap="round" />
                                            <path d="M12 6v2M12 16v2" strokeLinecap="round" />
                                        </svg>
                                        ج.م
                                    </div>
                                </div>
                                {newSubjectPrice === 0 && (
                                    <div style={{ fontSize: '11px', color: '#22c55e', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                                        مجاني
                                    </div>
                                )}
                                {newSubjectPrice > 0 && (
                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                                        اترك السعر 0 لجعل المادة مجانية
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Levels */}
                    {createStep === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>
                                    المستويات ({newLevels.length})
                                </span>
                                <button onClick={addLevel} style={{
                                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    border: 'none', borderRadius: '10px', padding: '8px 16px',
                                    color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    fontFamily: "'Cairo', sans-serif",
                                }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    إضافة مستوى
                                </button>
                            </div>
                            {newLevels.map((level, idx) => (
                                <div key={level.id} style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '14px', padding: '16px',
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                }}>
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '8px',
                                        background: 'rgba(245, 158, 11, 0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '14px', fontWeight: 700, color: '#f59e0b', flexShrink: 0,
                                    }}>{idx + 1}</div>
                                    <input
                                        id={`level-name-${level.id}`}
                                        name={`levelName-${idx}`}
                                        aria-label={`اسم المستوى ${idx + 1}`}
                                        value={level.title}
                                        onChange={e => updateLevelName(level.id, e.target.value)}
                                        style={{
                                            flex: 1, padding: '8px 12px',
                                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '8px', color: '#e2e8f0', fontSize: '14px',
                                            fontFamily: "'Cairo', sans-serif", outline: 'none',
                                        }}
                                        onFocus={e => e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)'}
                                        onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                                    />
                                    <span style={{ fontSize: '12px', color: '#64748b', flexShrink: 0 }}>
                                        {level.lectures.length} محاضرة
                                    </span>
                                    {newLevels.length > 1 && (
                                        <button onClick={() => removeLevel(level.id)} style={{
                                            background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '8px',
                                            padding: '6px', color: '#f87171', cursor: 'pointer', flexShrink: 0,
                                        }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Step 3: Lectures */}
                    {createStep === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {newLevels.map((level) => (
                                <div key={level.id} style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '16px', overflow: 'hidden',
                                }}>
                                    <div style={{
                                        padding: '12px 16px',
                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    }}>
                                        <span style={{
                                            fontSize: '13px', fontWeight: 700, color: '#f59e0b',
                                            background: 'rgba(245, 158, 11, 0.1)', padding: '4px 12px',
                                            borderRadius: '8px',
                                        }}>⚡ {level.title}</span>
                                        <button onClick={() => addLecture(level.id)} style={{
                                            background: 'rgba(245, 158, 11, 0.1)',
                                            border: '1px solid rgba(245, 158, 11, 0.2)',
                                            borderRadius: '8px', padding: '6px 12px', color: '#f59e0b',
                                            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '4px',
                                            fontFamily: "'Cairo', sans-serif",
                                        }}>
                                            + محاضرة
                                        </button>
                                    </div>
                                    <div style={{ padding: '8px 12px' }}>
                                        {level.lectures.length === 0 ? (
                                            <div style={{ padding: '24px', textAlign: 'center', color: '#475569', fontSize: '13px' }}>
                                                لا توجد محاضرات بعد. اضغط "+ محاضرة" لإضافة واحدة.
                                            </div>
                                        ) : (
                                            level.lectures.map((lec, lecIdx) => (
                                                <div key={lec.id} style={{
                                                    padding: '12px',
                                                    background: 'rgba(255,255,255,0.02)',
                                                    borderRadius: '10px',
                                                    marginBottom: '6px',
                                                    display: 'flex', flexDirection: 'column', gap: '10px',
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', width: '24px', textAlign: 'center', flexShrink: 0 }}>{lecIdx + 1}</span>
                                                        <input
                                                            id={`lec-title-${lec.id}`}
                                                            name={`lecTitle-${lec.id}`}
                                                            aria-label="عنوان المحاضرة"
                                                            value={lec.title}
                                                            onChange={e => updateLecture(level.id, lec.id, 'title', e.target.value)}
                                                            placeholder="عنوان المحاضرة"
                                                            style={{
                                                                flex: 1, padding: '8px 12px',
                                                                background: 'rgba(255,255,255,0.04)',
                                                                border: '1px solid rgba(255,255,255,0.06)',
                                                                borderRadius: '8px', color: '#e2e8f0', fontSize: '13px',
                                                                fontFamily: "'Cairo', sans-serif", outline: 'none',
                                                            }}
                                                            onFocus={e => e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)'}
                                                            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                                                        />
                                                        <button onClick={() => removeLecture(level.id, lec.id)} style={{
                                                            background: 'none', border: 'none', color: '#64748b',
                                                            cursor: 'pointer', padding: '4px', flexShrink: 0,
                                                        }}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                    <div style={{ paddingRight: '34px' }}>
                                                        {/* ── VIDEO UPLOAD AREA ── */}
                                                        {(!lec.uploadStatus || lec.uploadStatus === 'idle') && (
                                                            <button
                                                                onClick={() => videoInputRefs.current[`${level.id}-${lec.id}`]?.click()}
                                                                style={{
                                                                    width: '100%', padding: '28px 12px',
                                                                    background: 'rgba(15,23,42,0.6)',
                                                                    border: '2px dashed rgba(56,189,248,0.25)',
                                                                    borderRadius: '10px', color: '#38bdf8',
                                                                    fontSize: '13px', cursor: 'pointer',
                                                                    display: 'flex', flexDirection: 'column',
                                                                    alignItems: 'center', gap: '8px',
                                                                    marginBottom: '8px',
                                                                }}
                                                            >
                                                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                                    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round" />
                                                                </svg>
                                                                اسحب الملفات هنا أو اضغط للرفع
                                                                <span style={{ fontSize: '11px', color: '#475569' }}>MP4، PDF، Links (Max 5GB)</span>
                                                            </button>
                                                        )}
                                                        {/* UPLOADING — dark video area + green progress */}
                                                        {lec.uploadStatus === 'uploading' && (
                                                            <div style={{ marginBottom: '8px' }}>
                                                                <div style={{
                                                                    width: '100%', height: '110px',
                                                                    background: 'rgba(10,18,35,0.85)',
                                                                    borderRadius: '10px 10px 0 0',
                                                                    display: 'flex', flexDirection: 'column',
                                                                    alignItems: 'center', justifyContent: 'center',
                                                                    gap: '8px',
                                                                    border: '1px solid rgba(56,189,248,0.12)',
                                                                    borderBottom: 'none',
                                                                }}>
                                                                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.5" style={{ opacity: 0.6 }}>
                                                                        <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round" />
                                                                    </svg>
                                                                    <span style={{ fontSize: '11px', color: '#475569' }}>
                                                                        {(lec as any).uploadProcessing ? 'جاري معالجة الملف على الخادم...' : 'جاري الرفع...'}
                                                                    </span>
                                                                </div>
                                                                <div style={{
                                                                    background: 'rgba(10,18,35,0.7)',
                                                                    border: '1px solid rgba(56,189,248,0.12)',
                                                                    borderTop: 'none', borderRadius: '0 0 10px 10px',
                                                                    padding: '10px 12px',
                                                                }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                                        <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 700 }}>
                                                                            {(lec as any).uploadProcessing ? '✓ 100%' : `${lec.uploadProgress || 0}%`}
                                                                        </span>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                            <span style={{ fontSize: '12px', color: '#94a3b8', direction: 'ltr' }}>{lec.videoFileName || 'video.mp4'}</span>
                                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                                                                                <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" strokeLinecap="round" />
                                                                            </svg>
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                                                                        <div style={{
                                                                            width: `${lec.uploadProgress || 0}%`,
                                                                            height: '100%',
                                                                            background: (lec as any).uploadProcessing
                                                                                ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                                                                                : 'linear-gradient(90deg, #22c55e, #16a34a)',
                                                                            borderRadius: '2px',
                                                                            transition: 'width 0.3s ease',
                                                                        }} />
                                                                    </div>
                                                                    {(lec as any).uploadProcessing && (
                                                                        <div style={{ fontSize: '10px', color: '#fbbf24', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                                                                style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                                                                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" strokeLinecap="round" />
                                                                            </svg>
                                                                            تم إرسال الملف، في انتظار تأكيد الخادم...
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* SUCCESS — video done tile */}
                                                        {lec.uploadStatus === 'success' && (
                                                            <div style={{
                                                                background: 'rgba(10,18,35,0.7)',
                                                                border: `1px solid ${lec.hlsReady ? 'rgba(34,197,94,0.2)' : 'rgba(251,191,36,0.2)'}`,
                                                                borderRadius: '10px', padding: '10px 12px',
                                                                display: 'flex', flexDirection: 'column', gap: '6px',
                                                                marginBottom: '8px',
                                                            }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                                                                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                                                        </svg>
                                                                        <span style={{ fontSize: '12px', color: '#22c55e' }}>تم الرفع</span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        <span style={{ fontSize: '12px', color: '#94a3b8', direction: 'ltr' }}>{lec.videoFileName || lec.title}</span>
                                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                                                                            <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" strokeLinecap="round" />
                                                                        </svg>
                                                                        <button onClick={() => videoInputRefs.current[`${level.id}-${lec.id}`]?.click()} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '6px', padding: '3px 8px', color: '#94a3b8', fontSize: '11px', cursor: 'pointer' }}>تغيير</button>
                                                                    </div>
                                                                </div>
                                                                {/* HLS processing indicator */}
                                                                {!lec.hlsReady && (
                                                                    <div style={{
                                                                        display: 'flex', alignItems: 'center', gap: '6px',
                                                                        fontSize: '11px', color: '#fbbf24',
                                                                        background: 'rgba(251,191,36,0.08)',
                                                                        borderRadius: '6px', padding: '4px 8px',
                                                                    }}>
                                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                                                            style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                                                                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" strokeLinecap="round" />
                                                                        </svg>
                                                                        جاري معالجة الفيديو للبث... (يمكنك المتابعة)
                                                                    </div>
                                                                )}
                                                                {lec.hlsReady && (
                                                                    <div style={{
                                                                        display: 'flex', alignItems: 'center', gap: '6px',
                                                                        fontSize: '11px', color: '#22c55e',
                                                                        background: 'rgba(34,197,94,0.08)',
                                                                        borderRadius: '6px', padding: '4px 8px',
                                                                    }}>
                                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                                                        </svg>
                                                                        جاهز للبث
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* ERROR — video */}
                                                        {lec.uploadStatus === 'error' && (
                                                            <div style={{
                                                                padding: '10px 12px',
                                                                background: 'rgba(239,68,68,0.1)',
                                                                border: '1px solid rgba(239,68,68,0.3)',
                                                                borderRadius: '8px',
                                                                display: 'flex', alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                color: '#f87171', fontSize: '12px',
                                                                marginBottom: '8px',
                                                            }}>
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                                                                    </svg>
                                                                    {lec.uploadError || 'فشل رفع الملف'}
                                                                </span>
                                                                <button onClick={() => videoInputRefs.current[`${level.id}-${lec.id}`]?.click()} style={{ background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: '6px', padding: '4px 10px', color: '#f87171', fontSize: '11px', cursor: 'pointer' }}>إعادة المحاولة</button>
                                                            </div>
                                                        )}

                                                        {/* Hidden video file input */}
                                                        <input
                                                            key={`video-${lec.id}`}
                                                            ref={el => { videoInputRefs.current[`${level.id}-${lec.id}`] = el; }}
                                                            type="file"
                                                            accept="video/*"
                                                            onChange={(e) => handleVideoInputChange(level.id, lec.id, e)}
                                                            style={{ display: 'none' }}
                                                        />

                                                        {/* ── DOCUMENT SECTION ── */}
                                                        <div style={{ marginTop: '10px' }}>
                                                            <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', textAlign: 'right' }}>الملفات المرفوعة</p>

                                                            {/* Render each doc in the list */}
                                                            {(lec.docs || []).map((doc) => (
                                                                <div key={doc.id} style={{ marginBottom: '6px' }}>
                                                                    {doc.uploadStatus === 'uploading' ? (
                                                                        /* ── uploading tile ── */
                                                                        <div style={{
                                                                            background: 'rgba(15,23,42,0.85)',
                                                                            border: '1px solid rgba(251,191,36,0.25)',
                                                                            borderRadius: '10px',
                                                                            padding: '10px 12px',
                                                                            overflow: 'hidden',
                                                                        }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                                                <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 700 }}>{doc.uploadProgress}%</span>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                                                    <span style={{
                                                                                        fontSize: '12px', color: '#e2e8f0',
                                                                                        direction: 'ltr', overflow: 'hidden',
                                                                                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                                                        maxWidth: '180px',
                                                                                    }}>{doc.fileName}</span>
                                                                                    <div style={{
                                                                                        width: '30px', height: '30px', borderRadius: '7px',
                                                                                        background: 'rgba(251,191,36,0.15)',
                                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                                                                    }}>
                                                                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
                                                                                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" strokeLinecap="round" />
                                                                                        </svg>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            {/* Progress bar */}
                                                                            <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                                                                                <div style={{
                                                                                    width: `${doc.uploadProgress}%`,
                                                                                    height: '100%',
                                                                                    background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                                                                                    borderRadius: '2px',
                                                                                    transition: 'width 0.25s ease',
                                                                                }} />
                                                                            </div>
                                                                        </div>
                                                                    ) : doc.uploadStatus === 'success' ? (
                                                                        /* ── success tile ── */
                                                                        <div style={{
                                                                            background: 'rgba(15,23,42,0.6)',
                                                                            border: '1px solid rgba(255,255,255,0.07)',
                                                                            borderRadius: '10px', padding: '9px 12px',
                                                                            display: 'flex', alignItems: 'center',
                                                                            justifyContent: 'space-between',
                                                                        }}>
                                                                            <button
                                                                                onClick={() => updateLecture(level.id, lec.id, 'docs' as keyof Lecture, (prev: LectureDoc[] | undefined) => (prev || []).filter(d => d.id !== doc.id))}
                                                                                style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '2px', flexShrink: 0 }}
                                                                                title="حذف"
                                                                            >
                                                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                                                                                </svg>
                                                                            </button>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                                                <div>
                                                                                    <div style={{
                                                                                        fontSize: '12px', color: '#e2e8f0',
                                                                                        direction: 'ltr', overflow: 'hidden',
                                                                                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                                                        maxWidth: '180px', textAlign: 'right',
                                                                                    }}>{doc.fileName}</div>
                                                                                    <div style={{ fontSize: '10px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
                                                                                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                                                                                        مكتمل
                                                                                    </div>
                                                                                </div>
                                                                                <div style={{
                                                                                    width: '30px', height: '30px', borderRadius: '7px',
                                                                                    background: 'rgba(251,191,36,0.12)',
                                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                                                                }}>
                                                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
                                                                                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h4" strokeLinecap="round" />
                                                                                    </svg>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        /* ── error tile ── */
                                                                        <div style={{
                                                                            background: 'rgba(239,68,68,0.08)',
                                                                            border: '1px solid rgba(239,68,68,0.25)',
                                                                            borderRadius: '8px', padding: '8px 12px',
                                                                            display: 'flex', alignItems: 'center',
                                                                            justifyContent: 'space-between',
                                                                            color: '#f87171', fontSize: '11px',
                                                                        }}>
                                                                            <button
                                                                                onClick={() => updateLecture(level.id, lec.id, 'docs' as keyof Lecture, (prev: LectureDoc[] | undefined) => (prev || []).filter(d => d.id !== doc.id))}
                                                                                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px' }}
                                                                            >
                                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                                                                                </svg>
                                                                            </button>
                                                                            <span style={{ direction: 'ltr', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                                                                                {doc.uploadError || 'فشل الرفع'} — {doc.fileName}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}

                                                            {/* Add files button — always visible */}
                                                            <button
                                                                onClick={() => docInputRefs.current[`${level.id}-${lec.id}`]?.click()}
                                                                style={{
                                                                    width: '100%', padding: '8px 12px',
                                                                    background: 'rgba(251,191,36,0.06)',
                                                                    border: '1px dashed rgba(251,191,36,0.22)',
                                                                    borderRadius: '8px', color: '#fbbf24',
                                                                    fontSize: '11px', cursor: 'pointer',
                                                                    display: 'flex', alignItems: 'center',
                                                                    justifyContent: 'center', gap: '6px',
                                                                    marginTop: (lec.docs || []).length > 0 ? '6px' : '0',
                                                                }}
                                                            >
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                                                                </svg>
                                                                إضافة ملفات (PDF, Word, PPT...)
                                                            </button>

                                                            <input
                                                                key={`doc-${lec.id}`}
                                                                ref={el => { docInputRefs.current[`${level.id}-${lec.id}`] = el; }}
                                                                type="file"
                                                                multiple
                                                                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                                                                onChange={(e) => handleDocInputChange(level.id, lec.id, e)}
                                                                style={{ display: 'none' }}
                                                            />
                                                        </div>

                                                        {/* YouTube/Drive URL */}
                                                        <input
                                                            id={`lec-video-${lec.id}`}
                                                            name={`lecVideo-${lec.id}`}
                                                            aria-label="رابط الفيديو"
                                                            value={lec.videoUrl}
                                                            onChange={e => updateLecture(level.id, lec.id, 'videoUrl', e.target.value)}
                                                            placeholder="أو أدخل رابط YouTube/Drive"
                                                            style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', color: '#64748b', fontSize: '12px', fontFamily: "'Cairo', sans-serif", outline: 'none', marginTop: '8px' }}
                                                        />
                                                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal footer */}
                <div style={{
                    padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <button
                        onClick={() => createStep > 1 ? setCreateStep(createStep - 1) : onClose()}
                        style={{
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px', padding: '10px 20px', color: '#94a3b8',
                            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                            fontFamily: "'Cairo', sans-serif",
                        }}
                    >
                        {createStep > 1 ? 'السابق' : 'إلغاء'}
                    </button>

                    {createStep < 3 ? (
                        <button
                            onClick={() => setCreateStep(createStep + 1)}
                            disabled={createStep === 1 && !newSubjectName.trim()}
                            style={{
                                background: createStep === 1 && !newSubjectName.trim()
                                    ? 'rgba(245, 158, 11, 0.3)'
                                    : 'linear-gradient(135deg, #f59e0b, #d97706)',
                                border: 'none', borderRadius: '12px', padding: '10px 24px',
                                color: '#fff', fontSize: '14px', fontWeight: 700,
                                cursor: createStep === 1 && !newSubjectName.trim() ? 'not-allowed' : 'pointer',
                                fontFamily: "'Cairo', sans-serif",
                                display: 'flex', alignItems: 'center', gap: '6px',
                            }}
                        >
                            التالي
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                            {uploadingCount > 0 && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    fontSize: '11px', color: '#fbbf24',
                                    background: 'rgba(251,191,36,0.1)',
                                    border: '1px solid rgba(251,191,36,0.2)',
                                    borderRadius: '8px', padding: '5px 10px',
                                }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                        style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" strokeLinecap="round" />
                                    </svg>
                                    جاري رفع {uploadingCount} {uploadingCount === 1 ? 'ملف' : 'ملفات'} — يمكنك الحفظ الآن وسيكتمل الرفع تلقائياً
                                </div>
                            )}
                            <button
                                onClick={onSave}
                                disabled={isSaving}

                                style={{
                                    background: isSaving
                                        ? 'rgba(16, 185, 129, 0.4)'
                                        : 'linear-gradient(135deg, #10b981, #059669)',
                                    border: 'none', borderRadius: '12px', padding: '10px 24px',
                                    color: '#fff', fontSize: '14px', fontWeight: 700,
                                    cursor: isSaving ? 'not-allowed' : 'pointer',
                                    fontFamily: "'Cairo', sans-serif",
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    boxShadow: isSaving ? 'none' : '0 4px 15px rgba(16, 185, 129, 0.3)',
                                    opacity: isSaving ? 0.6 : 1,
                                    transition: 'all 0.2s',
                                }}>
                                {isSaving ? (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                            style={{ animation: 'spin 0.8s linear infinite' }}>
                                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                                                strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        جاري الحفظ...
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        {editingSubject ? 'حفظ التعديلات' : 'حفظ المادة'}
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SubjectModal;
