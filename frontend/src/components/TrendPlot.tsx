"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ChartPoint } from "@/lib/chartData";
import ChartTooltip, { useChartTooltip } from "./ChartTooltip";

export type ChartSeries = { label: string; color: string; dashed?: boolean };
type Props = { title: string; points: ChartPoint[]; series: ChartSeries[]; unit?: "count" | "percent" | "currency"; bars?: boolean };

export function formatChartValue(value: number | null, unit: Props["unit"] = "count") {
    if (value === null) return "No readings";
    if (unit === "currency") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
    return `${Number.isInteger(value) ? value : value.toFixed(1)}${unit === "percent" ? "%" : ""}`;
}

export default function TrendPlot({ title, points, series, unit = "count", bars = false }: Props) {
    const id = useId();
    const { tip, id: tooltipId, bind } = useChartTooltip();
    const container = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(640);
    useEffect(() => {
        if (!container.current) return;
        const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
        observer.observe(container.current);
        return () => observer.disconnect();
    }, []);
    const height = bars ? 150 : 180, left = 48, right = 18, top = 12, bottom = 30;
    const plotWidth = width - left - right, plotHeight = height - top - bottom;
    // Reserve space for the actual label text, including year-bearing month labels.
    const labelWidth = Math.max(0, ...points.map((point) => point.label.length * 6.5)) + 16;
    const tickStride = Math.max(1, Math.ceil(labelWidth / (plotWidth / Math.max(1, points.length))));
    const maxValue = Math.max(0, ...points.flatMap((p) => p.values.filter((v): v is number => v !== null)));
    const max = unit === "percent" ? Math.max(100, Math.ceil(maxValue / 20) * 20) : Math.max(4, Math.ceil(maxValue / 4) * 4);
    const x = (index: number) => left + (index + .5) * plotWidth / points.length;
    const y = (value: number) => top + plotHeight * (1 - value / max);
    const selected = tip ? points.find((point) => point.detail === tip.key) : undefined;
    function linePath(seriesIndex: number) {
        let path = "";
        points.forEach((point, i) => {
            const value = point.values[seriesIndex];
            if (value === null) return;
            const previous = points[i - 1]?.values[seriesIndex];
            if (previous === null || previous === undefined) path += ` M ${x(i)} ${y(value)}`;
            else {
                const middle = (x(i - 1) + x(i)) / 2;
                path += ` C ${middle} ${y(previous)}, ${middle} ${y(value)}, ${x(i)} ${y(value)}`;
            }
        });
        return path;
    }
    return (
        <div className="trend-plot" ref={container}>
            <div className="legend">
                {series.map((s) => <span key={s.label}><i className={`series-key${s.dashed ? " dashed" : ""}`} style={{ borderColor: s.color }} />{s.label}</span>)}
            </div>
            <div className="plot-scroll">
                <svg viewBox={`0 0 ${width} ${height}`} className="trend-svg" role="group" aria-labelledby={id}>
                    <title id={id}>{`${title}. Hover or focus a date to see values. A data table follows.`}</title>
                    {[0, 1, 2, 3, 4].map((tick) => <g key={tick}>
                        <line x1={left} x2={width - right} y1={y(max * tick / 4)} y2={y(max * tick / 4)} className="plot-grid" />
                        <text x={left - 9} y={y(max * tick / 4) + 4} textAnchor="end">{unit === "currency" ? `$${(max * tick / 4000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k` : formatChartValue(max * tick / 4, unit)}</text>
                    </g>)}
                    {!bars && series.map((s, index) => <path key={s.label} d={linePath(index)} fill="none" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dashed ? "6 4" : undefined} />)}
                    {points.map((p, index) => <g key={p.detail}>
                        {p.values.map((value, si) => value === null ? null : bars
                            ? <rect key={si} x={x(index) - plotWidth / points.length * .29} y={y(value)} width={plotWidth / points.length * .58} height={height - bottom - y(value)} rx="3" fill={series[si].color} />
                            : <circle key={si} cx={x(index)} cy={y(value)} r={points.length > 45 ? 2 : 3} fill={series[si].color} stroke="var(--surface)" strokeWidth="1.5" />)}
                        {index % tickStride === 0 && <text x={x(index)} y={height - 12} textAnchor="middle">{p.label}</text>}
                        <rect x={x(index) - plotWidth / points.length / 2} y={top} width={plotWidth / points.length} height={plotHeight} fill="transparent" tabIndex={0} role="img"
                            aria-label={`${p.detail}: ${p.values.map((v, i) => `${series[i].label} ${formatChartValue(v, unit)}`).join(", ")}`}
                            {...bind(p.detail)} className="plot-hit" />
                    </g>)}
                </svg>
            </div>
            {tip && selected && <ChartTooltip id={tooltipId} x={tip.x} y={tip.y}>
                <strong>{selected.detail}</strong>
                {selected.values.map((value, index) => <span key={series[index].label}>{series[index].label}: {formatChartValue(value, unit)}</span>)}
            </ChartTooltip>}
            <details className="chart-data"><summary>View chart data</summary><div className="chart-table-scroll"><table>
                <caption>{title}</caption><thead><tr><th scope="col">Period</th>{series.map((s) => <th scope="col" key={s.label}>{s.label}</th>)}</tr></thead>
                <tbody>{points.map((p) => <tr key={p.detail}><th scope="row">{p.detail}</th>{p.values.map((v, i) => <td key={i}>{formatChartValue(v, unit)}</td>)}</tr>)}</tbody>
            </table></div></details>
        </div>
    );
}
