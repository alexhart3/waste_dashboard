"use client";

import { useState } from "react";
import ChartCard from "./ChartCard";
import StreamLegend from "./StreamLegend";
import FullnessBadge from "./FullnessBadge";
import SortButton from "./SortButton";
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

type Building = (typeof buildings)[number];

const total = (b: Building) => b.landfill + b.recycling + b.compost;

const SORTS = [
    { key: "pickups-desc",  label: "Pickups: high to low",      short: "Pickups ↓",  compare: (a: Building, b: Building) => total(b) - total(a) },
    { key: "pickups-asc",   label: "Pickups: low to high",      short: "Pickups ↑",  compare: (a: Building, b: Building) => total(a) - total(b) },
    { key: "fullness-desc", label: "Avg fullness: high to low", short: "Avg full ↓", compare: (a: Building, b: Building) => b.avgFullness - a.avgFullness },
    { key: "fullness-asc",  label: "Avg fullness: low to high", short: "Avg full ↑", compare: (a: Building, b: Building) => a.avgFullness - b.avgFullness },
    { key: "name",          label: "Building: A–Z",             short: "A–Z",        compare: (a: Building, b: Building) => a.name.localeCompare(b.name) },
];

export default function PickupsByLocation() {
    const [sortKey, setSortKey] = useState("pickups-desc");
    const sort = SORTS.find((s) => s.key === sortKey) ?? SORTS[0];
    const sorted = [...buildings].sort(sort.compare);

    const rows: BarRow[] = sorted.map((b) => ({
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
        right={
            <div className="card-tools">
            <StreamLegend />
            <SortButton options={SORTS} value={sortKey} onChange={setSortKey} />
            </div>
        }
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