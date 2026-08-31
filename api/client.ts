import { API_BASE } from "../config/api.config";
import { getToken, setToken, setRefreshToken, getRefreshToken, clearAllTokens } from "../utils/token";
import { sanitizeErrorMessage } from "../utils/sanitize";

function extractErrorMessage(body: any, status: number): string {
    const rawMessage =
        body?.error?.message ||
        body?.message ||
        body?.title ||
        `Request failed (${status})`;
    // Sanitize error message to prevent XSS via malicious API responses
    return sanitizeErrorMessage(rawMessage);
}

// Prevent multiple simultaneous refresh calls
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        const refreshToken = getRefreshToken();
        if (!refreshToken) return false;

        try {
            const res = await fetch(`${API_BASE}/auth/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken }),
            });

            if (!res.ok) return false;

            const data = await res.json();
            if (data.token) setToken(data.token);
            if (data.refreshToken) setRefreshToken(data.refreshToken);
            return true;
        } catch {
            return false;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

/**
 * Low-level authenticated fetch with token refresh support.
 * Returns the raw Response for flexibility (streaming, custom parsing, etc.).
 */
export async function authedFetch(url: string, options: RequestInit = {}, _retry = false): Promise<Response> {
    const token = getToken();
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

    const headers: Record<string, string> = {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...((options.headers as Record<string, string>) || {}),
    };

    // Don't set Content-Type for FormData - browser will set it with boundary
    if (!isFormData && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    // Silent refresh on 401 — try once
    if (response.status === 401 && !_retry) {
        const refreshed = await tryRefresh();
        if (refreshed) {
            return authedFetch(url, options, true);
        }
        // Refresh failed — full logout
        clearAllTokens();
        window.dispatchEvent(new CustomEvent("auth:expired"));
        const err = new Error("انتهت صلاحية الجلسة");
        (err as any).status = 401;
        throw err;
    }

    if (response.status === 401 && _retry) {
        clearAllTokens();
        window.dispatchEvent(new CustomEvent("auth:expired"));
        const err = new Error("انتهت صلاحية الجلسة");
        (err as any).status = 401;
        throw err;
    }

    return response;
}

/**
 * High-level JSON API request with automatic token refresh and error handling.
 * Returns parsed JSON data.
 */
export async function apiRequest(endpoint: string, options: RequestInit = {}, _retry = false): Promise<any> {
    try {
        const response = await authedFetch(`${API_BASE}${endpoint}`, options, _retry);

        if (!response.ok) {
            const errorBody = await response.json().catch(() => null);
            const err = new Error(extractErrorMessage(errorBody, response.status));
            (err as any).status = response.status;
            throw err;
        }

        return response.json();
    } catch (error: any) {
        if (error instanceof TypeError && (error.message === 'Failed to fetch' || error.message?.includes('Failed to fetch'))) {
            const err = new Error('تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.');
            (err as any).status = 0;
            throw err;
        }
        throw error;
    }
}
