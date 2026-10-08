import type { PickupRecord } from "@/types/pickup";

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

export type DashboardPayload = {
    pickups: PickupRecord[];
    schedule: ScheduleRecord[];
};
