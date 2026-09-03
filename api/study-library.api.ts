import { apiRequest, authedFetch } from "./client";
import { API_BASE } from "../config/api.config";
import { sanitizePlainText } from "../utils/validation";

export interface StudyResourceDTO {
    id: string;
    title: string;
    description?: string;
    fileName: string;
    fileType?: string;
    grade: string;
    term: string;
    subjectId?: string | null;
    subjectName?: string | null;
    courseId?: string | null;
    courseName?: string | null;
    sizeBytes: number;
    public: boolean;
    uploadedAt: string;
}

export interface PagedStudyResources {
    items: StudyResourceDTO[];
    total: number;
    page: number;
    perPage: number;
}

export interface UploadStudyResourcePayload {
    title: string;
    grade: string;
    term: string;
    description?: string;
    subjectId?: string;
    subjectName?: string;
    courseId?: string;
    courseName?: string;
    isPublic?: boolean;
    file: File;
}

export function uploadStudyResource(data: UploadStudyResourcePayload) {
    const form = new FormData();
    form.append("title", sanitizePlainText(data.title, 300));
    form.append("grade", sanitizePlainText(data.grade, 100));
    form.append("term", sanitizePlainText(data.term, 100));
    if (data.description && data.description.trim()) {
        form.append("description", sanitizePlainText(data.description, 5000));
    }
    if (data.subjectId) form.append("subjectId", data.subjectId);
    if (data.subjectName) form.append("subjectName", sanitizePlainText(data.subjectName, 200));
    if (data.courseId) form.append("courseId", data.courseId);
    if (data.courseName) form.append("courseName", sanitizePlainText(data.courseName, 200));
    form.append("isPublic", data.isPublic ? "true" : "false");
    form.append("file", data.file);
    return apiRequest("/study-library/upload", {
        method: "POST",
        body: form,
    });
}

export function fetchStudyResources(params?: {
    grade?: string;
    term?: string;
    subjectId?: string;
    search?: string;
    page?: number;
    perPage?: number;
}) {
    const qs = new URLSearchParams();
    if (params?.grade) qs.set("grade", params.grade);
    if (params?.term) qs.set("term", params.term);
    if (params?.subjectId) qs.set("subjectId", params.subjectId);
    if (params?.search) qs.set("search", params.search);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.perPage) qs.set("perPage", String(params.perPage));
    const s = qs.toString();
    return apiRequest(`/study-library${s ? `?${s}` : ""}`);
}

export const fetchStudyLibrary = async (params?: {
    grade?: string;
    term?: string;
    subjectId?: string;
    search?: string;
    page?: number;
    perPage?: number;
}): Promise<PagedStudyResources> => {
    try {
        const json = await fetchStudyResources(params);
        return json.data ?? { items: [], total: 0, page: 1, perPage: 50 };
    } catch {
        return { items: [], total: 0, page: 1, perPage: 50 };
    }
};

export function fetchMyStudyResources() {
    return apiRequest("/study-library/mine");
}

export const fetchMyStudyLibrary = async (): Promise<StudyResourceDTO[]> => {
    try {
        const json = await fetchMyStudyResources();
        const data = json.data ?? [];
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
};

export function getStudyResource(id: string) {
    return apiRequest(`/study-library/${encodeURIComponent(id)}`);
}

export function downloadStudyResource(id: string, fileName: string) {
    return authedFetch(`${API_BASE}/study-library/${encodeURIComponent(id)}/download`)
        .then(async (res) => {
            if (!res.ok) throw new Error("تعذر تحميل الملف");
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName || "download";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        });
}

export function deleteStudyResource(id: string) {
    return apiRequest(`/study-library/${encodeURIComponent(id)}`, {
        method: "DELETE",
    });
}
