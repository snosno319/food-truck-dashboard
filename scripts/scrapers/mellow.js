/**
 * Scraper for mellow.jp (SHOP STOP) market pages.
 *
 * Page structure (market detail e.g. /ss_web/markets/G7TyQW):
 *   - Venue info: name, address, hours, coordinates (in "地図で確認する" link)
 *   - "キッチンカー定期出店スケジュール" section: recurring schedule cards
 *     Each card is an <a href="/ss_web/shops/{ID}"> containing:
 *       - Day pattern text like "毎週月曜日"
 *       - Shop name
 *       - Menu description
 *       - Time range
 *       - Next date info
 *   - Also has single-date event entries with specific dates
 *
 * Shop detail page (e.g. /ss_web/shops/pMSZjb):
 *   - Shop name, description, cuisine info, menu items
 *   - Used to detect cuisine for unknown trucks
 *
 * Strategy:
 *   1. Fetch market page, parse all schedule entries
 *   2. Extract day + shop name + shop URL from each card
 *   3. For new/unknown trucks, fetch shop detail page for cuisine detection
 */

import * as cheerio from 'cheerio';
import { parseRecurring, expandRecurring } from '../lib/dates.js';
import { FETCH_OPTIONS } from '../config.js';

const BASE_URL = 'https://www.mellow.jp';

/**
 * Extract the shop name from the card's structured HTML.
 * Mellow cards have: <div class="card-title fw-bold">ShopName</div>
 * Falls back to text-based extraction if the HTML structure isn't found.
 * @param {import('cheerio').Cheerio} $el - The <a> element wrapping the card
 * @param {import('cheerio').CheerioAPI} $ - Cheerio instance
 * @returns {string} Extracted shop name
 */
function extractShopName($el, $) {
    // Primary: use the structured card-title element
    const cardTitle = $el.find('.card-title').first().text().trim();
    if (cardTitle && cardTitle.length >= 2) {
        return cardTitle;
    }

    // Fallback: strip known patterns from the concatenated text
    let s = $el.text().trim();
    s = s.replace(/^毎週[日月火水木金土]曜日/, '');
    s = s.replace(/^\d{4}\/\d{1,2}\/\d{1,2}/, '');
    s = s.replace(/^\d{1,2}\/\d{1,2}/, '');
    s = s.replace(/\d{1,2}:\d{2}\s*[〜～~]\s*\d{1,2}:\d{2}/, '');
    s = s.replace(/次回出店\s*\d{1,2}月\d{1,2}日/, '');
    s = s.replace(/次回出店\s*\d{4}\/\d{1,2}\/\d{1,2}/, '');
    return s.trim();
}

/**
 * Fetch a shop detail page and extract cuisine-related text.
 * @param {string} shopPath - e.g. "/ss_web/shops/pMSZjb"
 * @returns {Promise<string>} Combined text for cuisine detection
 */
async function fetchShopDetail(shopPath) {
    try {
        const url = shopPath.startsWith('http') ? shopPath : `${BASE_URL}${shopPath}`;
        const res = await fetch(url, FETCH_OPTIONS);
        if (!res.ok) return '';

        const html = await res.text();
        const $ = cheerio.load(html);

        // Gather all text content — the page has cuisine info in description,
        // menu items, and genre labels
        const textParts = [];

        // Page title / heading
        textParts.push($('h1').text());
        textParts.push($('h2').text());

        // Description text
        $('p').each((_, el) => {
            const t = $(el).text().trim();
            if (t.length > 10 && t.length < 500) textParts.push(t);
        });

        // Menu item names
        $('h3, h4').each((_, el) => {
            textParts.push($(el).text().trim());
        });

        // Genre/category labels - look for list items, badges, tags
        $('li, span, div').each((_, el) => {
            const t = $(el).text().trim();
            if (t.length > 2 && t.length < 60) textParts.push(t);
        });

        return textParts.join(' ');
    } catch (err) {
        console.warn(`  ⚠ Could not fetch shop detail ${shopPath}: ${err.message}`);
        return '';
    }
}

/**
 * Scrape a SHOP STOP market schedule page.
 * @param {Object} config - Venue config from config.js
 * @param {string[]} weekDates - Mon-Fri ISO dates for target week
 * @returns {Promise<Array<{date: string, venue_id: string, truck_name_raw: string, shop_path?: string, detail_text?: string}>>}
 */
