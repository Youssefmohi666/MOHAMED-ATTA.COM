import { apiRequest } from "./client";

export function login(email: string, password: string) {
    return apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
}

export function signup(data: {
    name: string;
    email: string;
    password: string;
    role: string;
    phoneNumber: string;
    nationalId: string;
    fatherName?: string;
    motherName?: string;
    fatherPhoneNumber?: string;
    motherPhoneNumber?: string;
}) {
    return apiRequest("/auth/signup", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export function signupTeacher(data: {
    name: string;
    email: string;
    password: string;
    nationalId: string;
    phoneNumber: string;
    yearsOfExperience: number;
    specialization: string;
    bio: string;
    cvUrl: string;
}) {
    return apiRequest("/auth/signup/teacher", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export function checkEmail(email: string) {
    return apiRequest(`/auth/check-email?email=${encodeURIComponent(email)}`);
}

export function refreshToken(token: string) {
    return apiRequest("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken: token }),
    });
}

export function logoutApi(token: string) {
    return apiRequest("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken: token }),
    });
}

export function validateSession(courseId: string) {
    return apiRequest(`/auth/session/validate?courseId=${encodeURIComponent(courseId)}`);
}

export function sendVerificationCode(email: string) {
    return apiRequest("/auth/send-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
    });
}

export function verifyEmail(email: string, code: string) {
    return apiRequest("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ email, code }),
    });
}

export function forgotPassword(email: string) {
    return apiRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
    });
}

export function resetPassword(email: string, code: string, newPassword: string) {
    return apiRequest("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, code, newPassword }),
    });
}
