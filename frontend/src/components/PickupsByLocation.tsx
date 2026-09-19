import ChartCard from "./ChartCard";
import StreamLegend from "./StreamLegend";
import FullnessBadge from "./FullnessBadge";
import HorizontalBarChart, { BarRow } from "./HorizontalBarChart";

const buildings = [
    { name: "The WELL",           landfill: 9, recycling: 19, compost: 0,  avgFullness: 37 },
    { name: "University Union",   landfill: 6, recycling: 4,  compost: 15, avgFullness: 83 },
    { name: "Library Quad",       landfill: 8, recycling: 6,  compost: 11, avgFullness: 79 },
    { name: "University Library", landfill: 5, recycling: 11, compost: 7,  avgFullness: 57 },
    { name: "Riverside Hall",     landfill: 7, recycling: 7,  compost: 9,  avgFullness: 34 },
    { name: "Sequoia Hall",       landfill: 5, recycling: 8,  compost: 9,  avgFullness: 53 },
    { name: "Mendocino Hall",     landfill: 9, recycling: 8,  compost: 0,  avgFullness: 72 },
];

export default function PickupsByLocation() {
    const rows: BarRow[] = buildings.map((b) => ({
        label: b.name,
        segments: [
            { label: "Landfill",  value: b.landfill,  color: "var(--lf)" },
            { label: "Recycling", value: b.recycling, color: "var(--rc)" },
            { label: "Compost",   value: b.compost,   color: "var(--cp)" },
        ].filter((seg) => seg.value > 0),
        extra: <FullnessBadge percent={b.avgFullness} />,
    }));

    return (
        <ChartCard
        title="Pickups by location"
        subtitle="Pickups per building and average fullness at collection"
        right={<StreamLegend />}
        >
            <HorizontalBarChart
            labelHeader="Building"
            valueHeader="Pickups"
            extraHeader="Avg full"
            rows={rows}
            />
        </ChartCard>
    );
}