import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pickupTrend, weekdayFullness, monthlyCosts, contaminantBreakdown } from '../chartData.ts';

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

test('stored costs sum cents by year and building, retaining zero and missing months', () => {
    const records = [
        { building: 'Library', month: '2026-01-01', amountCents: 10101 },
        { building: 'Library', month: '2026-01-01', amountCents: 20202 },
        { building: 'Union', month: '2026-01-01', amountCents: 30000 },
        { building: 'Library', month: '2026-02-01', amountCents: 0 },
        { building: 'Library', month: '2025-01-01', amountCents: 99999 },
    ];
    assert.equal(monthlyCosts(records, 2026)[0].values[0], 603.03);
    assert.deepEqual(monthlyCosts(records, 2026, 'Library').slice(0, 3).map(p => p.values[0]), [303.03, 0, null]);
    assert.equal(monthlyCosts(records, 2025)[0].values[0], 999.99);
    assert.ok(monthlyCosts(records, 2026, 'Missing').every(p => p.values[0] === null));
});

test('contaminants use stored categories, retain unknowns, and exclude unflagged pickups', () => {
    const records = [
        pickup('1', 50, { contaminated: true, contaminationCategory: 'Plastic film' }),
        pickup('2', 50, { contaminated: true, contaminationCategory: 'Plastic film' }),
        pickup('3', 50, { contaminated: true, contaminationCategory: null }),
        pickup('4', 50, { contaminated: false, contaminationCategory: 'Food / liquids' }),
    ];
    assert.deepEqual(contaminantBreakdown(records), [{ label: 'Plastic film', value: 2 }, { label: 'Unknown', value: 1 }]);
    assert.deepEqual(contaminantBreakdown(records.slice(1, 2)), [{ label: 'Plastic film', value: 1 }]);
    assert.deepEqual(contaminantBreakdown([]), []);
});
