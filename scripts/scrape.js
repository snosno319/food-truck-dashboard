#!/usr/bin/env node

/**
 * Main scraper orchestrator.
 * Reads trucks.json for existing truck data, runs all venue scrapers,
 * resolves truck names to IDs, and writes schedule.json.
 *
 * Usage: node scripts/scrape.js
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { VENUES } from './config.js';
import { getCurrentWeekDates } from './lib/dates.js';
import { findMatch, createPlaceholder, detectCuisine } from './lib/normalize.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'static', 'data');
const TRUCKS_PATH = join(DATA_DIR, 'trucks.json');
const SCHEDULE_PATH = join(DATA_DIR, 'schedule.json');

/**
 * Dynamically import the scraper module for a given parser name.
 * @param {string} parserName - e.g. 'kawabata', 'mellow', 'neo-yatai'
 * @returns {Promise<{scrape: Function}>}
 */
async function loadScraper(parserName) {
    return import(`./scrapers/${parserName}.js`);
}

/**
 * Run a scraper with retry logic.
 * @param {string} venueId
 * @param {Object} config
 * @param {string[]} weekDates
 * @param {number} maxRetries
 * @returns {Promise<{venueId: string, status: string, entries: Array, error?: string}>}
 */
async function runWithRetry(venueId, config, weekDates, maxRetries = 2) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                console.log(`  ↻ Retry ${attempt}/${maxRetries} for ${venueId}...`);
                await new Promise(r => setTimeout(r, 1000 * attempt)); // backoff
            }
            const scraper = await loadScraper(config.parser);
            const entries = await scraper.scrape(config, weekDates);
            return { venueId, status: 'ok', entries };
        } catch (err) {
            lastError = err;
            console.error(`  ✗ ${venueId} attempt ${attempt + 1}: ${err.message}`);
        }
    }
    return { venueId, status: 'error', entries: [], error: lastError?.message || 'Unknown error' };
}

/**
 * Load existing schedule data for incremental merging.
 * Returns the existing schedule entries, filtered to only include
 * dates within the current target window.
 * @param {string[]} weekDates - Target date range
 * @returns {Array<{date: string, venue_id: string, truck_id: string}>}
 */
function loadExistingSchedule(weekDates) {
    try {
        const existing = JSON.parse(readFileSync(SCHEDULE_PATH, 'utf-8'));
        if (!existing.schedule || !Array.isArray(existing.schedule)) return [];

        const validDates = new Set(weekDates);
        const today = weekDates[0]; // first date in window

        // Keep entries that are within the target window AND not in the past
        return existing.schedule.filter(e => {
            return validDates.has(e.date) && e.date >= today;
        });
    } catch {
        // File doesn't exist or is invalid — start fresh
        return [];
    }
}

/**
 * Build per-venue coverage stats for data quality tracking.
 * @param {Array<{date: string, venue_id: string, truck_id: string}>} schedule
 * @param {string[]} weekDates
 * @returns {Object} Coverage stats per venue
 */
function buildDataQuality(schedule, weekDates) {
    // Only check weekdays (Mon-Fri)
    const weekdays = weekDates.filter(d => {
        const day = new Date(d + 'T00:00:00').getDay();
        return day >= 1 && day <= 5;
    });

    const venueIds = [...new Set(schedule.map(e => e.venue_id))];
    const coverage = {};

    for (const venueId of venueIds) {
        const venueEntries = schedule.filter(e => e.venue_id === venueId);
        const datesWithData = new Set(venueEntries.map(e => e.date));
        const missingDays = weekdays.filter(d => !datesWithData.has(d));

        coverage[venueId] = {
            total_entries: venueEntries.length,
            days_with_data: datesWithData.size,
            weekdays_in_window: weekdays.length,
            missing_weekdays: missingDays
        };
    }

    return {
        total_entries: schedule.length,
        venues_scraped: venueIds.length,
        weekdays_in_window: weekdays.length,
        per_venue: coverage
    };
}

/**
 * Main scrape pipeline.
 */
