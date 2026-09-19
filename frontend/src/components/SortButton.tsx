"use client";

import { useEffect, useRef, useState } from "react";

export type SortOption = {
    key: string;
    label: string;
    short: string;
};

type SortButtonProps = {
    options: SortOption[];
    value: string;
    onChange: (key: string) => void;
};

export default function SortButton({ options, value, onChange }: SortButtonProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const current = options.find((o) => o.key === value);

    useEffect(() => {
        if (!open) return;

        function handleClick(e: MouseEvent) {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        function handleKey(e: KeyboardEvent) {
        if (e.key === "Escape") setOpen(false);
        }

        document.addEventListener("click", handleClick);
        document.addEventListener("keydown", handleKey);
        return () => {
        document.removeEventListener("click", handleClick);
        document.removeEventListener("keydown", handleKey);
        };
    }, [open]);

    return (
        <div className="sort" ref={ref}>
            <button
            type="button"
            className="sort-btn"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 4v16M4 17l3 3 3-3M17 20V4M14 7l3-3 3 3" />
                </svg>
                Sort: {current?.short}
            </button>

            {open && (
                <div className="sort-menu" role="menu">
                {options.map((o) => (
                    <button
                    key={o.key}
                    type="button"
                    role="menuitemradio"
                    aria-checked={o.key === value}
                    onClick={() => {
                        onChange(o.key);
                        setOpen(false);
                    }}
                    >
                        {o.label}
                        <span className="check">{o.key === value ? "✓" : ""}</span>
                    </button>
                ))}
                </div>
            )}
        </div>
    );
}