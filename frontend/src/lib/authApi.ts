export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");
export const SESSION_STORAGE_KEY = "waste-dashboard-session";
export type AdminSession = { token: string; username: string; expiresAt: number; demo?: boolean };
export const DEMO_MODE_STORAGE_KEY = "waste-dashboard-demo-mode";
export const DEMO_SESSION_STORAGE_KEY = "waste-dashboard-demo-session";
const DEMO_PREFIX = "demo-admin:";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export class SignInRequiredError extends Error {}
export class ServerOfflineError extends Error {}

// Bound connection attempts so an unresponsive backend doesn't trap the login screen.
export async function fetchBackend(path: string, options: RequestInit = {}): Promise<Response> {
    const timeout = AbortSignal.timeout(8_000);
    const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
    try {
        const response = await fetch(`${API_BASE_URL}${path}`, { ...options, signal });
        if (response.status >= 500) throw new ServerOfflineError("Server offline");
        return response;
    } catch (error) {
        if (options.signal?.aborted) throw error;
        if (error instanceof TypeError || timeout.aborted) throw new ServerOfflineError("Server offline");
        throw error;
    }
}

export async function signIn(username: string, password: string, signal?: AbortSignal): Promise<AdminSession> {
    const response = await fetchBackend("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        cache: "no-store",
        signal,
    });
    if (response.status === 401) throw new SignInRequiredError("Incorrect username or password. Please try again.");
    if (!response.ok) throw new Error("Couldn’t sign in. Please try again in a moment.");
    return response.json();
}

export async function restoreSession(token: string, signal: AbortSignal): Promise<AdminSession> {
    // Demo and legacy offline markers are never backend authorization tokens.
    if (token.startsWith(DEMO_PREFIX) || token.startsWith("offline-admin:")) throw new SignInRequiredError("Please sign in to load server data.");
    const response = await fetchBackend("/auth/session", {
        headers: { Authorization: `Bearer ${token}` }, signal, cache: "no-store",
    });
    if (response.status === 401) throw new SignInRequiredError("Your session has ended. Please sign in again.");
    if (!response.ok) throw new Error("Couldn’t check your saved sign-in. Please try again.");
    return { ...await response.json(), token };
}

export function signInDemo(username: string, password: string): AdminSession {
    if (username !== "admin" || password !== "admin123") {
        throw new SignInRequiredError("Incorrect username or password. Please try again.");
    }
    const expiresAt = Date.now() + SESSION_MS;
    return { token: `${DEMO_PREFIX}${expiresAt}`, username: "admin", expiresAt, demo: true };
}

export function restoreDemoSession(token: string): AdminSession {
    const expiresAt = Number(token.slice(DEMO_PREFIX.length));
    if (!token.startsWith(DEMO_PREFIX) || !Number.isFinite(expiresAt) || expiresAt <= Date.now() || expiresAt > Date.now() + SESSION_MS) {
        throw new SignInRequiredError("Your demo session has ended. Please sign in again.");
    }
    return { token, username: "admin", expiresAt, demo: true };
}
