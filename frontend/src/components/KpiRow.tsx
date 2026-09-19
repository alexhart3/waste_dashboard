import KpiCard from "@/components/KpiCard"

export default function KpiRow() {
    return (
        <section className="kpis">
        <KpiCard label="Total pickups" value="163" sub="of 166 scheduled services" color="var(--accent)" />
        <KpiCard label="Total missed" value="3" sub="2% of scheduled" color="var(--crit)" />
        <KpiCard label="Total excess" value="41" sub="25% picked up under 50% full" color="var(--warn)" />
        <KpiCard label="Avg fullness" value="59" unit="%" sub="at time of collection" color="var(--ink-2)" />
        <KpiCard label="Contamination" value="25" unit="%" sub="40 contaminated pickups" color="var(--serious)" />
        </section>
    );
}