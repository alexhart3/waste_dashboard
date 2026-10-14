"use client";

import { useEffect, useState } from "react";
import ChartCard from "./ChartCard";
import FilterSelect from "./FilterSelect";
import PickupsByLocation from "./PickupsByLocation";
import OverflowByBin from "./OverflowByBin";
import ChartTooltip, { useChartTooltip } from "./ChartTooltip";
import TrendPlot, { formatChartValue } from "./TrendPlot";
import { useDashboardData } from "./DashboardDataProvider";
import { DEMO_COST_YEARS, demoContaminants, demoMonthlyCosts, pickupTrend, weekdayFullness } from "@/lib/chartData";

function PickupTrend() {
    const { filteredPickups, filteredSchedule, filters } = useDashboardData();
    const [now, setNow] = useState<number | null>(null);
    useEffect(() => {
        const update = () => setNow(Date.now());
        update();
        const timer = window.setInterval(update, 60_000);
        return () => window.clearInterval(timer);
    }, []);
    const { interval, points } = pickupTrend(filteredPickups, filteredSchedule, filters.startDate, filters.endDate, now ?? 0);
    return <ChartCard title="Pickup trend" subtitle={`${interval} pickups · ${filters.building || "All locations"}`}>
        {!filteredPickups.length && !filteredSchedule.length ? <EmptyChart /> : <TrendPlot title="Pickup trend" points={points} series={[
            { label: "Occurred", color: "var(--rc)" }, { label: "Missed", color: "var(--crit)", dashed: true },
        ]} />}
        <p className="chart-note">Compare completed and missed pickups. Upcoming pickups don’t count as missed.</p>
    </ChartCard>;
}

function CampusCosts() {
    const { filters, options } = useDashboardData();
    const [year, setYear] = useState(2026);
    const buildings = filters.building ? [filters.building] : options.buildings;
    const points = demoMonthlyCosts(buildings, year);
    const total = points.reduce((sum, point) => sum + (point.values[0] ?? 0), 0);
    return <ChartCard title="Monthly collection costs" subtitle={`${filters.building || "Campus total"} · ${formatChartValue(total, "currency")} annual total`} right={
        <div className="card-tools">
            <div className="fgroup"><label className="lbl" htmlFor="cost-year">Year</label><select id="cost-year" className="ctl" value={year} onChange={(event) => setYear(Number(event.target.value))}>
                {DEMO_COST_YEARS.map((value) => <option key={value}>{value}</option>)}
            </select></div>
        </div>
    }>
        {buildings.length ? <TrendPlot title={`Monthly collection costs, ${year}`} points={points} series={[{ label: "Monthly spend (USD)", color: "var(--lf)" }]} unit="currency" bars /> : <EmptyChart />}
        <p className="chart-note">Uses the location filter above and the year selected here.</p>
    </ChartCard>;
}

function WeekdayFullness() {
    const { filteredPickups, filters } = useDashboardData();
    const points = weekdayFullness(filteredPickups);
    return <ChartCard title="Fullness by weekday" subtitle={`Average at collection · ${filters.building || "All locations"}`}>
        {points.some((p) => p.values[0] !== null) ? <TrendPlot title="Average fullness by weekday" points={points} series={[{ label: "Average fullness", color: "var(--cp)" }]} unit="percent" /> : <EmptyChart message="No fullness readings match these filters." />}
        <p className="chart-note">Average bin fullness at pickup. Days without readings are left blank.</p>
    </ChartCard>;
}

function ContaminationComposition() {
    const { filteredPickups, filters, setFilters, options } = useDashboardData();
    const { tip, id: tooltipId, bind } = useChartTooltip();
    const total = filteredPickups.length;
    const contaminated = filteredPickups.filter((p) => p.contaminated).length;
    const rate = total ? Math.round(contaminated / total * 100) : 0;
    const slices = [
        { label: "Not flagged", value: total - contaminated, color: "var(--cp)" },
        ...demoContaminants(filteredPickups).map((item, index) => ({ ...item, color: ["var(--crit)", "var(--serious)", "var(--lf)", "var(--rc)"][index] })),
    ];
    const selected = tip ? slices.find((slice) => slice.label === tip.key) : undefined;
    let offset = 0;
    return <ChartCard title="Contamination breakdown" subtitle={`${filters.building || "All locations"} · selected date range`} right={<FilterSelect id="contamination-stream" label="Waste stream" options={["All streams", ...options.streams]} value={filters.stream} onChange={(stream) => setFilters({ ...filters, stream })} />}>
        {!total ? <EmptyChart /> : <>
            <div className="contamination-composition">
                <div className="donut-wrap">
                    <svg viewBox="0 0 220 220" role="group" aria-label={`${rate}% contaminated: ${contaminated} of ${total} pickups.`}>
                        {slices.filter((s) => s.value > 0).map((slice) => {
                            const share = slice.value / total * 100;
                            const start = offset;
                            offset += share;
                            return <circle key={slice.label} cx="110" cy="110" r="82" fill="none" stroke={slice.color} strokeWidth="32" pathLength="100" strokeDasharray={`${share} ${100 - share}`} strokeDashoffset={-start} transform="rotate(-90 110 110)" tabIndex={0} role="img" aria-label={`${slice.label}: ${slice.value} pickups (${share.toFixed(1)}%)`} {...bind(slice.label)} />;
                        })}
                        <text x="110" y="108" textAnchor="middle" className="donut-value">{`${rate}%`}</text>
                        <text x="110" y="130" textAnchor="middle" className="donut-label">contaminated</text>
                    </svg>
                </div>
                <ul className="composition-legend" aria-label="Contamination composition">
                    {slices.map((slice) => <li key={slice.label}><span className="sw" style={{ background: slice.color }} /><span>{slice.label}</span><strong>{slice.value}</strong><span>{(slice.value / total * 100).toFixed(1)}%</span></li>)}
                </ul>
            </div>
            <p className="contamination-summary"><strong>{contaminated} of {total}</strong> pickups flagged for contamination.</p>
            {tip && selected && <ChartTooltip id={tooltipId} x={tip.x} y={tip.y}>
                <strong>{selected.label}</strong>
                <span>{selected.value} pickups · {(selected.value / total * 100).toFixed(1)}%</span>
            </ChartTooltip>}
        </>}
        <p className="chart-note">Use the waste stream filter to see recycling, compost or landfill pickups.</p>
    </ChartCard>;
}

function EmptyChart({ message = "No pickups match these filters." }: { message?: string }) {
    return <p className="trend-empty">{message}</p>;
}

export default function DashboardTrends() {
    const { filters } = useDashboardData();
    const invalidDates = filters.startDate && filters.endDate && filters.startDate > filters.endDate;
    return <>
        {invalidDates && <p role="alert" className="date-error">Choose an end date on or after the start date.</p>}
        <div className="grid analytics-grid">
            <PickupsByLocation />
            <CampusCosts />
            <PickupTrend />
            <WeekdayFullness />
            <OverflowByBin />
            <ContaminationComposition />
        </div>
    </>;
}
