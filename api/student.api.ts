import { apiRequest } from "./client";

export function getEnrollments() {
    return apiRequest("/student/enrollments");
}

export function getProgress() {
    return apiRequest("/student/progress");
}

export function updateProgress(data: { lectureId: string; completed: boolean; progressPct?: number }) {
    return apiRequest("/student/progress", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export interface VideoView {
    lectureId: string;
    lectureTitle: string;
    subjectName: string;
    progressPct: number;
    duration: string;
    completed: boolean;
    lastWatchedAt: string;
}

export function getVideoViews() {
    return apiRequest("/student/video-views").then(j => (j?.data ?? []) as VideoView[]);
}

export interface StudentProfile {
    id: string;
    name: string;
    email: string;
    phoneNumber?: string | null;
    guardianPhone?: string | null;
    motherPhone?: string | null;
    primaryEmail?: string | null;
    nationalId?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    role: string;
}

export function getProfile() {
    return apiRequest("/student/profile");
}

export function updateProfile(data: {
    name?: string;
    phoneNumber?: string;
    guardianPhone?: string;
    motherPhone?: string;
    primaryEmail?: string;
    bio?: string;
}) {
    return apiRequest("/student/profile", {
        method: "PUT",
        body: JSON.stringify(data),
    });
}
