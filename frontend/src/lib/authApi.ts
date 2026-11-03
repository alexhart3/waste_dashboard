export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");
export const SESSION_STORAGE_KEY = "waste-dashboard-session";
export type AdminSession = { token: string; username: string; expiresAt: number };

export class SignInRequiredError extends Error {}

export async function signIn(username: string, password: string): Promise<AdminSession> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        cache: "no-store",
    });
    if (response.status === 401) throw new Error("Incorrect username or password. Please try again.");
    if (!response.ok) throw new Error("Couldn’t sign in. Please try again in a moment.");
    return response.json();
}

export async function restoreSession(token: string, signal: AbortSignal): Promise<AdminSession> {
    const response = await fetch(`${API_BASE_URL}/auth/session`, {
        headers: { Authorization: `Bearer ${token}` }, signal, cache: "no-store",
    });
    if (response.status === 401) throw new SignInRequiredError("Your session has ended. Please sign in again.");
    if (!response.ok) throw new Error("Couldn’t check your saved sign-in. Please try again.");
    return { ...await response.json(), token };
}
