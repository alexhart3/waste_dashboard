import type { DashboardPayload } from "@/types/dashboard";
import type { WasteStream } from "@/types/pickup";

import { fetchBackend, SignInRequiredError } from "./authApi";

function normalizeStream(stream: unknown, binId: unknown): WasteStream | null {
    const label = typeof stream === "string" ? stream.trim().toLowerCase() : "";
    if (label.includes("compost") || label.includes("organic")) return "Compost";
    if (label.includes("recycl") || label.includes("commingl")) return "Recycling";
    if (["landfill", "waste", "trash", "garbage", "refuse"].some((term) => label.includes(term))) {
        return "Landfill";
    }

    // Older API deployments return "Other" for the campus bin IDs, whose
    // final token already identifies the stream (for example, *_WASTE).
    const idType = typeof binId === "string" ? binId.trim().toUpperCase().split(/[-_]/).at(-1) : "";
    if (["WASTE", "LANDFILL", "LF", "L"].includes(idType ?? "")) return "Landfill";
    if (["RECYCLE", "RECYCLING", "REC", "R"].includes(idType ?? "")) return "Recycling";
    if (["COMPOST", "ORGANIC", "ORGANICS", "CP", "C"].includes(idType ?? "")) return "Compost";

    return null;
}

function normalizePayloadStreams(payload: DashboardPayload): DashboardPayload {
    const normalizeRow = <T extends { stream: string; binId: string }>(row: T): T => {
        const stream = normalizeStream(row.stream, row.binId);
        return stream ? { ...row, stream } : row;
    };

    return {
        pickups: payload.pickups.map(normalizeRow),
        schedule: payload.schedule.map(normalizeRow),
        costs: payload.costs,
    };
}

export async function fetchDashboardData(token: string, signal?: AbortSignal): Promise<DashboardPayload> {
    const response = await fetchBackend("/dashboard/", {
        signal,
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
    });

    if (response.status === 401) throw new SignInRequiredError("Please sign in again.");
    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Dashboard API returned ${response.status}${detail ? `: ${detail}` : ""}`);
    }

    const payload: unknown = await response.json();
    if (
        !payload
        || typeof payload !== "object"
        || !Array.isArray((payload as DashboardPayload).pickups)
        || !Array.isArray((payload as DashboardPayload).schedule)
        || !Array.isArray((payload as DashboardPayload).costs)
    ) {
        throw new Error("Dashboard API response must contain pickups, schedule, and costs arrays.");
    }

    return normalizePayloadStreams(payload as DashboardPayload);
}
