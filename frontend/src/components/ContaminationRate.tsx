"use client";

import ChartCard from "./ChartCard";
import ContaminationBox from "./ContaminationBox";
import { useDashboardData } from "@/components/DashboardDataProvider";
import { WASTE_STREAMS } from "@/lib/wasteStreams";

export default function ContaminationRate() {
    const { filteredPickups } = useDashboardData();
    const streams = WASTE_STREAMS.map((stream) => {
        const pickups = filteredPickups.filter((pickup) => pickup.stream === stream.name);
        return {
            name: stream.name,
            color: stream.color,
            contaminated: pickups.filter((pickup) => pickup.contaminated).length,
            pickups: pickups.length,
        };
    });

    return (
        <ChartCard
            title="Contamination rate"
            subtitle="Share of pickups in each waste stream where the driver marked contamination"
            wide
        >
            <div className="crate">
                {streams.map((stream) => (
                    <ContaminationBox
                        key={stream.name}
                        name={stream.name}
                        color={stream.color}
                        contaminated={stream.contaminated}
                        pickups={stream.pickups}
                    />
                ))}
            </div>
        </ChartCard>
    );
}
