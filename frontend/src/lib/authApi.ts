export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");
export const SESSION_STORAGE_KEY = "waste-dashboard-session";
export type AdminSession = { token: string; username: string; expiresAt: number; offline?: boolean };
const OFFLINE_PREFIX = "offline-admin:";
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
    let response: Response;
    try {
        response = await fetchBackend("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
            cache: "no-store",
            signal,
        });
    } catch (error) {
        if (!(error instanceof ServerOfflineError)) throw error;
        if (username !== "admin" || password !== "admin123") {
            throw new Error("Server offline. Use the offline admin username and password.");
        }
        const expiresAt = Date.now() + SESSION_MS;
        return { token: `${OFFLINE_PREFIX}${expiresAt}`, username: "admin", expiresAt, offline: true };
    }
    if (response.status === 401) throw new SignInRequiredError("Incorrect username or password. Please try again.");
    if (!response.ok) throw new Error("Couldn’t sign in. Please try again in a moment.");
    return response.json();
}

export async function restoreSession(token: string, signal: AbortSignal): Promise<AdminSession> {
    // A local offline marker is never a backend authorization token.
    if (token.startsWith(OFFLINE_PREFIX)) throw new SignInRequiredError("Please sign in to load server data.");
    const response = await fetchBackend("/auth/session", {
        headers: { Authorization: `Bearer ${token}` }, signal, cache: "no-store",
    });
    if (response.status === 401) throw new SignInRequiredError("Your session has ended. Please sign in again.");
    if (!response.ok) throw new Error("Couldn’t check your saved sign-in. Please try again.");
    return { ...await response.json(), token };
}

export async function restoreDashboardSession(token: string, signal: AbortSignal): Promise<AdminSession> {
    if (!token.startsWith(OFFLINE_PREFIX)) return restoreSession(token, signal);
    const expiresAt = Number(token.slice(OFFLINE_PREFIX.length));
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() || expiresAt > Date.now() + SESSION_MS) {
        throw new SignInRequiredError("Your session has ended. Please sign in again.");
    }
    const session = await signIn("admin", "admin123", signal);
    // Retrying while offline must not extend the original local session.
    return session.offline ? { ...session, token, expiresAt } : session;
}
