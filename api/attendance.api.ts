import { apiRequest } from "./client";
import { validateGuid } from "../utils/validation";

// ── Types ──────────────────────────────────────────────────────
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceStudent {
    studentId: string;
    studentName: string;
    studentEmail?: string;
    status: AttendanceStatus | 'unmarked';
}

export interface AttendanceRecord {
    id: string;
    studentId: string;
    studentName?: string;
    subjectId: string;
    date: string;
    status: AttendanceStatus;
    notes?: string;
}

export interface AttendanceStatsRow {
    studentId: string;
    studentName: string;
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
    attendanceRate: number;
}

// ── Attendance API ─────────────────────────────────────────────
export const getAttendanceSheet = (subjectId: string, date: string) => {
    if (!validateGuid(subjectId)) throw new Error('معرف المادة غير صالح');
    return apiRequest(`/admin/attendance?subjectId=${encodeURIComponent(subjectId)}&date=${encodeURIComponent(date)}`);
};

export const getAttendanceRecords = (subjectId: string, date: string) => {
    if (!validateGuid(subjectId)) throw new Error('معرف المادة غير صالح');
    return apiRequest(`/admin/attendance/records?subjectId=${encodeURIComponent(subjectId)}&date=${encodeURIComponent(date)}`);
};

export const saveAttendance = (items: { studentId: string; subjectId: string; date: string; status: AttendanceStatus }[]) => {
    return apiRequest('/admin/attendance/bulk', {
        method: 'POST',
        body: JSON.stringify(items),
    });
};

export const getAttendanceStats = (subjectId: string) => {
    if (!validateGuid(subjectId)) throw new Error('معرف المادة غير صالح');
    return apiRequest(`/admin/attendance/stats?subjectId=${encodeURIComponent(subjectId)}`);
};

// ── Teacher attendance API (scoped to the teacher's own subjects) ──
export const getTeacherAttendanceSheet = (subjectId: string, date: string) => {
    if (!validateGuid(subjectId)) throw new Error('معرف المادة غير صالح');
    return apiRequest(`/teacher/attendance?subjectId=${encodeURIComponent(subjectId)}&date=${encodeURIComponent(date)}`);
};

export const saveTeacherAttendance = (items: { studentId: string; subjectId: string; date: string; status: AttendanceStatus }[]) => {
    return apiRequest('/teacher/attendance/bulk', {
        method: 'POST',
        body: JSON.stringify(items),
    });
};

export const getTeacherAttendanceStats = (subjectId: string) => {
    if (!validateGuid(subjectId)) throw new Error('معرف المادة غير صالح');
    return apiRequest(`/teacher/attendance/stats?subjectId=${encodeURIComponent(subjectId)}`);
};

// ── Employees API ──────────────────────────────────────────────
export interface Employee {
    id: string;
    name: string;
    position: string;
    department?: string;
    email?: string;
    phoneNumber?: string;
    salary: number;
    salaryPaid?: number;
    lastPaidDate?: string;
    hireDate: string;
    status: string;
    notes?: string;
    createdAt: string;
}

export interface EmployeeStats {
    totalEmployees: number;
    activeEmployees: number;
    onLeaveEmployees: number;
    totalMonthlySalary: number;
    byPosition: { position: string; count: number; totalSalary: number }[];
}

export const getEmployees = (page = 1, search?: string, status?: string) => {
    const params = new URLSearchParams();
    params.append("page", String(Math.max(1, Math.floor(page) || 1)));
    params.append("perPage", "20");
    if (search) params.append("search", search.trim());
    if (status) params.append("status", status);
    return apiRequest(`/admin/employees?${params}`);
};

export const getEmployeeStats = () => apiRequest('/admin/employees/stats');

export const createEmployee = (data: Omit<Employee, 'id' | 'createdAt'>) => {
    return apiRequest('/admin/employees', { method: 'POST', body: JSON.stringify(data) });
};

export const updateEmployee = (id: string, data: Partial<Employee>) => {
    if (!validateGuid(id)) throw new Error('معرف الموظف غير صالح');
    return apiRequest(`/admin/employees/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
};

export const deleteEmployee = (id: string) => {
    if (!validateGuid(id)) throw new Error('معرف الموظف غير صالح');
    return apiRequest(`/admin/employees/${encodeURIComponent(id)}`, { method: 'DELETE' });
};

export const markEmployeePaid = (id: string, data: { amount: number; paidDate?: string }) => {
    if (!validateGuid(id)) throw new Error('معرف الموظف غير صالح');
    return apiRequest(`/admin/employees/${encodeURIComponent(id)}/mark-paid`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};
