/**
 * Scraper for otemachi-foodgarden.com (Kawabata Food Garden).
 * Schedule format: weekly-recurring, organized by day-of-week.
 *
 * Page structure (list page):
 *   <h2>月曜日monday</h2>
 *   <ul>
 *     <li><a href="/list/123">
 *       <img .../>
 *       <h2>Truck Name</h2>
 *     </a></li>
 *     ...
 *   </ul>
 *   <p>他 多数</p>
 *
 * Detail page structure (/list/{id}):
 *   <h1>Truck Name</h1>
 *   <p>Description text...</p>
 *   <h2>menu</h2>
 *   <ul><li>Menu item 1</li>...</ul>
 */

import * as cheerio from 'cheerio';
import { jpDayToDate } from '../lib/dates.js';
import { FETCH_OPTIONS } from '../config.js';

const DAY_PATTERNS = ['月', '火', '水', '木', '金'];
const BASE_URL = 'https://otemachi-foodgarden.com';

/**
 * Fetch a truck's detail page and extract description + menu text.
 * @param {string} detailPath - e.g. "/list/490"
 * @returns {Promise<string>} Combined description + menu text
 */
async function fetchDetailText(detailPath) {
    try {
        const url = detailPath.startsWith('http') ? detailPath : `${BASE_URL}${detailPath}`;
        const res = await fetch(url, FETCH_OPTIONS);
        if (!res.ok) return '';

        const html = await res.text();
        const $ = cheerio.load(html);

        const parts = [];

        // Extract OG description meta tag
        const ogDesc = $('meta[property="og:description"]').attr('content')?.trim();
        if (ogDesc) parts.push(ogDesc);

        // Extract the description paragraph (text after <h1>, before <h2>menu)
        const $h1 = $('h1').first();
        if ($h1.length) {
            // Get text siblings between h1 and the menu heading
            let $next = $h1.next();
            while ($next.length && !($next.is('h2') && $next.text().toLowerCase().includes('menu'))) {
                const text = $next.text().trim();
                if (text && text.length > 0) parts.push(text);
                $next = $next.next();
            }
        }

        // Extract menu item names (text inside the menu <ul> list items)
        $('h2').each((_, el) => {
            const $el = $(el);
            if ($el.text().toLowerCase().includes('menu')) {
                const $menuList = $el.next('ul');
                if ($menuList.length) {
                    $menuList.find('li').each((_, li) => {
                        const text = $(li).text().trim()
                            // Remove price info (e.g., "800円（税込）")
                            .replace(/\d[\d,]*円[（(]税込[）)]/g, '')
                            .trim();
                        if (text && text.length > 0 && !text.includes('メニューイメージ')) {
                            parts.push(text);
                        }
                    });
                }
            }
        });

        return parts.join(' ');
    } catch (err) {
        console.warn(`  ⚠ Failed to fetch detail page ${detailPath}: ${err.message}`);
        return '';
    }
}

/**
 * Scrape the Kawabata food truck list page and detail pages.
 * @param {Object} config - Venue config from config.js
 * @param {string[]} weekDates - Mon-Fri ISO dates for target week
 * @returns {Promise<Array<{date: string, venue_id: string, truck_name_raw: string, detail_text: string}>>}
 */
export async function scrape(config, weekDates) {
    const res = await fetch(config.url, FETCH_OPTIONS);
    if (!res.ok) {
        throw new Error(`Kawabata fetch failed: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Phase 1: Collect all truck entries with their detail page paths
    const rawEntries = []; // {date, venue_id, truck_name_raw, detailPath}
    const detailPaths = new Set(); // unique detail page paths to fetch

    $('h2').each((_, el) => {
        const $el = $(el);
        const text = $el.text().trim();

        // Skip truck name h2s inside <a> tags
        if ($el.closest('a').length > 0) return;

        for (const day of DAY_PATTERNS) {
            if (text.includes(day + '曜')) {
                const currentDay = jpDayToDate(day, weekDates);
                if (!currentDay) return;

                const $ul = $el.nextAll('ul').first();
                if (!$ul.length) return;

                $ul.find('li a').each((_, link) => {
                    const $link = $(link);
                    const href = $link.attr('href') || '';

                    if (!href.match(/\/list\/\d+/)) return;

                    let name = $link.find('h2').first().text().trim();
                    if (!name) {
                        name = $link.find('img').attr('alt')?.trim() || '';
                    }
                    if (!name) {
                        name = $link.text().trim().split('\n')[0].trim();
                    }

                    if (name && name.length > 0 && name.length < 100) {
                        rawEntries.push({
                            date: currentDay,
                            venue_id: config.id,
                            truck_name_raw: name,
                            detailPath: href
                        });
                        detailPaths.add(href);
                    }
                });

                return;
            }
        }
    });

    // Phase 2: Fetch all unique detail pages (with concurrency limit)
    console.log(`  → Fetching ${detailPaths.size} detail pages...`);
    const detailTextMap = new Map(); // detailPath → detail text

    const paths = [...detailPaths];
    const CONCURRENCY = 5;
    for (let i = 0; i < paths.length; i += CONCURRENCY) {
        const batch = paths.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
            batch.map(async (path) => {
                const text = await fetchDetailText(path);
                return { path, text };
            })
        );
        for (const { path, text } of results) {
            detailTextMap.set(path, text);
        }
    }

    // Phase 3: Combine entries with detail text
    const entries = rawEntries.map(raw => ({
        date: raw.date,
        venue_id: raw.venue_id,
        truck_name_raw: raw.truck_name_raw,
        detail_text: detailTextMap.get(raw.detailPath) || ''
    }));

    // Sanity check
    if (entries.length === 0) {
        console.warn(`⚠ Kawabata scraper: 0 entries found. Site structure may have changed.`);
    } else {
        const days = new Set(entries.map(e => e.date));
        const withDetail = entries.filter(e => e.detail_text.length > 0).length;
        console.log(`✓ Kawabata: ${entries.length} entries scraped across ${days.size} days (${withDetail} with detail text)`);
    }

    return entries;
}