export async function scrape(config, weekDates) {
    const res = await fetch(config.url, FETCH_OPTIONS);
    if (!res.ok) {
        throw new Error(`Mellow fetch failed for ${config.id}: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const rawEntries = [];
    const targetDates = new Set(weekDates);

    // Find all shop links (skip /menus/ subpage links)
    $('a[href*="/ss_web/shops/"]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href') || '';

        // Skip menu subpage links like /ss_web/shops/xxx/menus/yyy
        if (href.includes('/menus/')) return;

        const fullText = $el.text().trim();
        if (!fullText || fullText.length < 5) return;

        // Extract the shop name from structured HTML (not concatenated text)
        const rawName = extractShopName($el, $);
        if (!rawName || rawName.length < 2) return;

        // Extract shop path for detail fetching
        const shopPath = href.startsWith('/') ? href : `/${href}`;

        // Determine the date(s) for this entry

        // Check for recurring pattern: "毎週X曜日"
        const recurringMatch = fullText.match(/毎週([日月火水木金土])曜/);
        if (recurringMatch) {
            const dayIndex = parseRecurring(`毎週${recurringMatch[1]}曜日`);
            if (dayIndex !== null) {
                const dates = expandRecurring(dayIndex, weekDates);
                for (const date of dates) {
                    rawEntries.push({
                        date,
                        venue_id: config.id,
                        truck_name_raw: rawName,
                        shop_path: shopPath
                    });
                }
                return;
            }
        }

        // Check for specific date patterns: "YYYY/MM/DD"
        const dateMatch = fullText.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
        if (dateMatch) {
            const y = dateMatch[1];
            const m = dateMatch[2].padStart(2, '0');
            const d = dateMatch[3].padStart(2, '0');
            const parsed = `${y}-${m}-${d}`;
            if (targetDates.has(parsed)) {
                rawEntries.push({
                    date: parsed,
                    venue_id: config.id,
                    truck_name_raw: rawName,
                    shop_path: shopPath
                });
            }
            return;
        }

        // Check for "M/D" date format (without year)
        const shortDateMatch = fullText.match(/^(\d{1,2})\/(\d{1,2})/);
        if (shortDateMatch) {
            const year = new Date().getFullYear();
            const m = shortDateMatch[1].padStart(2, '0');
            const d = shortDateMatch[2].padStart(2, '0');
            const parsed = `${year}-${m}-${d}`;
            if (targetDates.has(parsed)) {
                rawEntries.push({
                    date: parsed,
                    venue_id: config.id,
                    truck_name_raw: rawName,
                    shop_path: shopPath
                });
            }
            return;
        }

        // Check for "次回出店 X月Y日"
        const nextMatch = fullText.match(/次回出店\s*(\d{1,2})月(\d{1,2})日/);
        if (nextMatch) {
            const year = new Date().getFullYear();
            const month = nextMatch[1].padStart(2, '0');
            const day = nextMatch[2].padStart(2, '0');
            const parsed = `${year}-${month}-${day}`;
            if (targetDates.has(parsed)) {
                rawEntries.push({
                    date: parsed,
                    venue_id: config.id,
                    truck_name_raw: rawName,
                    shop_path: shopPath
                });
            }
        }
    });

    // Deduplicate (same truck + same date)
    const seen = new Set();
    const deduped = rawEntries.filter((e) => {
        const key = `${e.date}|${e.truck_name_raw}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Fetch shop detail pages for cuisine detection
    // Collect unique shop paths
    const shopPaths = [...new Set(deduped.map(e => e.shop_path).filter(Boolean))];
    const shopDetails = new Map();

    if (shopPaths.length > 0) {
        console.log(`  → Fetching ${shopPaths.length} shop detail pages for cuisine detection...`);

        // Fetch in batches of 5
        for (let i = 0; i < shopPaths.length; i += 5) {
            const batch = shopPaths.slice(i, i + 5);
            const results = await Promise.allSettled(
                batch.map(async (path) => {
                    const detail = await fetchShopDetail(path);
                    return { path, detail };
                })
            );
            for (const r of results) {
                if (r.status === 'fulfilled') {
                    shopDetails.set(r.value.path, r.value.detail);
                }
            }
            // Small delay between batches
            if (i + 5 < shopPaths.length) {
                await new Promise(r => setTimeout(r, 300));
            }
        }
    }

    // Attach detail_text to entries
    const entries = deduped.map(e => ({
        date: e.date,
        venue_id: e.venue_id,
        truck_name_raw: e.truck_name_raw,
        detail_text: shopDetails.get(e.shop_path) || ''
    }));

    if (entries.length === 0) {
        console.warn(`⚠ Mellow scraper (${config.id}): 0 entries found. Site structure may have changed.`);
    } else {
        console.log(`✓ Mellow (${config.id}): ${entries.length} entries scraped`);
    }

    return entries;
}
