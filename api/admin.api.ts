import { apiRequest } from "./client";
import { sanitizePlainText, sanitizeSearchQuery, validateGuid, validateNumericId, validateEmail, validatePhoneNumber } from "../utils/validation";

// ── Stats ──────────────────────────────────────────────────────
export const getAdminStats = () => apiRequest("/admin/stats");

// ── Students ───────────────────────────────────────────────────
export const getStudents = (page = 1, search?: string) => {
  const params = new URLSearchParams();
  params.append("page", String(Math.max(1, Math.floor(page) || 1)));
  params.append("perPage", "20");
  if (search) {
    const sanitizedSearch = sanitizeSearchQuery(search);
    if (sanitizedSearch) params.append("search", sanitizedSearch);
  }
  return apiRequest(`/admin/students?${params}`);
};
export const deleteStudent = (id: string) => {
  // Validate ID
  if (!validateGuid(id) && !validateNumericId(id)) {
    throw new Error('معرف الطالب غير صالح');
  }
  return apiRequest(`/admin/students/${encodeURIComponent(id)}`, { method: "DELETE" });
};
export const updateStudent = (id: string, data: { name?: string; email?: string; password?: string; phoneNumber?: string; bio?: string; isActive?: boolean }) => {
  // Validate ID
  if (!validateGuid(id) && !validateNumericId(id)) {
    throw new Error('معرف الطالب غير صالح');
  }
  // Sanitize and validate data
  const sanitizedData: Record<string, any> = {};
  if (data.name !== undefined) {
    sanitizedData.name = sanitizePlainText(data.name, 100);
  }
  if (data.email !== undefined) {
    if (!validateEmail(data.email)) {
      throw new Error('البريد الإلكتروني غير صالح');
    }
    sanitizedData.email = data.email.trim().toLowerCase();
  }
  if (data.password !== undefined) {
    if (data.password.length < 8) {
      throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
    }
    sanitizedData.password = data.password; // Keep password as-is for hashing on server
  }
  if (data.phoneNumber !== undefined) {
    if (!validatePhoneNumber(data.phoneNumber)) {
      throw new Error('رقم الهاتف غير صالح');
    }
    sanitizedData.phoneNumber = data.phoneNumber.replace(/\D/g, '');
  }
  if (data.bio !== undefined) {
    sanitizedData.bio = sanitizePlainText(data.bio, 2000);
  }
  if (data.isActive !== undefined) {
    sanitizedData.isActive = Boolean(data.isActive);
  }
  return apiRequest(`/admin/students/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(sanitizedData) });
};

// ── Teachers ───────────────────────────────────────────────────
export const getTeachers = (page = 1, search?: string) => {
  const params = new URLSearchParams();
  params.append("page", String(Math.max(1, Math.floor(page) || 1)));
  params.append("perPage", "20");
  if (search) {
    const sanitizedSearch = sanitizeSearchQuery(search);
    if (sanitizedSearch) params.append("search", sanitizedSearch);
  }
  return apiRequest(`/admin/teachers?${params}`);
};
export const deleteTeacher = (id: string) => {
  // Validate ID
  if (!validateGuid(id) && !validateNumericId(id)) {
    throw new Error('معرف المدرس غير صالح');
  }
  return apiRequest(`/admin/teachers/${encodeURIComponent(id)}`, { method: "DELETE" });
};
export const updateTeacher = (id: string, data: { name?: string; email?: string; password?: string; phoneNumber?: string; bio?: string; isActive?: boolean }) => {
  // Validate ID
  if (!validateGuid(id) && !validateNumericId(id)) {
    throw new Error('معرف المدرس غير صالح');
  }
  // Sanitize and validate data
  const sanitizedData: Record<string, any> = {};
  if (data.name !== undefined) {
    sanitizedData.name = sanitizePlainText(data.name, 100);
  }
  if (data.email !== undefined) {
    if (!validateEmail(data.email)) {
      throw new Error('البريد الإلكتروني غير صالح');
    }
    sanitizedData.email = data.email.trim().toLowerCase();
  }
  if (data.password !== undefined) {
    if (data.password.length < 8) {
      throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
    }
    sanitizedData.password = data.password;
  }
  if (data.phoneNumber !== undefined) {
    if (!validatePhoneNumber(data.phoneNumber)) {
      throw new Error('رقم الهاتف غير صالح');
    }
    sanitizedData.phoneNumber = data.phoneNumber.replace(/\D/g, '');
  }
  if (data.bio !== undefined) {
    sanitizedData.bio = sanitizePlainText(data.bio, 2000);
  }
  if (data.isActive !== undefined) {
    sanitizedData.isActive = Boolean(data.isActive);
  }
  return apiRequest(`/admin/teachers/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(sanitizedData) });
};

