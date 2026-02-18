#!/usr/bin/env node

/**
 * Post-scrape health check.
 * Verifies data coverage across venues and weekdays.
 * Emits GitHub Actions annotations for missing data.
 * Does NOT block the pipeline — data may simply not be published yet.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'static', 'data');

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

try {
    const schedule = JSON.parse(readFileSync(join(DATA_DIR, 'schedule.json'), 'utf-8'));
    const trucks = JSON.parse(readFileSync(join(DATA_DIR, 'trucks.json'), 'utf-8'));

    const venueIds = trucks.venues.map(v => v.id);
    const entries = schedule.schedule || [];

    // Determine the date window
    const allDates = [...new Set(entries.map(e => e.date))].sort();
    const weekStart = schedule.week_start;
    const weekEnd = schedule.week_end;

    // Generate all dates in the window
    const windowDates = [];
    const start = new Date(weekStart + 'T00:00:00');
    const end = new Date(weekEnd + 'T00:00:00');
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        windowDates.push(d.toISOString().slice(0, 10));
    }

    // Filter to weekdays only
    const weekdays = windowDates.filter(d => {
        const day = new Date(d + 'T00:00:00').getDay();
        return day >= 1 && day <= 5;
    });

    console.log('\n🏥 Schedule Health Check');
    console.log('========================\n');
    console.log(`Window: ${weekStart} → ${weekEnd}`);
    console.log(`Weekdays in window: ${weekdays.length}`);
    console.log(`Total entries: ${entries.length}\n`);

    let warnings = 0;
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

    // Check each venue × weekday
    for (const venueId of venueIds) {
        const venueEntries = entries.filter(e => e.venue_id === venueId);
        const datesWithData = new Set(venueEntries.map(e => e.date));
        const venueName = trucks.venues.find(v => v.id === venueId)?.name_en || venueId;

        const missing = weekdays.filter(d => !datesWithData.has(d));

        if (missing.length === 0) {
            console.log(`✅ ${venueId}: full coverage (${venueEntries.length} entries)`);
        } else if (missing.length === weekdays.length) {
            console.log(`❌ ${venueId}: NO DATA for any weekday`);
            warnings++;
            if (isCI) {
                console.log(`::warning::${venueName} (${venueId}) has no schedule data for any weekday`);
            }
        } else {
            const missingLabels = missing.map(d => {
                const day = new Date(d + 'T00:00:00').getDay();
                return `${DAY_NAMES[day]} ${d}`;
            });
            console.log(`⚠️  ${venueId}: missing ${missing.length} day(s) — ${missingLabels.join(', ')}`);
            warnings++;
            if (isCI) {
                console.log(`::warning::${venueName} (${venueId}) missing data for: ${missingLabels.join(', ')}`);
            }
        }
    }

    // Check for orphan venue IDs in schedule (entries referencing unknown venues)
    const knownVenues = new Set(venueIds);
    const orphanVenues = [...new Set(entries.map(e => e.venue_id))].filter(id => !knownVenues.has(id));
    if (orphanVenues.length > 0) {
        console.log(`\n⚠️  Orphan venue IDs in schedule: ${orphanVenues.join(', ')}`);
        warnings++;
    }

    // Data staleness check
    const lastUpdated = new Date(schedule.last_updated);
    const hoursOld = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);
    if (hoursOld > 36) {
        console.log(`\n⚠️  Data is ${Math.round(hoursOld)}h old (last updated: ${schedule.last_updated})`);
        warnings++;
        if (isCI) {
            console.log(`::warning::Schedule data is ${Math.round(hoursOld)} hours old`);
        }
    }

    console.log(`\n========================`);
    if (warnings === 0) {
        console.log('✅ All health checks passed');
    } else {
        console.log(`⚠️  ${warnings} warning(s) — review recommended`);
    }
    console.log('');

    // Exit 0 even with warnings — don't block the pipeline
} catch (err) {
    console.error('Health check error:', err.message);
    // Non-fatal: exit 0 so pipeline continues
}
