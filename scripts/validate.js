#!/usr/bin/env node

/**
 * Post-scrape validation script.
 * Ensures the scraped data is valid before committing.
 * Exits with code 1 if validation fails (blocks git commit in CI).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR } from './lib/paths.js';

const errors = [];
const warnings = [];

function fail(msg) { errors.push(`❌ ${msg}`); }
function warn(msg) { warnings.push(`⚠ ${msg}`); }

try {
    // 1. Validate schedule.json
    const schedule = JSON.parse(readFileSync(join(DATA_DIR, 'schedule.json'), 'utf-8'));

    if (!schedule.last_updated) fail('schedule.json missing last_updated');
    if (!schedule.schedule || !Array.isArray(schedule.schedule)) {
        fail('schedule.json missing schedule array');
    } else {
        if (schedule.schedule.length === 0) {
            warn('schedule.json has 0 entries — all scrapers may have failed');
        }

        // Check for required fields in each entry
        for (const entry of schedule.schedule) {
            if (!entry.date || !entry.venue_id || !entry.truck_id) {
                fail(`Invalid schedule entry: ${JSON.stringify(entry)}`);
                break; // One example is enough
            }
        }

        // Check date validity
        const dates = new Set(schedule.schedule.map(e => e.date));
        for (const d of dates) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
                fail(`Invalid date format: ${d}`);
            }
        }
    }

    // Check source_runs
    if (schedule.source_runs) {
        const failed = schedule.source_runs.filter(r => r.status === 'error');
        if (failed.length > 0) {
            for (const f of failed) {
                warn(`Scraper failed for ${f.venue_id}: ${f.error || 'unknown error'}`);
            }
        }
        const allFailed = failed.length === schedule.source_runs.length;
        if (allFailed && schedule.source_runs.length > 0) {
            fail('ALL scrapers failed — not committing bad data');
        }
    }

    // 2. Validate trucks.json
    const trucks = JSON.parse(readFileSync(join(DATA_DIR, 'trucks.json'), 'utf-8'));

    if (!trucks.venues || !Array.isArray(trucks.venues)) {
        fail('trucks.json missing venues array');
    } else {
        for (const v of trucks.venues) {
            if (!v.id || !v.name) fail(`Venue missing id or name: ${JSON.stringify(v)}`);
            if (!v.lat || !v.lng) fail(`Venue ${v.id} missing coordinates`);
            if (typeof v.lat !== 'number' || typeof v.lng !== 'number') {
                fail(`Venue ${v.id} has non-numeric coordinates`);
            }
            // Sanity check: should be near Tokyo (35.6-35.8, 139.6-139.9)
            if (v.lat < 35.5 || v.lat > 36.0 || v.lng < 139.5 || v.lng > 140.0) {
                fail(`Venue ${v.id} coordinates out of Tokyo bounds: ${v.lat}, ${v.lng}`);
            }
        }
    }

    if (!trucks.trucks || !Array.isArray(trucks.trucks)) {
        fail('trucks.json missing trucks array');
    } else {
        const ids = new Set();
        for (const t of trucks.trucks) {
            if (!t.id || !t.name) fail(`Truck missing id or name`);
            if (ids.has(t.id)) warn(`Duplicate truck id: ${t.id}`);
            ids.add(t.id);
        }

        // Cuisine coverage check
        const unknowns = trucks.trucks.filter(t => t.cuisine === 'unknown');
        if (unknowns.length > 5) {
            warn(`${unknowns.length} trucks have unknown cuisine`);
        }
    }

    // 3. Cross-reference: schedule truck_ids should exist in trucks list
    if (trucks.trucks && schedule.schedule) {
        const truckIds = new Set(trucks.trucks.map(t => t.id));
        const orphans = schedule.schedule.filter(e => !truckIds.has(e.truck_id));
        if (orphans.length > 0) {
            warn(`${orphans.length} schedule entries reference non-existent truck IDs`);
        }
    }

} catch (err) {
    fail(`Failed to read/parse data files: ${err.message}`);
}

// Report
console.log('\n📋 Data Validation Report');
console.log('========================\n');

if (warnings.length > 0) {
    for (const w of warnings) console.log(w);
    console.log('');
}

if (errors.length > 0) {
    for (const e of errors) console.log(e);
    console.log(`\n💥 Validation FAILED with ${errors.length} error(s)`);
    process.exit(1);
} else {
    console.log('✅ All validations passed');
    if (warnings.length > 0) {
        console.log(`   (${warnings.length} warning(s) — data committed but review recommended)`);
    }
}