// ── Courses (Subjects) ─────────────────────────────────────────
export const getAdminCourses = (page = 1, search?: string) => {
  const params = new URLSearchParams();
  params.append("page", String(Math.max(1, Math.floor(page) || 1)));
  params.append("perPage", "20");
  if (search) {
    const sanitizedSearch = sanitizeSearchQuery(search);
    if (sanitizedSearch) params.append("search", sanitizedSearch);
  }
  return apiRequest(`/admin/courses?${params}`);
};
export const deleteCourse = (id: string) => {
  // Validate ID
  if (!validateGuid(id) && !validateNumericId(id)) {
    throw new Error('معرف المادة غير صالح');
  }
  return apiRequest(`/admin/courses/${encodeURIComponent(id)}`, { method: "DELETE" });
};
export const createAdminCourse = (data: { title: string; description?: string; category?: string; duration?: number; level?: string; language?: string; price?: number; imageUrl?: string; icon?: string; status?: string; teacherId: string }) => {
  // Validate teacherId
  if (!validateGuid(data.teacherId) && !validateNumericId(data.teacherId)) {
    throw new Error('معرف المدرس غير صالح');
  }
  // Sanitize data
  const sanitizedData = {
    ...data,
    title: sanitizePlainText(data.title, 200),
    description: data.description ? sanitizePlainText(data.description, 5000) : undefined,
    category: data.category ? sanitizePlainText(data.category, 100) : undefined,
    level: data.level ? sanitizePlainText(data.level, 50) : undefined,
    language: data.language ? sanitizePlainText(data.language, 50) : undefined,
    price: typeof data.price === 'number' && data.price >= 0 ? data.price : 0,
    imageUrl: data.imageUrl ? sanitizePlainText(data.imageUrl, 1000) : undefined,
    icon: data.icon ? sanitizePlainText(data.icon, 50) : undefined,
    status: ['draft', 'published', 'archived', 'pending'].includes(data.status || '') ? data.status : 'draft',
  };
  return apiRequest("/admin/courses", { method: "POST", body: JSON.stringify(sanitizedData) });
};
export const updateAdminCourse = (id: string, data: object) => {
  // Validate ID
  if (!validateGuid(id) && !validateNumericId(id)) {
    throw new Error('معرف المادة غير صالح');
  }
  return apiRequest(`/admin/courses/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) });
};
export const publishAdminCourse = (id: string, status: string) => {
  // Validate ID
  if (!validateGuid(id) && !validateNumericId(id)) {
    throw new Error('معرف المادة غير صالح');
  }
  // Validate status
  const allowedStatuses = ['draft', 'published', 'archived', 'pending'];
  if (!allowedStatuses.includes(status)) {
    throw new Error('الحالة غير صالحة');
  }
  return apiRequest(`/admin/courses/${encodeURIComponent(id)}/publish`, { method: "PATCH", body: JSON.stringify({ status }) });
};

// ── Enrollments ────────────────────────────────────────────────
export const getEnrollments = (page = 1, studentId?: string, subjectId?: string) => {
  const params = new URLSearchParams({ page: String(Math.max(1, Math.floor(page) || 1)), perPage: "20" });
  if (studentId && (validateGuid(studentId) || validateNumericId(studentId))) {
    params.set("studentId", encodeURIComponent(studentId));
  }
  if (subjectId && (validateGuid(subjectId) || validateNumericId(subjectId))) {
    params.set("subjectId", encodeURIComponent(subjectId));
  }
  return apiRequest(`/admin/enrollments?${params}`);
};
export const enrollStudent = (studentId: string, subjectId: string) => {
  // Validate IDs
  if (!validateGuid(studentId) && !validateNumericId(studentId)) {
    throw new Error('معرف الطالب غير صالح');
  }
  if (!validateGuid(subjectId) && !validateNumericId(subjectId)) {
    throw new Error('معرف المادة غير صالح');
  }
  return apiRequest("/admin/enrollments", { method: "POST", body: JSON.stringify({ studentId, subjectId }) });
};
export const deleteEnrollment = (id: number) => {
  // Validate ID
  if (!validateNumericId(id)) {
    throw new Error('معرف التسجيل غير صالح');
  }
  return apiRequest(`/admin/enrollments/${encodeURIComponent(String(id))}`, { method: "DELETE" });
};

// ── Orders ─────────────────────────────────────────────────────
export const getAdminOrders = (page = 1, search?: string) => {
  const params = new URLSearchParams();
  params.append("page", String(Math.max(1, Math.floor(page) || 1)));
  params.append("perPage", "20");
  if (search) {
    const sanitizedSearch = sanitizeSearchQuery(search);
    if (sanitizedSearch) params.append("search", sanitizedSearch);
  }
  return apiRequest(`/admin/orders?${params}`);
};
export const deleteOrder = (id: string) => {
  // Validate ID
  if (!validateGuid(id) && !validateNumericId(id)) {
    throw new Error('معرف الطلب غير صالح');
  }
  return apiRequest(`/admin/orders/${encodeURIComponent(id)}`, { method: "DELETE" });
};

// ── Users (create any role) ────────────────────────────────────
export const createUser = (data: { name: string; email: string; password: string; role: string; phoneNumber?: string; bio?: string }) => {
  // Validate email
  if (!validateEmail(data.email)) {
    throw new Error('البريد الإلكتروني غير صالح');
  }
  // Validate password
  if (data.password.length < 8) {
    throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  }
  // Validate role
  const allowedRoles = ['student', 'teacher', 'admin'];
  if (!allowedRoles.includes(data.role)) {
    throw new Error('الدور غير صالح');
  }
  // Sanitize data
  const sanitizedData = {
    name: sanitizePlainText(data.name, 100),
    email: data.email.trim().toLowerCase(),
    password: data.password,
    role: data.role,
    phoneNumber: data.phoneNumber ? data.phoneNumber.replace(/\D/g, '') : undefined,
    bio: data.bio ? sanitizePlainText(data.bio, 2000) : undefined,
  };
  return apiRequest("/admin/users", { method: "POST", body: JSON.stringify(sanitizedData) });
};
export const toggleUserActive = (id: string) => {
  // Validate ID
  if (!validateGuid(id) && !validateNumericId(id)) {
    throw new Error('معرف المستخدم غير صالح');
  }
  return apiRequest(`/admin/users/${encodeURIComponent(id)}/toggle-active`, { method: "PATCH" });
};

// ── Dropdown lists ─────────────────────────────────────────────
export const getSubjectsList = () => apiRequest("/admin/subjects-list");
export const getStudentsList = () => apiRequest("/admin/students-list");
export const getTeachersList = () => apiRequest("/admin/teachers-list");
