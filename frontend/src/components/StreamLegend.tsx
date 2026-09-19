import { WASTE_STREAMS } from "../lib/wasteStreams";

export default function StreamLegend() {
    return (
        <div className="legend">
            {WASTE_STREAMS.map((stream) => (
                <span key={stream.name}>
                    <i className="sw" style={{ background: stream.color }}></i>
                    {stream.name}
                </span>
            ))}
        </div>
    );
}