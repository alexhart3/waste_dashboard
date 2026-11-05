"use client";

import { createContext, type FormEvent, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import Header from "./Header";
import { type AdminSession, restoreSession, restoreDemoSession, signInDemo, DEMO_MODE_STORAGE_KEY, DEMO_SESSION_STORAGE_KEY, SESSION_STORAGE_KEY, signIn, SignInRequiredError, ServerOfflineError } from "@/lib/authApi";

type AuthContextValue = { token: string; demoMode: boolean; signOut: () => void };
const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
    const value = useContext(AuthContext);
    if (!value) throw new Error("Dashboard data requires a signed-in session.");
    return value;
}

export default function AuthGate({ children }: { children: ReactNode }) {
    const [demoMode, setDemoMode] = useState<boolean | null>(null);
    useEffect(() => {
        const readMode = () => {
            try { setDemoMode(localStorage.getItem(DEMO_MODE_STORAGE_KEY) === "true"); }
            catch { setDemoMode(false); }
        };
        readMode();
        const sync = (event: StorageEvent) => {
            if (event.key === DEMO_MODE_STORAGE_KEY || event.key === null) readMode();
        };
        window.addEventListener("storage", sync);
        return () => window.removeEventListener("storage", sync);
    }, []);

    function changeMode() {
        const next = !demoMode;
        try { localStorage.setItem(DEMO_MODE_STORAGE_KEY, String(next)); } catch { /* Remember for this visit only. */ }
        setDemoMode(next);
    }

    return <>
        {demoMode === null ? <><Header /><main className="auth-page"><p role="status">Opening dashboard…</p></main></>
            : <SessionGate key={demoMode ? "demo" : "live"} demoMode={demoMode}>{children}</SessionGate>}
        <div className="demo-mode-control">
            <button type="button" className="demo-mode-toggle" role="switch" aria-checked={demoMode === true}
                disabled={demoMode === null} onClick={changeMode}>
                <span>Offline demo mode</span><span className="demo-switch-track" aria-hidden="true"><span /></span>
            </button>
        </div>
    </>;
}

function SessionGate({ children, demoMode }: { children: ReactNode; demoMode: boolean }) {
    const storageKey = demoMode ? DEMO_SESSION_STORAGE_KEY : SESSION_STORAGE_KEY;
    const [session, setSession] = useState<AdminSession | null>(null);
    const [status, setStatus] = useState<"checking" | "anonymous" | "authenticated" | "unavailable">("checking");
    const [attempt, setAttempt] = useState(0);
    const [notice, setNotice] = useState("");
    const memoryToken = useRef<string | null>(null);

    const signOut = useCallback(() => {
        memoryToken.current = null;
        try { localStorage.removeItem(storageKey); } catch { /* This browser may block storage. */ }
        setSession(null);
        setNotice("");
        setStatus("anonymous");
    }, [storageKey]);

    useEffect(() => {
        const controller = new AbortController();
        async function restore() {
            let token = memoryToken.current;
            try { token = localStorage.getItem(storageKey) ?? token; } catch { /* Use this visit's session. */ }
            return token ? (demoMode ? restoreDemoSession(token) : restoreSession(token, controller.signal)) : null;
        }
        restore().then((saved) => {
            if (controller.signal.aborted) return;
            if (saved) {
                memoryToken.current = saved.token;
                try { localStorage.setItem(storageKey, saved.token); } catch { /* Storage may be blocked. */ }
            }
            setSession(saved);
            setStatus(saved ? "authenticated" : "anonymous");
        }).catch((error: unknown) => {
            if (controller.signal.aborted) return;
            if (error instanceof SignInRequiredError) {
                signOut();
                setNotice(error.message);
            } else {
                setSession(null);
                setStatus("unavailable");
            }
        });
        return () => controller.abort();
    }, [attempt, signOut, storageKey, demoMode]);

    useEffect(() => {
        const sync = (event: StorageEvent) => {
            if (event.key !== storageKey && event.key !== null) return;
            memoryToken.current = null;
            setSession(null);
            setStatus("checking");
            setAttempt((value) => value + 1);
        };
        window.addEventListener("storage", sync);
        return () => window.removeEventListener("storage", sync);
    }, [storageKey]);

    useEffect(() => {
        if (!session) return;
        const checkExpiry = () => {
            if (Date.now() >= session.expiresAt) {
                signOut();
                setNotice("Your session has ended. Please sign in again.");
            }
        };
        const timer = window.setInterval(checkExpiry, 60_000);
        window.addEventListener("focus", checkExpiry);
        return () => { window.clearInterval(timer); window.removeEventListener("focus", checkExpiry); };
    }, [session, signOut]);

    function acceptSession(next: AdminSession) {
        memoryToken.current = next.token;
        let storageNotice = "";
        try { localStorage.setItem(storageKey, next.token); }
        catch { storageNotice = "Your browser couldn’t save your sign-in. You’re signed in for this visit."; }
        setNotice(storageNotice);
        setSession(next);
        setStatus("authenticated");
    }

    if (status === "authenticated" && session) {
        return <AuthContext.Provider value={{ token: session.token, demoMode, signOut }}>
            <Header username={session.username} onSignOut={signOut} />
            {notice && <p className="auth-notice" role="status">{notice}</p>}
            {children}
        </AuthContext.Provider>;
    }

    return <>
        <Header />
        <main className="auth-page">
            {status === "checking" ? <p role="status" className="auth-checking">Checking your sign-in…</p>
                : status === "unavailable" ? <SignInForm demoMode={demoMode} notice="Server offline. Turn on Offline demo mode to try the dashboard." onSuccess={acceptSession} />
                    : <SignInForm demoMode={demoMode} notice={notice} onSuccess={acceptSession} />}
        </main>
    </>;
}

function SignInForm({ notice, onSuccess, demoMode }: { demoMode: boolean; notice: string; onSuccess: (session: AdminSession) => void }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");

    const request = useRef<AbortController | null>(null);
    useEffect(() => () => request.current?.abort(), []);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (pending) return;
        setError("");
        setPending(true);
        const controller = new AbortController();
        request.current = controller;
        try {
            const session = demoMode ? signInDemo(username.trim(), password) : await signIn(username.trim(), password, controller.signal);
            if (!controller.signal.aborted) onSuccess(session);
        }
        catch (error) {
            if (controller.signal.aborted) return;
            setError(error instanceof ServerOfflineError ? "Server offline. Turn on Offline demo mode to try the dashboard."
                : error instanceof TypeError ? "Couldn’t reach the dashboard. Check your connection and try again."
                : error instanceof Error ? error.message : "Couldn’t sign in. Please try again.");
        } finally { if (!controller.signal.aborted) setPending(false); }
    }

    return <section className="auth-panel" aria-labelledby="sign-in-title">
        <h2 id="sign-in-title">Sign in to your dashboard</h2>
        <p>{demoMode ? "Use admin / admin123 to explore the demo." : "Use the shared admin account to view campus collection data."}</p>
        {notice && <p className="auth-notice" role="status">{notice}</p>}
        <form onSubmit={submit} aria-busy={pending}>
            <div className="auth-field">
                <label htmlFor="admin-username">Username</label>
                <input id="admin-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={256} value={username} onChange={(event) => setUsername(event.target.value)} disabled={pending} />
            </div>
            <div className="auth-field">
                <label htmlFor="admin-password">Password</label>
                <div className="auth-password">
                    <input id="admin-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required maxLength={256} value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending} />
                    <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button>
                </div>
            </div>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
            <p className="auth-remember">You’ll stay signed in on this browser for 30 days, or until you sign out.</p>
        </form>
    </section>;
}
