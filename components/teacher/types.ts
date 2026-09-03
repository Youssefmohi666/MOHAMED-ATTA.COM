
export interface LectureDoc {
    id: string;           // local temp id for tracking
    fileName: string;
    mediaFileId?: string;
    uploadStatus: 'uploading' | 'success' | 'error';
    uploadProgress: number;
    uploadError?: string;
}

export interface Lecture {
    id: string;
    title: string;
    duration: string;
    videoUrl: string;
    mediaFileId?: string;
    uploadProgress?: number;
    uploadStatus?: 'idle' | 'uploading' | 'success' | 'error';
    /** True while bytes are fully sent but server hasn't responded yet */
    uploadProcessing?: boolean;
    uploadError?: string;
    videoFileName?: string;
    /** True once background HLS transcoding is complete for this lecture's video */
    hlsReady?: boolean;
    // Multiple attached documents
    docs?: LectureDoc[];
    // Legacy single-doc fields (kept for save compatibility)
    documentFileId?: string;
}

export interface Level {
    id: string;
    title: string;
    lectures: Lecture[];
}

export interface Subject {
    id: string;
    title: string;
    description: string;
    icon: string;
    category?: string;
    price?: number;
    level?: string;
    grade?: string;
    term?: string;
    levels: Level[];
    students: number;
    status: 'published' | 'draft';
    createdAt: string;
}

export type TeacherNavItem = 'overview' | 'dashboard' | 'subjects' | 'students' | 'groups' | 'library' | 'ai' | 'analytics' | 'profile' | 'accounting' | 'exams' | 'bank' | 'attendance';

// Category to Icon mapping
export const categoryIcons: Record<string, string> = {
    'عام': '📚',
    'رياضيات': '📐',
    'علوم': '🧪',
    'العلوم المتكاملة': '🧬',
    'لغة عربية': '✍️',
    'لغة إنجليزية': '🌍',
    'علوم الحاسب': '💻',
    'برمجة': '💻',
    'فنون': '🎨',
    'تربية دينية': '🕌',
};
