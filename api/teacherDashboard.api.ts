import { apiRequest } from "./client";

// ── Types ──────────────────────────────────────────────────────
export interface PassFail {
    passCount: number;
    failCount: number;
    passRate: number;
}

export interface StudentGradeSummary {
    studentId: string;
    studentName: string;
    averageGrade: number;
    passed: boolean;
}

export interface ClassGradeSummary {
    classRoomId: string;
    className: string;
    averageGrade: number;
    studentsCount: number;
}

export interface DashboardAlert {
    type: "attendance" | "lecture";
    severity: "info" | "warning" | "danger";
    title: string;
    message: string;
    studentId?: string;
    studentName?: string;
}

export interface TeacherDashboardOverview {
    empty: boolean;
    totalStudents: number;
    totalAssessments: number;
    totalSubjects: number;
    totalClassrooms: number;
    overallAverageGrade: number;
    avgProgress: number;
    passFail: PassFail;
    gradeByStudent: StudentGradeSummary[];
    gradeByClass: ClassGradeSummary[];
    alerts: DashboardAlert[];
}

// ── API ────────────────────────────────────────────────────────
export const fetchTeacherDashboardOverview = (): Promise<TeacherDashboardOverview> => {
    return apiRequest("/teacher/dashboard/overview").then((r: any) => r?.data ?? r);
};
