import { apiRequest } from "./client";
import { sanitizePlainText, validateGuid } from "../utils/validation";

export const fetchAnalyticsOverview = async (): Promise<any> => {
    const json = await apiRequest("/analytics/overview");
    return json?.data ?? json ?? null;
};

export const fetchStudentAnalytics = async (studentId: string): Promise<any> => {
    const json = await apiRequest(`/analytics/students/${studentId}`);
    return json?.data ?? json ?? null;
};

export const createAssessment = async (data: {
    title: string;
    type: string;
    maxGrade?: number;
    classRoomId?: string;
    subjectId: string;
    date?: string;
}): Promise<any> => {
    const json = await apiRequest("/analytics/assessments", {
        method: "POST",
        body: JSON.stringify({
            title: sanitizePlainText(data.title, 300),
            type: sanitizePlainText(data.type || "Quiz", 100),
            maxGrade: data.maxGrade ?? 100,
            subjectId: data.subjectId,
            classRoomId: data.classRoomId || undefined,
            date: data.date || undefined,
        }),
    });
    return json?.data ?? json ?? null;
};

export const recordAssessmentGrade = async (assessmentId: string, data: {
    studentId: string;
    grade: number;
}): Promise<any> => {
    const json = await apiRequest(`/analytics/assessments/${assessmentId}/grades`, {
        method: "POST",
        body: JSON.stringify(data),
    });
    return json?.data ?? json ?? null;
};

export const recordAttendance = async (data: {
    studentId: string;
    subjectId?: string;
    classRoomId?: string;
    status: "Present" | "Absent" | "Late";
    date?: string;
    notes?: string;
}): Promise<any> => {
    const json = await apiRequest("/analytics/attendance", {
        method: "POST",
        body: JSON.stringify({
            studentId: data.studentId,
            subjectId: data.subjectId || undefined,
            classRoomId: data.classRoomId || undefined,
            status: data.status,
            date: data.date || undefined,
            notes: data.notes || undefined,
        }),
    });
    return json?.data ?? json ?? null;
};

export const fetchClassrooms = async (subjectId?: string): Promise<any[]> => {
    const qs = subjectId ? `?subjectId=${subjectId}` : "";
    const json = await apiRequest(`/analytics/classrooms${qs}`);
    return json?.data ?? json ?? [];
};

export const createClassroom = async (data: {
    name: string;
    subjectId: string;
}): Promise<any> => {
    const json = await apiRequest("/analytics/classrooms", {
        method: "POST",
        body: JSON.stringify({ name: sanitizePlainText(data.name, 200), subjectId: data.subjectId }),
    });
    return json?.data ?? json ?? null;
};
