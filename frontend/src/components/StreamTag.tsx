import { WASTE_STREAMS } from "../lib/wasteStreams";
import { WasteStream } from "../types/pickup";

export default function StreamTag({ stream }: { stream: WasteStream }) {
  const color = WASTE_STREAMS.find((s) => s.name === stream)?.color;

    return (
        <span className="tag">
            <i className="sw" style={{ background: color }}></i>
            {stream}
        </span>
    );
}