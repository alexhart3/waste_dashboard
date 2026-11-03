import type { PickupRecord } from "../types/pickup";

function csvCell(value: string | number | null) {
    let text = value === null ? "" : String(value);
    // Spreadsheet programs can execute formulas even in quoted CSV cells.
    if (typeof value === "string" && (/^\s*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text))) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
}

export function pickupsCsv(records: PickupRecord[]): string {
    const rows: (string | number | null)[][] = [[
        "Pickup ID", "Collected at (UTC)", "Driver", "Location", "Bin ID", "Waste stream",
        "Container size", "Fullness (%)", "Contamination observed", "Primary contaminant",
        "Overflow", "Service status", "Photo URL",
    ]];
    for (const record of [...records].sort((a, b) => Date.parse(b.collectedAt) - Date.parse(a.collectedAt))) {
        rows.push([
            record.id, record.collectedAt, record.driver, record.building, record.binId, record.stream,
            record.containerSize, record.fullness, record.contaminated ? "Yes" : "No",
            record.contaminated ? record.contaminationCategory || "Unknown" : "",
            record.overflow ? "Yes" : "No", record.status, record.photoUrl,
        ]);
    }
    // UTF-8 BOM preserves names and container-size symbols when opened in Excel.
    return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export function pickupExportFilename(start: string, end: string, building: string) {
    const location = building ? building.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 80) : "all-locations";
    return `waste-pickups_${location}_${start || "all-dates"}_${end || "latest"}.csv`;
}
