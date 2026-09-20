import { PickupRecord } from "../types/pickup";
import PhotoThumb from "./PhotoThumb";
import StreamTag from "./StreamTag";
import StatusPill from "./StatusPill";

const records: PickupRecord[] = [
    { id: "PU-1008", photoUrl: null, collectedAt: "2026-09-18T12:23:00", driver: "S. Patel",    building: "Sequoia Hall",       binId: "SQU-C-01",   stream: "Compost",   containerSize: "32 gal cart",   fullness: 50,   contaminated: false, overflow: false, status: "Completed" },
    { id: "PU-1007", photoUrl: null, collectedAt: "2026-09-18T12:21:00", driver: "D. Okafor",   building: "Mendocino Hall",     binId: "MND-L-01",   stream: "Landfill",  containerSize: "2 yd dumpster", fullness: 75,   contaminated: false, overflow: false, status: "Completed" },
    { id: "PU-1006", photoUrl: null, collectedAt: "2026-09-18T11:40:00", driver: "M. Alvarez",  building: "University Library", binId: "LIB-R-01",   stream: "Recycling", containerSize: "96 gal cart",   fullness: 75,   contaminated: false, overflow: false, status: "Completed" },
    { id: "PU-1005", photoUrl: null, collectedAt: "2026-09-18T10:59:00", driver: "J. Nguyen",   building: "University Union",   binId: "UNION-C-02", stream: "Compost",   containerSize: "64 gal cart",   fullness: 100,  contaminated: false, overflow: true,  status: "Completed" },
    { id: "PU-1004", photoUrl: null, collectedAt: "2026-09-18T10:06:00", driver: "J. Nguyen",   building: "University Union",   binId: "UNION-R-01", stream: "Recycling", containerSize: "96 gal cart",   fullness: 75,   contaminated: true,  overflow: false, status: "Delayed" },
    { id: "PU-1003", photoUrl: null, collectedAt: "2026-09-18T09:05:00", driver: "R. Castillo", building: "Riverside Hall",     binId: "RVR-L-01",   stream: "Landfill",  containerSize: "96 gal cart",   fullness: 50,   contaminated: false, overflow: false, status: "Completed" },
    { id: "PU-1002", photoUrl: null, collectedAt: "2026-09-17T12:44:00", driver: "D. Okafor",   building: "The WELL",           binId: "WELL-R-02",  stream: "Recycling", containerSize: "32 gal cart",   fullness: 25,   contaminated: true,  overflow: false, status: "Incomplete" },
    { id: "PU-1001", photoUrl: null, collectedAt: "2026-09-17T08:10:00", driver: "M. Alvarez",  building: "Library Quad",       binId: "QUAD-L-01",  stream: "Landfill",  containerSize: "32 gal cart",   fullness: null, contaminated: false, overflow: false, status: "Missed" },
];

function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Los_Angeles",
    });
}

function YesNo({ value }: { value: boolean }) {
    return <span className={value ? "yes" : "no"}>{value ? "Yes" : "No"}</span>;
}

export default function RecordsTable() {
    const newestFirst = [...records].sort(
        (a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime()
    );

    return (
        <div className="tscroll">
        <table>
            <thead>
                <tr>
                    <th>Photo</th>
                    <th>Date &amp; time</th>
                    <th>Driver</th>
                    <th>Building</th>
                    <th>Bin ID</th>
                    <th>Waste type</th>
                    <th>Container</th>
                    <th>Fullness</th>
                    <th>Contaminated</th>
                    <th>Overflow</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                {newestFirst.map((r) => (
                    <tr key={r.id}>
                    <td><PhotoThumb url={r.photoUrl} /></td>
                    <td className="nowrap">{formatDate(r.collectedAt)}</td>
                    <td className="nowrap">{r.driver}</td>
                    <td>{r.building}</td>
                    <td className="mono nowrap">{r.binId}</td>
                    <td><StreamTag stream={r.stream} /></td>
                    <td className="nowrap muted">{r.containerSize}</td>
                    <td className="mono">{r.fullness === null ? "—" : `${r.fullness}%`}</td>
                    <td><YesNo value={r.contaminated} /></td>
                    <td><YesNo value={r.overflow} /></td>
                    <td><StatusPill status={r.status} /></td>
                    </tr>
                ))}
            </tbody>
        </table>
        </div>
    );
}