export type WasteStream = "Landfill" | "Recycling" | "Compost";
export type ServiceStatus = "Completed" | "Delayed" | "Incomplete" | "Missed";

export type PickupRecord = {
    id: string;
    photoUrl: string | null;
    collectedAt: string;
    driver: string;
    building: string;
    binId: string;
    stream: WasteStream;
    containerSize: string;
    fullness: number | null;
    contaminated: boolean;
    overflow: boolean;
    status: ServiceStatus;
};