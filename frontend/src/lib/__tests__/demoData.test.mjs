import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDemoData } from '../demoData.ts';
import { pickupTrend, weekdayFullness, monthlyCosts, contaminantBreakdown } from '../chartData.ts';
import { pickupsCsv } from '../exportCsv.ts';

test('demo fills every chart with consistent local records', () => {
    const data = createDemoData();
    assert.deepEqual(createDemoData(), data);
    assert.equal(new Set(data.pickups.map(p => p.id)).size, data.pickups.length);
    assert.equal(new Set(data.pickups.map(p => p.building)).size, 6);
    assert.equal(new Set(data.pickups.map(p => p.stream)).size, 3);
    assert.ok(data.pickups.some(p => p.overflow));
    assert.ok(data.pickups.some(p => p.fullness < 50));
    assert.equal(contaminantBreakdown(data.pickups).length, 4);
    assert.ok(weekdayFullness(data.pickups).every(p => p.values[0] > 0));
    const trend = pickupTrend(data.pickups, data.schedule, '', '', Date.UTC(2026, 10, 4));
    assert.ok(trend.points.every(p => p.values[0] > 0 && p.values[1] > 0));
    assert.equal(trend.points.reduce((n, p) => n + p.values[0], 0), data.pickups.length);
    const ids = new Set(data.pickups.map(p => p.id));
    assert.ok(data.schedule.every(s => s.fulfilled ? ids.has(s.pickupId) : s.pickupId === null));
    for (const year of [2024, 2025, 2026]) {
        assert.ok(monthlyCosts(data.costs, year, 'Library').some(p => p.values[0] > 0));
    }
});

test('demo records support filters and CSV without mutating the fixture', () => {
    const data = createDemoData();
    const selected = data.pickups.filter(p => p.building === 'Library' && p.stream === 'Recycling' && p.collectedAt.slice(0, 10) >= '2026-10-01');
    assert.ok(selected.length > 0 && selected.length < data.pickups.length);
    const csv = pickupsCsv(selected);
    assert.ok(csv.includes('Library'));
    assert.ok(!csv.includes('University Union'));
    assert.deepEqual(createDemoData(), data);
});
