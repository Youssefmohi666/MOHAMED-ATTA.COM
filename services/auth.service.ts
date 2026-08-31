import { login as loginApi, signup as signupApi, signupTeacher as signupTeacherApi } from "../api/auth.api";
import { setToken, clearToken } from "../utils/token";

export async function login(email: string, password: string) {
    const data = await loginApi(email, password);
    if (data.token) setToken(data.token);
    return data;
}

export async function signup(payload: { name: string; email: string; password: string; role: string; phoneNumber: string; nationalId: string }) {
    const data = await signupApi(payload);
    if (data.token) setToken(data.token);
    return data;
}

export async function signupTeacher(payload: any) {
    const data = await signupTeacherApi(payload);
    if (data.token) setToken(data.token);
    return data;
}

export function logout() {
    clearToken();
}
