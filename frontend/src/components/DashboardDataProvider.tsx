"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import dashboardData from "@/data/dashboardData.json";
import { fetchDashboardData } from "@/lib/dashboardApi";
import { DashboardPayload, ScheduleRecord } from "@/types/dashboard";
import { PickupRecord, WasteStream } from "@/types/pickup";

export type DashboardFilters = {
    startDate: string;
    endDate: string;
    containerSize: string;
    driver: string;
    building: string;
    stream: string;
};

const mockPayload = dashboardData as DashboardPayload;
const dateOf = (value: string) => value.slice(0, 10);
const mockDates = mockPayload.schedule.map((row) => dateOf(row.scheduledAt)).sort();

const defaultFilters: DashboardFilters = {
    startDate: mockDates[0],
    endDate: mockDates[mockDates.length - 1],
    containerSize: "",
    driver: "",
    building: "",
    stream: "",
};

type DashboardDataContextValue = {
    filters: DashboardFilters;
    setFilters: (filters: DashboardFilters) => void;
    resetFilters: () => void;
    filteredPickups: PickupRecord[];
    filteredSchedule: ScheduleRecord[];
    options: {
        containerSizes: string[];
        drivers: string[];
        buildings: string[];
        streams: string[];
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
    const [payload, setPayload] = useState<DashboardPayload>(mockPayload);
    const [filters, setFilters] = useState(defaultFilters);

    useEffect(() => {
        const controller = new AbortController();
        fetchDashboardData(controller.signal)
            .then((data) => {
                setPayload(data);
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
                if (error instanceof DOMException && error.name === "AbortError") return;
                console.warn("Dashboard API unavailable; continuing with local mock data.", error);
            });

        return () => controller.abort();
    }, []);

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
                buildings: [...new Set(allRows.map((row) => row.building))].sort(),
                // These are the dashboard's supported waste streams. Keep the
                // filter complete even if a backend row contains an unrecognized label.
                streams: ["Landfill", "Recycling", "Compost"] satisfies WasteStream[],
            },
        };
    }, [payload, filters]);

    return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardData() {
    const context = useContext(DashboardDataContext);
    if (!context) throw new Error("useDashboardData must be used within DashboardDataProvider");
    return context;
}
