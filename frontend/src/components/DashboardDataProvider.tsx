"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { fetchDashboardData } from "@/lib/dashboardApi";
import { CollectionCostRecord, DashboardPayload, ScheduleRecord } from "@/types/dashboard";
import { PickupRecord, WasteStream } from "@/types/pickup";
import { useAuth } from "./AuthGate";
import { SignInRequiredError } from "@/lib/authApi";

export type DashboardFilters = {
    startDate: string;
    endDate: string;
    containerSize: string;
    driver: string;
    building: string;
    stream: string;
};

const emptyPayload: DashboardPayload = { pickups: [], schedule: [], costs: [] };
const dateOf = (value: string) => value.slice(0, 10);

const defaultFilters: DashboardFilters = {
    startDate: "",
    endDate: "",
    containerSize: "",
    driver: "",
    building: "",
    stream: "",
};

type DashboardDataContextValue = {
    dataSource: "loading" | "api" | "error";
    filters: DashboardFilters;
    setFilters: (filters: DashboardFilters) => void;
    resetFilters: () => void;
    filteredPickups: PickupRecord[];
    filteredSchedule: ScheduleRecord[];
    costs: CollectionCostRecord[];
    options: {
        containerSizes: string[];
        drivers: string[];
        buildings: string[];
        streams: string[];
        costYears: number[];
    };
};

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

function matchesDetails(
    row: Pick<PickupRecord, "containerSize" | "driver" | "building" | "stream">,
    filters: DashboardFilters,
) {
    return (!filters.containerSize || row.containerSize === filters.containerSize)
        && (!filters.driver || row.driver === filters.driver)
        && (!filters.building || row.building === filters.building)
        && (!filters.stream || row.stream === filters.stream);
}

export function DashboardDataProvider({ children }: { children: ReactNode }) {
    const { token, offline, retryConnection, signOut } = useAuth();
    const [payload, setPayload] = useState<DashboardPayload>(emptyPayload);
    const [dataSource, setDataSource] = useState<"loading" | "api" | "error">(offline ? "error" : "loading");
    const [filters, setFilters] = useState(defaultFilters);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (offline) return;
        const controller = new AbortController();
        fetchDashboardData(token, controller.signal)
            .then((data) => {
                setPayload(data);
                setDataSource("api");
                const dataDates = [
                    ...data.pickups.map((row) => dateOf(row.collectedAt)),
                    ...data.schedule.map((row) => dateOf(row.scheduledAt)),
                ].sort();
                setFilters((current) => current.startDate === defaultFilters.startDate
                    && current.endDate === defaultFilters.endDate
                    ? {
                        ...current,
                        startDate: dataDates[0] ?? "",
                        endDate: dataDates[dataDates.length - 1] ?? "",
                    }
                    : current,
                );
            })
            .catch((error: unknown) => {
                if (controller.signal.aborted) return;
                if (error instanceof SignInRequiredError) { signOut(); return; }
                setDataSource("error");
                console.warn("Dashboard API unavailable.", error);
            });

        return () => controller.abort();
    }, [attempt, token, offline, signOut]);

    const value = useMemo<DashboardDataContextValue>(() => {
        const inDateRange = (date: string) => {
            const day = dateOf(date);
            return (!filters.startDate || day >= filters.startDate)
                && (!filters.endDate || day <= filters.endDate);
        };

        const allRows = [...payload.pickups, ...payload.schedule];
        const dates = allRows
            .map((row) => "collectedAt" in row ? row.collectedAt : row.scheduledAt)
            .map(dateOf)
            .sort();

        return {
            dataSource,
            costs: payload.costs,
            filters,
            setFilters,
            resetFilters: () => setFilters({
                ...defaultFilters,
                startDate: dates[0] ?? "",
                endDate: dates[dates.length - 1] ?? "",
            }),
            filteredPickups: payload.pickups.filter((row) =>
                inDateRange(row.collectedAt) && matchesDetails(row, filters),
            ),
            filteredSchedule: payload.schedule.filter((row) =>
                inDateRange(row.scheduledAt) && matchesDetails(row, filters),
            ),
            options: {
                containerSizes: [...new Set(allRows.map((row) => row.containerSize))].sort(),
                drivers: [...new Set(allRows.map((row) => row.driver))].sort(),
                buildings: [...new Set([...allRows.map((row) => row.building), ...payload.costs.map((row) => row.building)])].sort(),
                costYears: [...new Set(payload.costs.map((row) => Number(row.month.slice(0, 4))))].sort((a, b) => b - a),
                // These are the dashboard's supported waste streams. Keep the
                // filter complete even if a backend row contains an unrecognized label.
                streams: ["Landfill", "Recycling", "Compost"] satisfies WasteStream[],
            },
        };
    }, [payload, filters, dataSource]);

    return <DashboardDataContext.Provider value={value}>
        {dataSource === "loading" ? <p className="trend-empty" role="status">Loading dashboard…</p>
            : <>
                {dataSource === "error" && <div className="server-offline" role="status">
                    <p><strong>Server offline</strong> — Collection data is unavailable. Try again when the server is running.</p>
                    <button className="ctl" onClick={() => {
                        if (offline) { retryConnection(); return; }
                        setDataSource("loading"); setAttempt((value) => value + 1);
                    }}>Try again</button>
                </div>}
                {children}
            </>}
    </DashboardDataContext.Provider>;
}

export function useDashboardData() {
    const context = useContext(DashboardDataContext);
    if (!context) throw new Error("useDashboardData must be used within DashboardDataProvider");
    return context;
}
