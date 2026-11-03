"use client";

import { createContext, type FormEvent, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import Header from "./Header";
import { type AdminSession, restoreSession, SESSION_STORAGE_KEY, signIn, SignInRequiredError } from "@/lib/authApi";

type AuthContextValue = { token: string; signOut: () => void };
const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
    const value = useContext(AuthContext);
    if (!value) throw new Error("Dashboard data requires a signed-in session.");
    return value;
}

export default function AuthGate({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<AdminSession | null>(null);
    const [status, setStatus] = useState<"checking" | "anonymous" | "authenticated" | "unavailable">("checking");
    const [attempt, setAttempt] = useState(0);
    const [notice, setNotice] = useState("");

    const signOut = useCallback(() => {
        try { localStorage.removeItem(SESSION_STORAGE_KEY); } catch { /* This browser may block storage. */ }
        setSession(null);
        setNotice("");
        setStatus("anonymous");
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        async function restore() {
            let token: string | null = null;
            try { token = localStorage.getItem(SESSION_STORAGE_KEY); } catch { return null; }
            return token ? restoreSession(token, controller.signal) : null;
        }
        restore().then((saved) => {
            if (controller.signal.aborted) return;
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
    }, [attempt, signOut]);

    useEffect(() => {
        const sync = (event: StorageEvent) => {
            if (event.key !== SESSION_STORAGE_KEY && event.key !== null) return;
            setSession(null);
            setStatus("checking");
            setAttempt((value) => value + 1);
        };
        window.addEventListener("storage", sync);
        return () => window.removeEventListener("storage", sync);
    }, []);

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
        let storageNotice = "";
        try { localStorage.setItem(SESSION_STORAGE_KEY, next.token); }
        catch { storageNotice = "Your browser couldn’t save your sign-in. You’re signed in for this visit."; }
        setNotice(storageNotice);
        setSession(next);
        setStatus("authenticated");
    }

    if (status === "authenticated" && session) {
        return <AuthContext.Provider value={{ token: session.token, signOut }}>
            <Header username={session.username} onSignOut={signOut} />
            {notice && <p className="auth-notice" role="status">{notice}</p>}
            {children}
        </AuthContext.Provider>;
    }

    return <>
        <Header />
        <main className="auth-page">
            {status === "checking" ? <p role="status" className="auth-checking">Checking your sign-in…</p>
                : status === "unavailable" ? <section className="auth-panel" aria-labelledby="auth-unavailable">
                    <h2 id="auth-unavailable">Couldn’t connect</h2>
                    <p>Your saved sign-in couldn’t be checked. Try again when the dashboard is available.</p>
                    <button className="auth-submit" onClick={() => { setStatus("checking"); setAttempt((value) => value + 1); }}>Try again</button>
                    <button className="auth-text-button" onClick={signOut}>Use a different sign-in</button>
                </section>
                    : <SignInForm notice={notice} onSuccess={acceptSession} />}
        </main>
    </>;
}

function SignInForm({ notice, onSuccess }: { notice: string; onSuccess: (session: AdminSession) => void }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (pending) return;
        setError("");
        setPending(true);
        try { onSuccess(await signIn(username.trim(), password)); }
        catch (error) {
            setError(error instanceof TypeError ? "Couldn’t reach the dashboard. Check your connection and try again."
                : error instanceof Error ? error.message : "Couldn’t sign in. Please try again.");
        } finally { setPending(false); }
    }

    return <section className="auth-panel" aria-labelledby="sign-in-title">
        <h2 id="sign-in-title">Sign in to your dashboard</h2>
        <p>Use the shared admin account to view campus collection data.</p>
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
