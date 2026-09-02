import { apiRequest } from "./client";
import { sanitizeSearchQuery, validateGuid, sanitizePlainText, validatePrice } from "../utils/validation";

export function getTeacherProfile() {
    return apiRequest("/teacher");
}

export function getSubjects() {
    return apiRequest("/teacher/subjects");
}

export function createSubject(data: {
    name: string;
    description?: string;
    icon?: string;
    levels?: { name: string; sortOrder?: number; lectures?: { title: string; videoUrl?: string; mediaFileId?: string; sortOrder?: number }[] }[];
}) {
    // Sanitize input data
    const sanitizedData = {
        ...data,
        name: sanitizePlainText(data.name, 200),
        description: data.description ? sanitizePlainText(data.description, 5000) : undefined,
        icon: data.icon ? sanitizePlainText(data.icon, 50) : undefined,
    };
    return apiRequest("/teacher/subjects", {
        method: "POST",
        body: JSON.stringify(sanitizedData),
    });
}

export function updateSubject(id: string, data: {
    name?: string;
    title?: string;
    description?: string;
    category?: string;
    duration?: number;
    level?: string;
    language?: string;
    price?: number;
    imageUrl?: string;
    icon?: string;
    status?: string;
    grade?: string;
    term?: string;
    levels?: Array<{
        id?: string;
        title: string;
        sortOrder: number;
        lectures?: Array<{
            id?: string;
            title: string;
            duration?: string;
            videoUrl?: string;
            mediaFileId?: string;
            videoFileId?: string;
            documentFileIds?: string[];
            sortOrder: number;
        }>;
    }>;
}) {
    // Validate ID
    if (!validateGuid(id)) {
        throw new Error('معرف المادة غير صالح');
    }

    // Sanitize and validate input data
    const sanitizedData: Record<string, any> = {};

    if (data.name !== undefined) {
        sanitizedData.name = sanitizePlainText(data.name, 200);
    }
    if (data.title !== undefined) {
        sanitizedData.title = sanitizePlainText(data.title, 200);
    }
    if (data.description !== undefined) {
        sanitizedData.description = sanitizePlainText(data.description, 5000);
    }
    if (data.category !== undefined) {
        sanitizedData.category = sanitizePlainText(data.category, 100);
    }
    if (data.level !== undefined) {
        sanitizedData.level = sanitizePlainText(data.level, 50);
    }
    if (data.grade !== undefined) {
        sanitizedData.grade = sanitizePlainText(data.grade, 100);
    }
    if (data.term !== undefined) {
        sanitizedData.term = sanitizePlainText(data.term, 50);
    }
    if (data.language !== undefined) {
        sanitizedData.language = sanitizePlainText(data.language, 50);
    }
    if (data.price !== undefined) {
        if (!validatePrice(data.price)) {
            throw new Error('السعر غير صالح');
        }
        sanitizedData.price = data.price;
    }
    if (data.duration !== undefined) {
        const durationNum = Number(data.duration);
        if (isNaN(durationNum) || durationNum < 0 || durationNum > 9999) {
            throw new Error('المدة غير صالحة');
        }
        sanitizedData.duration = durationNum;
    }
    if (data.imageUrl !== undefined) {
        sanitizedData.imageUrl = data.imageUrl ? sanitizePlainText(data.imageUrl, 1000) : undefined;
    }
    if (data.icon !== undefined) {
        sanitizedData.icon = sanitizePlainText(data.icon, 50);
    }
    if (data.status !== undefined) {
        // Only allow specific status values
        const allowedStatuses = ['draft', 'published', 'archived', 'pending'];
        if (!allowedStatuses.includes(data.status)) {
            throw new Error('الحالة غير صالحة');
        }
        sanitizedData.status = data.status;
    }
    if (data.levels !== undefined) {
        sanitizedData.levels = data.levels;
    }

    return apiRequest(`/teacher/subjects/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(sanitizedData),
    });
}

export function deleteSubject(id: string) {
    // Validate ID
    if (!validateGuid(id)) {
        throw new Error('معرف المادة غير صالح');
    }
    return apiRequest(`/teacher/subjects/${encodeURIComponent(id)}`, {
        method: "DELETE",
    });
}

export function publishSubject(id: string, status: string) {
    // Validate ID
    if (!validateGuid(id)) {
        throw new Error('معرف المادة غير صالح');
    }
    // Validate status
    const allowedStatuses = ['draft', 'published', 'archived', 'pending'];
    if (!allowedStatuses.includes(status)) {
        throw new Error('الحالة غير صالحة');
    }
    return apiRequest(`/teacher/subjects/${encodeURIComponent(id)}/publish`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
    });
}

export function getTeacherStats() {
    return apiRequest("/teacher/stats");
}

export function getTeacherStudents(search?: string) {
    let qs = "";
    if (search) {
        const sanitizedSearch = sanitizeSearchQuery(search);
        if (sanitizedSearch) {
            qs = `?search=${encodeURIComponent(sanitizedSearch)}`;
        }
    }
    return apiRequest(`/teacher/students${qs}`);
}

export async function pingTeacherAuth(): Promise<boolean> {
    try {
        await apiRequest("/teacher");
        return true;
    } catch {
        return false;
    }
}

export function createCourseWithCurriculum(data: {
    title: string;
    description?: string;
    category: string;
    duration: number;
    level?: string;
    grade?: string;
    term?: string;
    language?: string;
    price: number;
    imageUrl?: string;
    sections: Array<{
        title: string;
        sortOrder?: number;
        lectures: Array<{
            title: string;
            duration?: string;
            videoUrl?: string;
            mediaFileId?: string;
            videoFileId?: string;
            documentFileIds?: string[];
            sortOrder?: number;
            isPreview?: boolean;
        }>;
    }>;
}) {
    const payload = {
        title: data.title,
        description: data.description,
        category: data.category,
        duration: data.duration,
        level: data.level,
        grade: data.grade,
        term: data.term,
        language: data.language,
        price: data.price,
        imageUrl: data.imageUrl,
        icon: "📚",
        levels: data.sections.map((section, idx) => ({
            title: section.title,
            sortOrder: section.sortOrder ?? idx,
            lectures: section.lectures.map((lec, lecIdx) => ({
                title: lec.title,
                duration: lec.duration,
                videoUrl: lec.videoUrl,
                mediaFileId: lec.mediaFileId,
                videoFileId: lec.videoFileId,
                documentFileIds: lec.documentFileIds,
                sortOrder: lec.sortOrder ?? lecIdx,
            })),
        })),
    };
    return apiRequest("/teacher/subjects", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

// ── Legacy-compatible wrappers ─────────────────────────────────

export const fetchTeacherSubjects = async (): Promise<any[]> => {
    try {
        const json = await getSubjects();
        return (json.data ?? []) as any[];
    } catch {
        return [];
    }
};

export const fetchTeacherStats = async (): Promise<any> => {
    try {
        const json = await getTeacherStats();
        return json.data ?? null;
    } catch {
        return null;
    }
};

export const fetchTeacherStudents = async (search?: string): Promise<any[]> => {
    try {
        const json = await getTeacherStudents(search);
        return json.data ?? [];
    } catch {
        return [];
    }
};

// ── Student tracking detail ────────────────────────────────────────────────

export function getStudentDetail(id: string) {
    if (!validateGuid(id)) {
        throw new Error('معرف الطالب غير صالح');
    }
    return apiRequest(`/teacher/students/${encodeURIComponent(id)}`);
}

export const fetchStudentDetail = async (id: string): Promise<any | null> => {
    try {
        const json = await getStudentDetail(id);
        return json.data ?? null;
    } catch {
        return null;
    }
};

// ── AI features (file analysis + report generation) ─────────────────────────

export function analyzeFile(file: File, context?: string) {
    if (!file) throw new Error('لم يتم اختيار ملف');
    const form = new FormData();
    form.append('file', file);
    if (context && context.trim()) {
        form.append('context', sanitizePlainText(context, 1000));
    }
    return apiRequest('/ai/analyze-file', {
        method: 'POST',
        body: form,
    });
}

export function generateReport(payload: {
    reportType: 'student' | 'subject' | 'class';
    studentName?: string;
    subjectName?: string;
    contextJson?: object | string;
    customPrompt?: string;
}) {
    const body: Record<string, any> = {
        reportType: payload.reportType,
        studentName: payload.studentName ? sanitizePlainText(payload.studentName, 200) : undefined,
        subjectName: payload.subjectName ? sanitizePlainText(payload.subjectName, 200) : undefined,
        customPrompt: payload.customPrompt ? sanitizePlainText(payload.customPrompt, 2000) : undefined,
    };
    if (payload.contextJson !== undefined) {
        body.contextJson = typeof payload.contextJson === 'string'
            ? payload.contextJson
            : JSON.stringify(payload.contextJson);
    } else {
        body.contextJson = '';
    }
    return apiRequest('/ai/generate-report', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export const createTeacherSubject = createSubject;
export const updateTeacherSubject = updateSubject;
export const deleteTeacherSubject = deleteSubject;
export const publishTeacherSubject = publishSubject;

// ── Student Groups (Feature 1) ───────────────────────────────────────────────

export interface StudentGroupMember {
    id?: number;
    studentId: string;
    studentName: string;
    studentEmail?: string;
    phoneNumber?: string;
    joinedAt?: string;
}

export interface StudentGroup {
    id: string;
    name: string;
    description?: string;
    subjectId?: string | null;
    subjectName?: string | null;
    color: string;
    memberCount: number;
    createdAt: string;
    members: StudentGroupMember[];
}

export function getStudentGroups(): Promise<{ data: StudentGroup[] }> {
    return apiRequest("/teacher/groups");
}

export function createStudentGroup(data: {
    name: string;
    description?: string;
    subjectId?: string | null;
    color?: string;
}) {
    const payload = {
        name: sanitizePlainText(data.name, 200),
        description: data.description ? sanitizePlainText(data.description, 500) : undefined,
        subjectId: data.subjectId || undefined,
        color: data.color ? sanitizePlainText(data.color, 50) : undefined,
    };
    return apiRequest("/teacher/groups", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function updateStudentGroup(id: string, data: {
    name?: string;
    description?: string;
    subjectId?: string | null;
    color?: string;
}) {
    if (!validateGuid(id)) throw new Error('معرف المجموعة غير صالح');
    const payload: Record<string, any> = {};
    if (data.name !== undefined) payload.name = sanitizePlainText(data.name, 200);
    if (data.description !== undefined) payload.description = sanitizePlainText(data.description, 500);
    if (data.color !== undefined) payload.color = sanitizePlainText(data.color, 50);
    if (data.subjectId !== undefined) payload.subjectId = data.subjectId || null;
    return apiRequest(`/teacher/groups/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}

export function deleteStudentGroup(id: string) {
    if (!validateGuid(id)) throw new Error('معرف المجموعة غير صالح');
    return apiRequest(`/teacher/groups/${encodeURIComponent(id)}`, {
        method: "DELETE",
    });
}

export function addGroupMembers(id: string, studentIds: string[]) {
    if (!validateGuid(id)) throw new Error('معرف المجموعة غير صالح');
    return apiRequest(`/teacher/groups/${encodeURIComponent(id)}/members`, {
        method: "POST",
        body: JSON.stringify({ studentIds }),
    });
}

export function removeGroupMember(id: string, studentId: string) {
    if (!validateGuid(id)) throw new Error('معرف المجموعة غير صالح');
    if (!validateGuid(studentId)) throw new Error('معرف الطالب غير صالح');
    return apiRequest(`/teacher/groups/${encodeURIComponent(id)}/members/${encodeURIComponent(studentId)}`, {
        method: "DELETE",
    });
}

export function getAvailableStudents(search?: string): Promise<{ data: StudentGroupMember[] }> {
    let qs = "";
    if (search && search.trim()) {
        const sanitizedSearch = sanitizeSearchQuery(search);
        if (sanitizedSearch) qs = `?search=${encodeURIComponent(sanitizedSearch)}`;
    }
    return apiRequest(`/teacher/groups/available-students${qs}`);
}

export const fetchStudentGroups = async (): Promise<StudentGroup[]> => {
    try {
        const json = await getStudentGroups();
        return json.data ?? [];
    } catch {
        return [];
    }
};
