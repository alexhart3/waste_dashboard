"use client";

import { ReactNode, useState } from "react";

export type BarSegment = {
    label: string;
    value: number;
    color: string;
};

export type BarRow = {
    label: ReactNode;
    segments: BarSegment[];
    extra?: ReactNode;
};

type HorizontalBarChartProps = {
    rows: BarRow[];
    labelHeader: string;
    valueHeader: string;
    extraHeader?: string;
};

export default function HorizontalBarChart({
    rows,
    labelHeader,
    valueHeader,
    extraHeader,
}: HorizontalBarChartProps) {
    const hasExtra = extraHeader !== undefined;
    const rowClass = hasExtra ? "brow" : "brow three";

    const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);

    const totals = rows.map((row) =>
        row.segments.reduce((sum, seg) => sum + seg.value, 0)
    );
    const max = Math.max(1, ...totals);

    return (
        <div className="blist">
            <div className={`${rowClass} bhead`}>
                <span>{labelHeader}</span>
                <span>{valueHeader}</span>
                <span></span>
                {hasExtra && <span style={{ textAlign: "right" }}>{extraHeader}</span>}
            </div>

            {rows.map((row, i) => (
                <div className={rowClass} key={i}>
                    <span className="bname">{row.label}</span>

                    <span className="track">
                        {row.segments.map((seg) => (
                            <span
                                key={seg.label}
                                className="fill"
                                onMouseMove={(e) =>
                                    setTip({ text: `${seg.label}: ${seg.value}`, x: e.clientX, y: e.clientY })
                                }
                                onMouseLeave={() => setTip(null)}
                                aria-label={`${seg.label}: ${seg.value}`}
                                style={{ width: `${(seg.value / max) * 100}%`, background: seg.color }}
                            />
                        ))}
                    </span>

                    <span className="bval">{totals[i]}</span>
                    {hasExtra && <span style={{ justifySelf: "end" }}>{row.extra}</span>}
                </div>
            ))}
            {tip && (
                <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>
                {tip.text}
                </div>
            )}
        </div>
    );
}