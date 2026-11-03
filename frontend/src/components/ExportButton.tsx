"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthGate";
import { useDashboardData } from "./DashboardDataProvider";
import { restoreSession, SignInRequiredError } from "@/lib/authApi";
import { pickupExportFilename, pickupsCsv } from "@/lib/exportCsv";

export default function ExportButton() {
    const { filteredPickups, filters } = useDashboardData();
    const { token, signOut } = useAuth();
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState({ message: "", selection: "" });
    const selection = JSON.stringify(filters);
    const message = notice.selection === selection ? notice.message : "";
    const request = useRef<AbortController | null>(null);
    useEffect(() => () => request.current?.abort(), []);

    async function exportRecords() {
        if (request.current || !filteredPickups.length) return;
        const controller = new AbortController();
        request.current = controller;
        setBusy(true);
        setNotice({ message: "", selection });
        try {
            await restoreSession(token, controller.signal);
            if (controller.signal.aborted) return;
            const url = URL.createObjectURL(new Blob([pickupsCsv(filteredPickups)], { type: "text/csv;charset=utf-8" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = pickupExportFilename(filters.startDate, filters.endDate, filters.building);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
            setNotice({ message: `CSV prepared: ${filteredPickups.length} pickup${filteredPickups.length === 1 ? "" : "s"}.`, selection });
        } catch (error) {
            if (controller.signal.aborted) return;
            if (error instanceof SignInRequiredError) { signOut(); return; }
            setNotice({ message: "Couldn’t export. Please try again.", selection });
        } finally {
            request.current = null;
            if (!controller.signal.aborted) setBusy(false);
        }
    }

    return <div className="export-control">
        <button className="filter-reset export-button" type="button" onClick={exportRecords}
            disabled={busy || !filteredPickups.length}
            title={filteredPickups.length ? "Download pickup records matching the current filters" : "No pickups match these filters"}>
            {busy ? "Preparing…" : "Export CSV"}
        </button>
        {message && <span className="export-status" role="status">{message}</span>}
    </div>;
}
