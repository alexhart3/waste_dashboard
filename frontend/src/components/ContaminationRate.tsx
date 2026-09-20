import ChartCard from "./ChartCard";
import ContaminationBox from "./ContaminationBox";

const streams = [
    { name: "Landfill",  color: "var(--lf)", contaminated: 7,  pickups: 54 },
    { name: "Recycling", color: "var(--rc)", contaminated: 20, pickups: 58 },
    { name: "Compost",   color: "var(--cp)", contaminated: 13, pickups: 51 },
];

export default function ContaminationRate() {
    return (
        <ChartCard
        title="Contamination rate"
        subtitle="Share of pickups in each waste stream where the driver marked contamination"
        wide
        >
            <div className="crate">
                {streams.map((s) => (
                    <ContaminationBox
                        key={s.name}
                        name={s.name}
                        color={s.color}
                        contaminated={s.contaminated}
                        pickups={s.pickups}
                    />
                ))}
            </div>
        </ChartCard>
    );
}