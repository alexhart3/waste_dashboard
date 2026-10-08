"use client";

import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import dashboardData from "@/data/dashboardData.json";
import { PickupRecord } from "@/types/pickup";

export type ScheduleRecord = {
    id: string;
    scheduledAt: string;
    pickupId: string | null;
    fulfilled: boolean;
    driver: string;
    building: string;
    binId: string;
    stream: PickupRecord["stream"];
    containerSize: string;
};

export type DashboardFilters = {
    startDate: string;
    endDate: string;
    containerSize: string;
    driver: string;
    building: string;
    stream: string;
};

const pickups = dashboardData.pickups as PickupRecord[];
const schedule = dashboardData.schedule as ScheduleRecord[];
const dateOf = (value: string) => value.slice(0, 10);
const dates = schedule.map((row) => dateOf(row.scheduledAt)).sort();

const defaultFilters: DashboardFilters = {
    startDate: dates[0],
    endDate: dates[dates.length - 1],
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
    const [filters, setFilters] = useState(defaultFilters);

    const value = useMemo<DashboardDataContextValue>(() => {
        const inDateRange = (date: string) => {
            const day = dateOf(date);
            return (!filters.startDate || day >= filters.startDate)
                && (!filters.endDate || day <= filters.endDate);
        };

        return {
            filters,
            setFilters,
            resetFilters: () => setFilters(defaultFilters),
            filteredPickups: pickups.filter((row) =>
                inDateRange(row.collectedAt) && matchesDetails(row, filters),
            ),
            filteredSchedule: schedule.filter((row) =>
                inDateRange(row.scheduledAt) && matchesDetails(row, filters),
            ),
            options: {
                containerSizes: [...new Set(pickups.map((row) => row.containerSize))].sort(),
                drivers: [...new Set(pickups.map((row) => row.driver))].sort(),
                buildings: [...new Set(pickups.map((row) => row.building))].sort(),
                streams: [...new Set(pickups.map((row) => row.stream))].sort(),
            },
        };
    }, [filters]);

    return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardData() {
    const context = useContext(DashboardDataContext);
    if (!context) throw new Error("useDashboardData must be used within DashboardDataProvider");
    return context;
}
