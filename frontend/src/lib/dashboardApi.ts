import type { DashboardPayload } from "@/types/dashboard";
import type { WasteStream } from "@/types/pickup";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");

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
    };
}

export async function fetchDashboardData(signal?: AbortSignal): Promise<DashboardPayload> {
    const response = await fetch(`${API_BASE_URL}/dashboard/`, {
        signal,
        cache: "no-store",
    });

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
    ) {
        throw new Error("Dashboard API response must contain pickups and schedule arrays.");
    }

    return normalizePayloadStreams(payload as DashboardPayload);
}
