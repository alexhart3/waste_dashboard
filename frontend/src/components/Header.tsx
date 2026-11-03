"use client";

export default function Header({ username, onSignOut }: { username?: string; onSignOut?: () => void }) {
    return (
        <header className="top">
            <div className="brand">
                <div>
                    <h1>Waste Collection Dashboard</h1>
                </div>
            </div>
            {username && <div className="account-menu">
                <span>Signed in as <strong>{username}</strong></span>
                <button type="button" className="account-signout" onClick={() => onSignOut?.()}>Sign out</button>
            </div>}
        </header>
    )
}
