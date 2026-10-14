"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { FocusEvent, MouseEvent, ReactNode } from "react";
import { createPortal } from "react-dom";

export function useChartTooltip() {
    const id = useId();
    const [tip, setTip] = useState<{ key: string; x: number; y: number } | null>(null);

    useEffect(() => {
        const hide = () => setTip(null);
        const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") hide(); };
        window.addEventListener("scroll", hide, true);
        window.addEventListener("resize", hide);
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("scroll", hide, true);
            window.removeEventListener("resize", hide);
            window.removeEventListener("keydown", onKey);
        };
    }, []);

    const bind = (key: string) => ({
        onMouseMove: (event: MouseEvent<Element>) => setTip({ key, x: event.clientX, y: event.clientY }),
        onMouseLeave: () => setTip(null),
        onFocus: (event: FocusEvent<Element>) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            setTip({ key, x: bounds.left + bounds.width / 2, y: bounds.top });
        },
        onBlur: () => setTip(null),
        "aria-describedby": tip?.key === key ? id : undefined,
    });

    return { tip, id, bind };
}

export default function ChartTooltip({ id, x, y, children }: { id: string; x: number; y: number; children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) return;
        const { width, height } = element.getBoundingClientRect();
        const left = Math.max(8, Math.min(x + 12, window.innerWidth - width - 8));
        const top = y - height - 12 >= 8 ? y - height - 12 : Math.min(y + 16, window.innerHeight - height - 8);
        element.style.left = `${left}px`;
        element.style.top = `${Math.max(8, top)}px`;
    }, [x, y, children]);

    return createPortal(<div ref={ref} id={id} role="tooltip" className="chart-tip chart-value-tip">{children}</div>, document.body);
}
