const TOKEN_KEY = "mohamedatta_auth_token";
const REFRESH_KEY = "mohamedatta_refresh_token";

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
}

export function setRefreshToken(token: string): void {
    localStorage.setItem(REFRESH_KEY, token);
}

export function clearRefreshToken(): void {
    localStorage.removeItem(REFRESH_KEY);
}

export function clearAllTokens(): void {
    clearToken();
    clearRefreshToken();
}

/**
 * Returns true when a JWT token has an `exp` claim that is already in the past.
 * Non-JWT/opaque tokens return false (assumed still valid) so the server makes the call.
 */
export function isTokenExpired(token: string | null | undefined): boolean {
    if (!token) return true;
    try {
        const payloadPart = token.split('.')[1];
        if (!payloadPart) return false;
        const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(normalized));
        if (typeof payload?.exp !== 'number') return false;
        return payload.exp * 1000 <= Date.now();
    } catch {
        return false;
    }
}
