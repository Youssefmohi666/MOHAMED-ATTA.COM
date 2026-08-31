import { apiRequest } from "./client";
import { Course, Lecture, CurriculumSection } from "../types/types";
import { sanitizeSearchQuery, validateNumericId, validateGuid } from "../utils/validation";

// ─── Raw API calls ───────────────────────────────────────────

export function getCourses(params?: { category?: string; level?: string; search?: string; page?: number; per_page?: number }) {
    const qs = new URLSearchParams();
    if (params?.category) {
        // Sanitize category - only allow alphanumeric and common separators
        const sanitizedCategory = params.category.replace(/[^\u0600-\u06FFa-zA-Z0-9\s\-_]/g, '').trim();
        if (sanitizedCategory) qs.append("category", sanitizedCategory);
    }
    if (params?.level) {
        // Sanitize level
        const sanitizedLevel = params.level.replace(/[^\u0600-\u06FFa-zA-Z0-9\s\-_]/g, '').trim();
        if (sanitizedLevel) qs.append("level", sanitizedLevel);
    }
    if (params?.search) {
        // Sanitize search query
        const sanitizedSearch = sanitizeSearchQuery(params.search);
        if (sanitizedSearch) qs.append("search", sanitizedSearch);
    }
    if (params?.page) {
        const pageNum = Math.max(1, Math.floor(Number(params.page)) || 1);
        qs.append("page", String(pageNum));
    }
    if (params?.per_page) {
        const perPage = Math.min(100, Math.max(1, Math.floor(Number(params.per_page)) || 20));
        qs.append("per_page", String(perPage));
    }
    const query = qs.toString();
    return apiRequest(`/subjects${query ? `?${query}` : ""}`);
}

export function getCourse(id: number | string) {
    // Validate ID before making request
    if (typeof id === 'number') {
        if (!validateNumericId(id)) {
            throw new Error('معرف المادة غير صالح');
        }
    } else if (typeof id === 'string') {
        // Allow numeric strings and valid GUIDs
        if (!validateGuid(id) && !/^\d+$/.test(id.trim())) {
            throw new Error('معرف المادة غير صالح');
        }
    }
    return apiRequest(`/subjects/${encodeURIComponent(String(id))}`);
}

export function getPopularCourses() {
    return apiRequest("/subjects/popular");
}

export function createCourse(data: {
    title: string;
    description?: string;
    category: string;
    duration?: number;
    level?: string;
    language?: string;
    price?: number;
    imageUrl?: string;
}) {
    return apiRequest("/subjects", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export function getReviews(courseId: number | string) {
    // Validate courseId
    if (typeof courseId === 'number') {
        if (!validateNumericId(courseId)) {
            throw new Error('معرف المادة غير صالح');
        }
    } else if (typeof courseId === 'string') {
        if (!validateGuid(courseId) && !/^\d+$/.test(courseId.trim())) {
            throw new Error('معرف المادة غير صالح');
        }
    }
    return apiRequest(`/subjects/${encodeURIComponent(String(courseId))}/reviews`);
}

export function createReview(courseId: number | string, data: { rating: number; comment?: string }) {
    return apiRequest(`/subjects/${courseId}/reviews`, {
        method: "POST",
        body: JSON.stringify(data),
    });
}

// ─── Helpers: map raw API item → Course type ─────────────────

function mapCourseItem(item: any): Course {
    return {
        id: Number(item.id) || 0,
        guidId: typeof item.id === 'string' && item.id.includes('-') ? item.id : (item.guidId || undefined),
        title: item.title ?? '',
        category: item.category ?? 'عام',
        description: item.description ?? '',
        instructorName: item.instructorName ?? item.teacherName ?? item.teacher?.name ?? undefined,
        instructorId: typeof item.instructorId === 'number' ? item.instructorId : undefined,
        rating: typeof item.rating === 'number' ? item.rating : 4.5,
        duration: typeof item.duration === 'number' ? item.duration : undefined,
        lecturesCount: typeof item.lecturesCount === 'number' ? item.lecturesCount : undefined,
        level: item.level ?? undefined,
        language: item.language ?? 'العربية',
        students: typeof item.studentsCount === 'number' ? item.studentsCount : 0,
        price: typeof item.price === 'number' ? item.price : 0,
        isFree: item.price === 0,
        imageUrl: item.imageUrl || '/assets/courses/default.png',
        lastUpdated: item.createdAt ?? item.updatedAt ?? undefined,
    };
}

function mapCourseDetail(item: any): Course {
    // Backend returns levels[].lectures[] for subjects (GUID id)
    // and curriculumSections[].lectures[] for old courses
    let curriculum: CurriculumSection[] | undefined;

    if (Array.isArray(item.levels) && item.levels.length > 0) {
        curriculum = item.levels.map((level: any) => ({
            section: level.title ?? level.name ?? '',
            lectures: Array.isArray(level.lectures)
                ? level.lectures.map((l: any): Lecture => ({
                    id: Number(l.id),
                    title: l.title ?? '',
                    durationSeconds: typeof l.duration === 'number' ? l.duration : undefined,
                    videoUrl: l.videoUrl || undefined,
                }))
                : []
        }));
    } else if (Array.isArray(item.curriculumSections)) {
        curriculum = item.curriculumSections.map((s: any) => ({
            section: s.title ?? '',
            lectures: Array.isArray(s.lectures)
                ? s.lectures.map((l: any): Lecture => ({
                    id: Number(l.id),
                    title: l.title ?? '',
                    durationSeconds: typeof l.durationSeconds === 'number' ? l.durationSeconds : undefined,
                    videoUrl: l.videoUrl || undefined,
                }))
                : []
        }));
    }

    // Compute total lecture count from curriculum if not provided
    const lecturesCount = typeof item.lecturesCount === 'number'
        ? item.lecturesCount
        : curriculum?.reduce((sum, s) => sum + s.lectures.length, 0);

    return {
        ...mapCourseItem(item),
        lecturesCount,
        curriculum,
    };
}

// ─── Data-mapping wrappers (used by components) ──────────────

export const fetchCourses = async (): Promise<{ data: Course[]; error?: string }> => {
    try {
        const json = await getCourses();
        const raw = Array.isArray(json) ? json : (json.data ?? []);
        const items = Array.isArray(raw) ? raw : [];
        const data: Course[] = items.map(mapCourseItem);
        return { data };
    } catch (error: any) {
        console.error('Error fetching courses', error);
        return { data: [], error: error?.message || 'Unknown error' };
    }
};

export const fetchCourseById = async (id: number | string): Promise<{ data: Course | null; error?: string }> => {
    try {
        const json = await getCourse(id);
        const item = json.data ?? json;
        if (!item) return { data: null };
        const data: Course = mapCourseDetail(item);
        return { data };
    } catch (error: any) {
        console.error('Error fetching course by ID', error);
        return { data: null, error: error?.message || 'Unknown error' };
    }
};

export const fetchSubjectById = async (id: string): Promise<{ data: any | null; error?: string }> => {
    return fetchCourseById(id);
};
