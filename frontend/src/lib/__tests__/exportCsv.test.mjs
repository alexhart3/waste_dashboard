import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pickupsCsv, pickupExportFilename } from '../exportCsv.ts';

const record = (extras = {}) => ({
    id: 'PU-1', collectedAt: '2026-10-01T12:00:00Z', driver: 'Driver', building: 'Library',
    binId: 'B-1', stream: 'Recycling', containerSize: '64GAL', fullness: 0,
    contaminated: false, contaminationCategory: null, overflow: false,
    status: 'Completed', photoUrl: null, ...extras,
});

test('CSV escapes commas, quotes, line breaks and preserves Unicode', () => {
    const csv = pickupsCsv([record({ driver: 'José, "Joe"\nSmith', containerSize: '5×4YD' })]);
    assert.ok(csv.startsWith('\uFEFF"Pickup ID","Collected at (UTC)"'));
    assert.ok(csv.includes('"José, ""Joe""\nSmith"'));
    assert.ok(csv.includes('"5×4YD"'));
    assert.ok(csv.endsWith('\r\n'));
});

test('CSV distinguishes zero from missing readings, exports categories and status', () => {
    const csv = pickupsCsv([record(), record({ id: 'PU-2', fullness: null, contaminated: true, overflow: true, status: 'Incomplete' })]);
    assert.ok(csv.includes('"64GAL","0","No","","No","Completed",""'));
    assert.ok(csv.includes('"64GAL","","Yes","Unknown","Yes","Incomplete",""'));
});

test('CSV neutralizes spreadsheet formulas, including leading whitespace', () => {
    for (const driver of ['=HYPERLINK("url")', '+SUM(1,2)', '-1+1', '@SUM(1)', '  =1+1', '\t=1+1', '\r=1+1']) {
        assert.ok(pickupsCsv([record({ driver })]).includes(`"'${driver.replaceAll('"', '""')}"`));
    }
});

test('CSV includes only supplied filtered records, sorted newest first without mutation', () => {
    const records = [record(), record({ id: 'PU-2', collectedAt: '2026-10-02T12:00:00Z' })];
    const csv = pickupsCsv(records);
    assert.ok(csv.indexOf('"PU-2"') < csv.indexOf('"PU-1"'));
    assert.equal(records[0].id, 'PU-1');
    assert.ok(!pickupsCsv(records.slice(0, 1)).includes('"PU-2"'));
    assert.equal(pickupsCsv([]).split('\r\n').length, 2);
});

test('filename identifies selected location and date range safely', () => {
    assert.equal(pickupExportFilename('2026-10-01', '2026-10-31', 'Library / North'), 'waste-pickups_Library-North_2026-10-01_2026-10-31.csv');
    assert.equal(pickupExportFilename('', '', ''), 'waste-pickups_all-locations_all-dates_latest.csv');
});
