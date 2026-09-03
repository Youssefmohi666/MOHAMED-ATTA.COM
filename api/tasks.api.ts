import { apiRequest } from './client';

export interface AppTask {
    id: string;
    title: string;
    description?: string | null;
    priority: string;
    status: string;
    assignedToId?: string | null;
    assignedToName?: string | null;
    assignedToEmail?: string | null;
    dueDate?: string | null;
    completedAt?: string | null;
    createdAt: string;
}

export interface TaskAssignee {
    id: string;
    name: string;
    email: string;
    role: string;
}

const validateGuid = (id: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);

export const getTasks = (status?: string, assigneeId?: string, page = 1) => {
    const params = new URLSearchParams();
    params.append('page', String(Math.max(1, Math.floor(page) || 1)));
    params.append('perPage', '50');
    if (status) params.append('status', status);
    if (assigneeId) params.append('assigneeId', assigneeId);
    return apiRequest(`/admin/tasks?${params}`);
};

export const getTaskAssignees = () => apiRequest('/admin/tasks/assignees');

export const createTask = (data: { title: string; description?: string | null; priority?: string; status?: string; assignedToId?: string | null; dueDate?: string | null }) => {
    return apiRequest('/admin/tasks', { method: 'POST', body: JSON.stringify(data) });
};

export const updateTask = (id: string, data: Partial<{ title: string; description: string | null; priority: string; status: string; assignedToId: string | null; dueDate: string | null }>) => {
    if (!validateGuid(id)) throw new Error('معرف المهمة غير صالح');
    return apiRequest(`/admin/tasks/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
};

export const deleteTask = (id: string) => {
    if (!validateGuid(id)) throw new Error('معرف المهمة غير صالح');
    return apiRequest(`/admin/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
};
