/**
 * Scraper for w-tokyodo.com (Neo Yatai Mura / Tokyo Sankei Building).
 * Schedule format: date-specific, tab-based layout.
 *
 * Page structure:
 *   <div class="cnt_tabs">
 *     <ul class="cnt_tabs_menu cnt_tabs_col05">
 *       <li class="active">02/16（月）</li>   ← tab 0
 *       <li>02/17（火）</li>                   ← tab 1
 *       ...
 *     </ul>
 *     <ul class="cnt_tabs_inner">
 *       <li class="active">                   ← panel 0 (matches tab 0)
 *         <h4>【カフェ】</h4>                  ← section header (skip)
 *         <h4>Shop Name</h4>                  ← vendor (keep)
 *         <h4>Shop Name</h4>                  ← duplicate (deduplicate)
 *         <h4>【ランチタイム】</h4>            ← section header (skip)
 *         <h4>Shop Name</h4>
 *         ...
 *       </li>
 *       <li>                                   ← panel 1 (matches tab 1)
 *         ...
 *       </li>
 *     </ul>
 *   </div>
 *
 * Tab index and panel index are 1:1.
 * Vendor names appear duplicated (once per display mode) — needs dedup.
 */

import * as cheerio from 'cheerio';
import { parseJapaneseDate } from '../lib/dates.js';
import { FETCH_OPTIONS } from '../config.js';

// Patterns to skip — these are section headers, not vendor names
const SKIP_PATTERNS = [
    /^【.*】/, // 【カフェ】, 【ランチタイム】 etc.
];

/**
 * Scrape the Neo Yatai lunch schedule page.
 * @param {Object} config - Venue config from config.js
 * @param {string[]} weekDates - Mon-Fri ISO dates for target week
 * @returns {Promise<Array<{date: string, venue_id: string, truck_name_raw: string}>>}
 */
export async function scrape(config, weekDates) {
    const res = await fetch(config.url, FETCH_OPTIONS);
    if (!res.ok) {
        throw new Error(`Neo Yatai fetch failed: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const entries = [];
    const targetDates = new Set(weekDates);

    // 1. Extract dates from tab menu
    const tabDates = [];
    $('.cnt_tabs_menu li').each((_, el) => {
        const text = $(el).text().trim();
        const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})/);
        if (dateMatch) {
            const parsed = parseJapaneseDate(`${dateMatch[1]}/${dateMatch[2]}`);
            tabDates.push(parsed); // may be null if parse fails
        } else {
            tabDates.push(null);
        }
    });

    // 2. Extract vendors from each panel (1:1 with tabs)
    $('.cnt_tabs_inner > li').each((panelIndex, panel) => {
        const date = tabDates[panelIndex];
        if (!date || !targetDates.has(date)) return; // Skip dates outside target range

        const vendors = new Set(); // deduplicate within panel

        $(panel).find('h4').each((_, h4) => {
            const vendorName = $(h4).text().trim();

            // Skip empty, too long, or section headers
            if (!vendorName || vendorName.length === 0 || vendorName.length > 100) return;
            if (SKIP_PATTERNS.some(p => p.test(vendorName))) return;

            // Clean up vendor name (remove fullwidth brackets etc.)
            const cleaned = vendorName.replace(/[｢｣「」]/g, '').trim();
            if (!cleaned) return;

            if (!vendors.has(cleaned)) {
                vendors.add(cleaned);
                entries.push({
                    date,
                    venue_id: config.id,
                    truck_name_raw: cleaned
                });
            }
        });
    });

    // Sanity check
    if (entries.length === 0) {
        console.warn(`⚠ Neo Yatai scraper: 0 entries found. Site structure may have changed.`);
    } else {
        const days = new Set(entries.map(e => e.date));
        console.log(`✓ Neo Yatai: ${entries.length} entries scraped across ${days.size} days`);
    }

    return entries;
}
