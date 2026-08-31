import { apiRequest } from "./client";

export interface BankQuestion {
    id: string;
    text: string;
    options: string[];
    correctAnswer: number;
    points: number;
    subjectId?: string;
    subjectName?: string;
    levelId?: string;
    levelName?: string;
    createdAt: string;
}

export function fetchBankQuestions(params: {
    subjectId?: string;
    search?: string;
    perPage?: number;
} = {}): Promise<BankQuestion[]> {
    const qs = new URLSearchParams();
    if (params.subjectId) qs.set("subjectId", params.subjectId);
    if (params.search) qs.set("search", params.search);
    if (params.perPage) qs.set("perPage", String(params.perPage));
    else qs.set("perPage", "200");
    const q = qs.toString();
    return apiRequest(`/question-bank${q ? `?${q}` : ""}`).then(j => (j.data ?? []) as BankQuestion[]);
}

export function createBankQuestion(data: {
    text: string;
    options: string[];
    correctAnswer: number;
    points?: number;
    subjectId?: string;
    levelId?: string;
}): Promise<BankQuestion> {
    return apiRequest("/question-bank", {
        method: "POST",
        body: JSON.stringify(data),
    }).then(j => j.data as BankQuestion);
}

export function updateBankQuestion(id: string, data: {
    text: string;
    options: string[];
    correctAnswer: number;
    points?: number;
    subjectId?: string;
    levelId?: string;
}): Promise<void> {
    return apiRequest(`/question-bank/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

export function deleteBankQuestion(id: string): Promise<void> {
    return apiRequest(`/question-bank/${id}`, {
        method: "DELETE",
    });
}

export function buildExamFromBank(data: {
    title: string;
    durationMinutes: number;
    subjectId?: string;
    questionIds: string[];
}) {
    return apiRequest("/question-bank/build-exam", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export function addBankQuestionsToExam(examId: string, questionIds: string[]) {
    return apiRequest("/question-bank/add-to-exam", {
        method: "POST",
        body: JSON.stringify({ examId, questionIds }),
    });
}