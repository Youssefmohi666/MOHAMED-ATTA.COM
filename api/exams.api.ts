import { apiRequest, authedFetch } from "./client";
import { API_BASE } from "../config/api.config";

export interface ExamQuestion {
    id: number;
    text: string;
    imageUrl?: string;
    options: string[];
    correctAnswer: number;
    points: number;
}

export interface ExamListItem {
    id: string;
    title: string;
    durationMinutes: number;
    questionCount: number;
    status: string;
    createdAt: string;
}

export interface ExamDetail {
    id: string;
    title: string;
    durationMinutes: number;
    questionCount: number;
    totalPoints: number;
    status: string;
    createdAt: string;
    subjectId?: string;
    questions: { id: number; text: string; imageUrl?: string; options: string[]; points: number }[];
}

export interface ExamResult {
    attemptId: string;
    examId: string;
    examTitle: string;
    score: number;
    totalPoints: number;
    percentage: number;
    status: string;
    violations: number;
    timeSpentSeconds: number;
    startedAt: string;
    submittedAt: string;
    passed: boolean;
    questionResults: {
        questionId: number;
        text: string;
        imageUrl?: string;
        yourAnswer: number;
        correctAnswer: number;
        isCorrect: boolean;
        points: number;
        earnedPoints: number;
    }[];
}

export function generateExam(data: {
    topic: string;
    questionCount: number;
    durationMinutes: number;
    subjectId?: string;
    language?: string;
}): Promise<ExamDetail> {
    return apiRequest("/exams/generate", {
        method: "POST",
        body: JSON.stringify(data),
    }).then(j => j.data as ExamDetail);
}

export function createExam(data: {
    title: string;
    durationMinutes: number;
    questions: ExamQuestion[];
    subjectId?: string;
}): Promise<ExamDetail> {
    return apiRequest("/exams", {
        method: "POST",
        body: JSON.stringify(data),
    }).then(j => j.data as ExamDetail);
}

export function fetchTeacherExams(): Promise<ExamListItem[]> {
    return apiRequest("/exams").then(j => (j.data ?? []) as ExamListItem[]);
}

export function fetchExamDetail(id: string): Promise<ExamDetail> {
    return apiRequest(`/exams/${id}`).then(j => j.data as ExamDetail);
}

export function deleteExam(id: string): Promise<void> {
    return apiRequest(`/exams/${id}`, { method: "DELETE" });
}

export function submitExam(examId: string, data: {
    answers: number[];
    violations: number;
    timeSpentSeconds: number;
}): Promise<ExamResult> {
    return apiRequest(`/exams/${examId}/submit`, {
        method: "POST",
        body: JSON.stringify(data),
    }).then(j => j.data as ExamResult);
}

export function fetchAvailableExams(): Promise<ExamListItem[]> {
    return apiRequest("/exams/available").then(j => (j.data ?? []) as ExamListItem[]);
}

// ── PDF / print copy (teacher) ──────────────────────────────
// Returns the print-ready exam HTML and opens the browser's print dialog.
export async function printExamPdf(examId: string): Promise<void> {
    const response = await authedFetch(`${API_BASE}/exams/${examId}/pdf`);
    if (!response.ok) throw new Error("تعذر تحميل نسخة الامتحان");
    const html = await response.text();
    const w = window.open("", "_blank");
    if (!w) throw new Error("يرجى السماح بالنوافذ المنبثقة");
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch { /* ignore */ } }, 600);
}

// ── In-person (حضوري) grade recording ───────────────────────
export interface TeacherStudent {
    Id: string;
    Name: string;
    Email?: string;
}

export function fetchTeacherStudents(search = ""): Promise<TeacherStudent[]> {
    const q = search ? `?search=${encodeURIComponent(search)}&per_page=50` : "?per_page=50";
    return apiRequest(`/teacher/students${q}`).then(j => (j.data ?? []) as TeacherStudent[]);
}

export function recordExamGrade(examId: string, data: { studentId: string; score: number }) {
    return apiRequest(`/exams/${examId}/grade`, {
        method: "POST",
        body: JSON.stringify(data),
    });
}
