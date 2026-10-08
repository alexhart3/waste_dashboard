"use client";

import { useMemo } from "react";
import { useDashboardData } from "@/components/DashboardDataProvider";
import PhotoThumb from "@/components/PhotoThumb";
import StreamTag from "@/components/StreamTag";
import StatusPill from "@/components/StatusPill";

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
    const { filteredPickups } = useDashboardData();
    const newestFirst = useMemo(
        () => [...filteredPickups].sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime()),
        [filteredPickups],
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
                    {newestFirst.length ? newestFirst.map((record) => (
                        <tr key={record.id}>
                            <td><PhotoThumb url={record.photoUrl} /></td>
                            <td className="nowrap">{formatDate(record.collectedAt)}</td>
                            <td className="nowrap">{record.driver}</td>
                            <td>{record.building}</td>
                            <td className="mono nowrap">{record.binId}</td>
                            <td><StreamTag stream={record.stream} /></td>
                            <td className="nowrap muted">{record.containerSize}</td>
                            <td className="mono">{record.fullness === null ? "—" : `${record.fullness}%`}</td>
                            <td><YesNo value={record.contaminated} /></td>
                            <td><YesNo value={record.overflow} /></td>
                            <td><StatusPill status={record.status} /></td>
                        </tr>
                    )) : (
                        <tr>
                            <td className="empty-state" colSpan={11}>No pickup records match these filters.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