async function main() {
    console.log('🚚 Otemachi Eats — Schedule Scraper');
    console.log('====================================\n');

    // 1. Load existing truck master data
    const trucksData = JSON.parse(readFileSync(TRUCKS_PATH, 'utf-8'));
    const trucks = [...trucksData.trucks]; // mutable copy
    let newTruckCount = 0;

    // 2. Calculate target dates (7 days from today)
    const weekDates = getCurrentWeekDates();
    console.log(`Target window: ${weekDates[0]} → ${weekDates[weekDates.length - 1]}\n`);

    // 3. Load existing schedule for incremental merge
    const existingEntries = loadExistingSchedule(weekDates);
    console.log(`📂 Loaded ${existingEntries.length} existing entries within window\n`);

    // 4. Run all scrapers with retry logic via Promise.allSettled
    const venueEntries = Object.entries(VENUES);
    const scraperPromises = venueEntries.map(
        ([venueId, config]) => runWithRetry(venueId, config, weekDates)
    );

    const results = await Promise.allSettled(scraperPromises);

    // 5. Collect all raw entries and build source_runs log
    const allRawEntries = [];
    const sourceRuns = [];

    for (const result of results) {
        // Promise.allSettled wraps in {status, value/reason}
        // But since we catch inside the mapper, they should all be 'fulfilled'
        const data = result.status === 'fulfilled' ? result.value : {
            venueId: 'unknown',
            status: 'error',
            entries: [],
            error: result.reason?.message || 'Unknown error'
        };

        sourceRuns.push({
            venue_id: data.venueId,
            status: data.status,
            entries_count: data.entries.length,
            ...(data.error ? { error: data.error } : {})
        });

        allRawEntries.push(...data.entries);
    }

    // 6. Resolve truck_name_raw → truck_id
    const newScheduleEntries = [];

    for (const raw of allRawEntries) {
        const match = findMatch(raw.truck_name_raw, trucks);
        const detailText = raw.detail_text || '';

        if (match) {
            // If the matched truck has unknown cuisine and we have detail text,
            // attempt to re-detect cuisine from the detail page content
            if (match.cuisine === 'unknown' && detailText) {
                const { cuisine, cuisine_label } = detectCuisine(match.name, detailText);
                if (cuisine !== 'unknown') {
                    match.cuisine = cuisine;
                    match.cuisine_label = cuisine_label;
                    console.log(`  ↻ Updated cuisine for ${match.id}: ${cuisine} (${cuisine_label})`);
                }
            }

            newScheduleEntries.push({
                date: raw.date,
                venue_id: raw.venue_id,
                truck_id: match.id
            });
        } else {
            // New truck discovered — create placeholder
            const placeholder = createPlaceholder(raw.truck_name_raw, detailText);

            // Avoid duplicate placeholder IDs
            const existing = trucks.find(t => t.id === placeholder.id);
            if (existing) {
                // ID collision with an existing truck that didn't name-match
                // Also try to update cuisine if unknown
                if (existing.cuisine === 'unknown' && detailText) {
                    const { cuisine, cuisine_label } = detectCuisine(existing.name, detailText);
                    if (cuisine !== 'unknown') {
                        existing.cuisine = cuisine;
                        existing.cuisine_label = cuisine_label;
                        console.log(`  ↻ Updated cuisine for ${existing.id}: ${cuisine} (${cuisine_label})`);
                    }
                }
                newScheduleEntries.push({
                    date: raw.date,
                    venue_id: raw.venue_id,
                    truck_id: existing.id
                });
            } else {
                trucks.push(placeholder);
                newTruckCount++;
                console.log(`⚠ New truck: ${placeholder.id} (${raw.truck_name_raw}) — ${placeholder.cuisine} (${placeholder.cuisine_label})`);
                newScheduleEntries.push({
                    date: raw.date,
                    venue_id: raw.venue_id,
                    truck_id: placeholder.id
                });
            }
        }
    }

    // 7. MERGE: combine existing + new entries, deduplicate
    const merged = [...existingEntries, ...newScheduleEntries];
    const seen = new Set();
    const dedupedSchedule = merged.filter(e => {
        const key = `${e.date}|${e.venue_id}|${e.truck_id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    const netNew = dedupedSchedule.length - existingEntries.length;

    // 8. Write updated trucks.json if new trucks were discovered or cuisines updated
    const cuisineUpdated = trucks.some((t, i) => {
        const orig = trucksData.trucks[i];
        return orig && orig.cuisine !== t.cuisine;
    });

    if (newTruckCount > 0 || cuisineUpdated) {
        trucksData.trucks = trucks;
        trucksData.last_updated = new Date().toISOString().slice(0, 10);
        writeFileSync(TRUCKS_PATH, JSON.stringify(trucksData, null, 2) + '\n', 'utf-8');
        console.log(`\n📝 trucks.json updated: ${newTruckCount} new truck(s) added${cuisineUpdated ? ', cuisine(s) updated' : ''}`);
    }

    // 9. Build data quality stats
    const dataQuality = buildDataQuality(dedupedSchedule, weekDates);

    // 10. Write schedule.json (merged)
    const now = new Date();
    const scheduleOutput = {
        last_updated: now.toISOString(),
        week_start: weekDates[0],
        week_end: weekDates[weekDates.length - 1],
        source_runs: sourceRuns,
        data_quality: dataQuality,
        schedule: dedupedSchedule
    };

    writeFileSync(SCHEDULE_PATH, JSON.stringify(scheduleOutput, null, 2) + '\n', 'utf-8');

    // 11. Summary
    console.log('\n====================================');
    console.log(`✓ ${dedupedSchedule.length} total schedule entries (${netNew >= 0 ? '+' : ''}${netNew} net change)`);
    console.log(`  ${existingEntries.length} carried over from previous run`);
    console.log(`  ${newScheduleEntries.length} freshly scraped`);
    console.log(`  ${newTruckCount} new truck(s) discovered`);

    // Coverage report
    const weekdays = weekDates.filter(d => {
        const day = new Date(d + 'T00:00:00').getDay();
        return day >= 1 && day <= 5;
    });
    for (const wd of weekdays) {
        const count = dedupedSchedule.filter(e => e.date === wd).length;
        const icon = count > 0 ? '✓' : '⚠';
        console.log(`  ${icon} ${wd}: ${count} entries`);
    }

    const failedCount = sourceRuns.filter(r => r.status === 'error').length;
    if (failedCount > 0) {
        console.log(`  ⚠ ${failedCount} venue(s) failed to scrape`);
    }
    for (const run of sourceRuns) {
        const icon = run.status === 'ok' ? '✓' : '✗';
        console.log(`  ${icon} ${run.venue_id}: ${run.entries_count} entries`);
    }
    console.log('');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
