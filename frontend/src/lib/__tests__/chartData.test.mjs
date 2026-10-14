import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pickupTrend, weekdayFullness, demoMonthlyCosts, demoContaminants } from '../chartData.ts';

const pickup = (collectedAt, fullness = 50, extras = {}) => ({ id: collectedAt, collectedAt, fullness, contaminated: false, ...extras });
const service = (scheduledAt, extras = {}) => ({ scheduledAt, fulfilled: false, pickupId: null, ...extras });

test('daily trend fills zero days, includes end date, and excludes future or linked services from missed', () => {
    const result = pickupTrend([pickup('2026-10-12T23:59:00Z'), pickup('2026-10-14T23:59:00Z')], [
        service('2026-10-12T09:00:00Z'), service('2026-10-12T10:00:00Z', { fulfilled: true }),
        service('2026-10-12T11:00:00Z', { pickupId: 'linked' }), service('2026-10-14T23:00:00Z'),
    ], '2026-10-12', '2026-10-14', Date.parse('2026-10-14T12:00:00Z'));
    assert.deepEqual(result.points.map(p => p.values), [[1, 1], [0, 0], [1, 0]]);
});

test('weekly and monthly buckets retain all observations across calendar boundaries', () => {
    const records = [pickup('2025-12-31T23:59:00Z'), pickup('2026-01-01T00:01:00Z'), pickup('2026-07-01T12:00:00Z')];
    const monthly = pickupTrend(records, [], '2025-12-15', '2026-07-01', 0);
    assert.equal(monthly.interval, 'Monthly');
    assert.equal(monthly.points.length, 8);
    assert.equal(monthly.points.reduce((sum, p) => sum + p.values[0], 0), 3);
    const weekly = pickupTrend(records, [], '2025-12-01', '2026-01-31', 0);
    assert.equal(weekly.interval, 'Weekly');
    assert.equal(weekly.points.reduce((sum, p) => sum + p.values[0], 0), 2);
});

test('empty and reversed date ranges are safe', () => {
    assert.deepEqual(pickupTrend([], [], '', '', 0).points, []);
    assert.deepEqual(pickupTrend([], [], '2026-10-14', '2026-10-01', 0).points, []);
});

test('weekday fullness uses UTC, excludes nulls, retains zero, and leaves absent days null', () => {
    const points = weekdayFullness([
        pickup('2026-10-12T00:01:00Z', 0), pickup('2026-10-12T12:00:00Z', 100),
        pickup('2026-10-12T20:00:00Z', null), pickup('2026-10-18T12:00:00Z', 75),
    ]);
    assert.deepEqual(points.map(p => p.values[0]), [50, null, null, null, null, null, 75]);
    assert.equal(points[0].detail, 'Mon · 2 readings');
});

test('illustrative campus cost equals sum of building costs and changes by year', () => {
    const campus = demoMonthlyCosts(['Library', 'Union'], 2026);
    const library = demoMonthlyCosts(['Library'], 2026);
    const union = demoMonthlyCosts(['Union'], 2026);
    campus.forEach((point, index) => assert.equal(point.values[0], library[index].values[0] + union[index].values[0]));
    assert.notDeepEqual(campus, demoMonthlyCosts(['Library', 'Union'], 2025));
});

test('sample contaminant counts reconcile exactly and stay stable under filtering', () => {
    const records = Array.from({length: 20}, (_, i) => pickup(String(i), 50, { contaminated: i % 3 === 0 }));
    assert.equal(demoContaminants(records).reduce((sum, row) => sum + row.value, 0), 7);
    assert.deepEqual(demoContaminants(records), demoContaminants(records.filter(p => p.contaminated)));
    assert.equal(demoContaminants([]).reduce((sum, row) => sum + row.value, 0), 0);
});
