import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '../../contexts/ToastContext';
import {
    uploadStudyResource, fetchMyStudyLibrary, downloadStudyResource, deleteStudyResource,
    StudyResourceDTO,
} from '../../api/study-library.api';

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

function formatSize(bytes: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} بايت`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} ج.ب`;
}

// ── Upload panel ─────────────────────────────────────────────────────────────
const UploadPanel: React.FC<{ onUploaded: () => void }> = ({ onUploaded }) => {
    const { showToast } = useToast();
    const fileRef = useRef<HTMLInputElement>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [grade, setGrade] = useState(GRADES[0]);
    const [term, setTerm] = useState(TERMS[0]);
    const [subjectName, setSubjectName] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const pickLabel = file ? file.name : 'اختر ملفاً للرفع';

    const submit = async () => {
        if (!file) {
            showToast('يرجى اختيار ملف للرفع', 'error');
            return;
        }
        if (!title.trim()) {
            showToast('يرجى كتابة عنوان للملف', 'error');
            return;
        }
        setUploading(true);
        try {
            await uploadStudyResource({
                title,
                grade,
                term,
                description: description || undefined,
                subjectName: subjectName || undefined,
                isPublic,
                file,
            });
            showToast('✓ تم رفع الملف بنجاح', 'success');
            setTitle('');
            setDescription('');
            setSubjectName('');
            setFile(null);
            if (fileRef.current) fileRef.current.value = '';
            onUploaded();
        } catch (e: any) {
            const msg = e?.status === 401 ? 'انتهت صلاحية الجلسة' :
                e?.status === 413 ? 'الملف كبير جداً' :
                e?.status === 0 ? 'تعذر الاتصال بالخادم' :
                (e?.message || 'حدث خطأ أثناء رفع الملف');
            showToast(msg, 'error');
        }
        setUploading(false);
    };

    return (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                    <label style={labelStyle}>{'العنوان *'}</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: شرح درس الخلية للصف السادس"
                        style={inputStyle} />
                </div>
                <div>
                    <label style={labelStyle}>{'الصف'}</label>
                    <select value={grade} onChange={e => setGrade(e.target.value)} style={inputStyle}>
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>{'الترم'}</label>
                    <select value={term} onChange={e => setTerm(e.target.value)} style={inputStyle}>
                        {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>{'المادة (اختياري)'}</label>
                    <input value={subjectName} onChange={e => setSubjectName(e.target.value)} placeholder="مثال: علوم"
                        style={inputStyle} />
                </div>
            </div>

            <div style={{ marginTop: '14px' }}>
                <label style={labelStyle}>{'وصف مختصر (اختياري)'}</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="نبذة عن محتوى الملف"
                    style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} />
            </div>

            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <button onClick={() => fileRef.current?.click()}
                        style={{ padding: '11px 18px', borderRadius: '10px', border: '1.5px dashed #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Cairo', sans-serif" }}>
                        📁 {pickLabel}
                    </button>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer', fontWeight: 600 }}>
                        <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
                        متاح للطلاب
                    </label>
                </div>
                <input ref={fileRef} type="file" hidden onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>

            <button onClick={submit} disabled={uploading}
                style={{
                    marginTop: '18px', padding: '11px 22px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(90deg,#f59e0b,#d97706)', color: '#fff', fontSize: '14px', fontWeight: 700,
                    fontFamily: "'Cairo', sans-serif", boxShadow: '0 8px 20px rgba(245,158,11,0.25)',
                }}>
                {uploading ? 'جاري الرفع…' : 'رفع الملف'}
            </button>
        </div>
    );
};

// ── My files panel ───────────────────────────────────────────────────────────
const MyFilesPanel: React.FC<{ resources: StudyResourceDTO[]; onDelete: (id: string) => void; onUpdated: () => void }>
    = ({ resources, onDelete, onUpdated }) => {
        const [filterGrade, setFilterGrade] = useState('');
        const [filterTerm, setFilterTerm] = useState('');
        const [q, setQ] = useState('');
        const { showToast } = useToast();

        const filtered = resources.filter(r =>
            (!filterGrade || r.grade === filterGrade) &&
            (!filterTerm || r.term === filterTerm) &&
            (!q.trim() || r.title.toLowerCase().includes(q.trim().toLowerCase()))
        );

        return (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث بالعنوان…"
                        style={{ ...inputStyle, maxWidth: '260px' }} />
                    <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} style={{ ...inputStyle, maxWidth: '190px' }}>
                        <option value="">كل الصفوف</option>
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)} style={{ ...inputStyle, maxWidth: '140px' }}>
                        <option value="">كل الترمين</option>
                        {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                {filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px', fontSize: '14px' }}>
                        لا توجد ملفات مطابقة
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {filtered.map(r => (
                            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 14px', border: '1px solid #eef2f7', borderRadius: '12px', background: '#fbfcfe', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1', minWidth: '200px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                                        📄
                                    </div>
                                    <div style={{ minWidth: '0' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f2233' }}>{r.title}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                                            {r.grade} • {r.term}
                                            {r.subjectName ? ` • ${r.subjectName}` : ''} • {formatSize(r.sizeBytes)}
                                            {r.public ? ' • متاح للطلاب' : ' • خاص'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => downloadStudyResource(r.id, r.fileName).catch(() => showToast('تعذر تحميل الملف', 'error'))}
                                        style={actionBtn('#1E3A8A', '#eef2ff')}>
                                        تحميل
                                    </button>
                                    <button onClick={() => { if (window.confirm(`حذف "${r.title}"؟`)) onDelete(r.id); }}
                                        style={actionBtn('#DC2626', '#fee2e2')}>
                                        حذف
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', fontFamily: "'Cairo', sans-serif",
};

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff',
    fontSize: '13px', color: '#0f2233', outline: 'none', fontFamily: "'Cairo', sans-serif", boxSizing: 'border-box',
};

const actionBtn = (fg: string, bg: string): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
    color: fg, background: bg, fontFamily: "'Cairo', sans-serif",
});

// ── Main tab ─────────────────────────────────────────────────────────────────
const StudyLibraryTab: React.FC = () => {
    const { showToast } = useToast();
    const [active, setActive] = useState<'upload' | 'mine'>('upload');
    const [resources, setResources] = useState<StudyResourceDTO[]>([]);
    const [loadKey, setLoadKey] = useState(0);

    const loadMine = useCallback(() => {
        setLoadKey(k => k + 1);
    }, []);

    useEffect(() => {
        if (active !== 'mine') return;
        let cancelled = false;
        fetchMyStudyLibrary().then(list => { if (!cancelled) setResources(list); });
        return () => { cancelled = true; };
    }, [active, loadKey]);

    const handleDelete = async (id: string) => {
        try {
            await deleteStudyResource(id);
            setResources(prev => prev.filter(r => r.id !== id));
            showToast('تم حذف الملف', 'success');
        } catch {
            showToast('حدث خطأ أثناء الحذف', 'error');
        }
    };

    const tabs = [
        { key: 'upload' as const, label: 'رفع ملف', icon: '⬆️' },
        { key: 'mine' as const, label: `ملفاتي (${resources.length})`, icon: '🗂️' },
    ];

    return (
        <div style={{ animation: 'fadeIn 0.3s ease' }} className="space-y-4">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#0f2233', margin: 0, fontFamily: "'Cairo', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 6v8M8 10l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    المكتبة الدراسية
                </h2>
            </div>

            <div style={{ display: 'flex', gap: '8px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '6px', width: 'fit-content' }}>
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setActive(t.key)}
                        style={{
                            padding: '9px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '13px',
                            background: active === t.key ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'transparent',
                            color: active === t.key ? '#fff' : '#64748b',
                            border: 'none', fontFamily: "'Cairo', sans-serif",
                            display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s',
                        }}>
                        <span>{t.icon}</span>{t.label}
                    </button>
                ))}
            </div>

            {active === 'upload' && <UploadPanel onUploaded={loadMine} />}
            {active === 'mine' && <MyFilesPanel resources={resources} onDelete={handleDelete} onUpdated={loadMine} />}
        </div>
    );
};

export default StudyLibraryTab;