import { apiRequest } from "./client";

// ── Stats ──────────────────────────────────────────────────

export function getStats() {
    return apiRequest("/content/stats");
}

// ── Testimonials ───────────────────────────────────────────

export async function getTestimonials() {
    try {
        const json = await apiRequest("/testimonials");
        const raw = Array.isArray(json) ? json : (json.data ?? []);
        return raw.map((t: any) => ({
            id: t.id,
            name: t.userName || t.studentName || 'طالب',
            role: t.role || t.jobTitle || '',
            avatar: t.avatarUrl || 'https://i.pravatar.cc/150',
            text: t.text || t.content || '',
            rating: typeof t.rating === 'number' ? t.rating : 5,
            course: t.courseName || '',
        }));
    } catch {
        return [];
    }
}

export function postComment(data: { content: string }) {
    return apiRequest("/content/comments", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

// ── Blog ───────────────────────────────────────────────────

export function getBlogPosts(page = 1) {
    return apiRequest(`/blog?page=${page}`);
}

export function getBlogPost(id: number) {
    return apiRequest(`/blog/${id}`);
}

// ── Contact ────────────────────────────────────────────────

export function sendContactMessage(data: { name: string; email: string; type: string; subject: string; message: string }) {
    return apiRequest("/contact", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

// ── Plans ──────────────────────────────────────────────────

export function getPlans() {
    return apiRequest("/plans");
}
