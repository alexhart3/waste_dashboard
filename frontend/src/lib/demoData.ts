import type { DashboardPayload } from "../types/dashboard";
import type { WasteStream } from "../types/pickup";

// Local, repeatable sample records. No API, storage, or random values are used.
export function createDemoData(): DashboardPayload {
    const data: DashboardPayload = { pickups: [], schedule: [], costs: [] };
    const buildings = ["Library", "University Union", "The WELL", "Dining Commons", "Mendocino Hall", "Riverside Hall"];
    const streams: WasteStream[] = ["Landfill", "Recycling", "Compost"];
    const drivers = ["Alex Morgan", "Jordan Lee", "Taylor Rivera"];
    const categories = ["Food / liquids", "Plastic film", "Wrong-stream items", "Other materials"];
    const start = Date.UTC(2026, 8, 7, 9);

    for (let day = 0; day < 56; day++) {
        buildings.forEach((building, location) => {
            streams.forEach((stream, streamIndex) => {
                const seed = day * 19 + location * 11 + streamIndex * 7;
                const weeklyLoad = [2, 4, 1, 3, 5, 2, 4, 1][Math.floor(day / 7)];
                if (seed % 8 < weeklyLoad || (location > 1 && day % (location + 2) === 0)) return;
                const id = `DEMO-${day}-${location}-${streamIndex}`;
                const details = {
                    building, stream, binId: `BIN-${location + 1}-${streamIndex + 1}`,
                    driver: drivers[(day + location) % drivers.length],
                    containerSize: ["64GAL", "96GAL", "4YD"][streamIndex],
                };
                const time = start + day * 86_400_000 + location * 30 * 60_000;
                const missed = seed % 9 === 0 || (location === 1 && day % 6 === 0);
                data.schedule.push({
                    ...details, id: `SCHEDULE-${id}`, scheduledAt: new Date(time).toISOString(),
                    pickupId: missed ? null : id, fulfilled: !missed,
                });
                if (missed) return;
                const fullness = [25, 50, 75, 100, 50, 75, 100][(day + location + streamIndex * 2) % 7];
                const contaminated = seed % 5 === 0 || (streamIndex === 1 && seed % 7 === 0);
                const delayed = seed % 13 === 0;
                data.pickups.push({
                    ...details, id, collectedAt: new Date(time + (delayed ? 120 : 15) * 60_000).toISOString(),
                    fullness, contaminated, contaminationCategory: contaminated ? categories[Math.floor(seed / 5) % categories.length] : null,
                    overflow: fullness === 100 && seed % 3 === 0,
                    status: delayed ? "Delayed" : "Completed", photoUrl: null,
                });
            });
        });
    }
    for (const year of [2024, 2025, 2026]) {
        for (let month = 1; month <= (year === 2026 ? 10 : 12); month++) {
            buildings.forEach((building, location) => {
                const date = `${year}-${String(month).padStart(2, "0")}-01`;
                data.costs.push({
                    id: `COST-${date}-${location}`, building, month: date, currency: "USD",
                    amountCents: 85000 + location * 24000 + ((month * 17 + location * 9) % 11) * 4500 + (year - 2024) * 6500,
                });
            });
        }
    }
    return data;
}
