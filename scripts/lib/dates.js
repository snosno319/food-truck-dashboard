/**
 * Date utilities for the food truck scraper.
 * All dates are ISO strings (YYYY-MM-DD) in JST context.
 */

const JP_DAYS = ['日', '月', '火', '水', '木', '金', '土'];
const JP_DAY_FULL = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];

/**
 * Get ISO date strings for the next 7 days starting from today.
 * This matches the UI's 7-day picker and ensures we always have data
 * for every day the user can see.
 * @returns {string[]} Array of 7 ISO date strings
 */
export function getCurrentWeekDates() {
    const now = new Date();
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        dates.push(formatDateISO(d));
    }
    return dates;
}

/**
 * Format a Date as YYYY-MM-DD in local timezone (avoids UTC offset issues).
 * @param {Date} d
 * @returns {string}
 */
function formatDateISO(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * Get two weeks of Mon-Fri dates (current + next week).
 * Useful for scraping ahead.
 * @returns {string[]} Array of 10 ISO date strings
 */
export function getTwoWeekDates() {
    const week1 = getCurrentWeekDates();
    const lastDay = new Date(week1[week1.length - 1] + 'T00:00:00');
    const nextMonday = new Date(lastDay);
    nextMonday.setDate(lastDay.getDate() + 3); // Fri + 3 = Mon

    const week2 = [];
    for (let i = 0; i < 5; i++) {
        const d = new Date(nextMonday);
        d.setDate(nextMonday.getDate() + i);
        week2.push(d.toISOString().slice(0, 10));
    }
    return [...week1, ...week2];
}

/**
 * Map a Japanese day-of-week name to an ISO date within the given week dates.
 * @param {string} jpDay - e.g. "月曜日", "月", "Mon"
 * @param {string[]} weekDates - Mon-Fri ISO dates
 * @returns {string|null} ISO date string or null if no match
 */
export function jpDayToDate(jpDay, weekDates) {
    const normalized = jpDay.trim();

    // Try short form: 月, 火, 水, etc.
    let idx = JP_DAYS.indexOf(normalized);
    if (idx === -1) {
        // Try long form: 月曜日, 火曜日, etc.
        idx = JP_DAY_FULL.indexOf(normalized);
    }
    if (idx === -1) {
        // Try extracting first char
        idx = JP_DAYS.indexOf(normalized.charAt(0));
    }

    if (idx === -1) return null;

    // Find a date in weekDates that has the matching day-of-week
    for (const dateStr of weekDates) {
        const d = new Date(dateStr + 'T00:00:00');
        if (d.getDay() === idx) return dateStr;
    }
    return null;
}

/**
 * Parse a Japanese date string into ISO format.
 * Handles: "02/17", "2/17", "2026/02/17", "02/17（月）"
 * @param {string} str - Date string to parse
 * @param {number} [year] - Year to assume if not in string (defaults to current year)
 * @returns {string|null} ISO date string or null
 */
export function parseJapaneseDate(str, year) {
    if (!year) year = new Date().getFullYear();

    // Remove day-of-week annotations like （月）
    const cleaned = str.replace(/[（(].+?[）)]/, '').trim();

    // Match MM/DD or YYYY/MM/DD
    const match = cleaned.match(/^(\d{4})?[/]?(\d{1,2})[/](\d{1,2})$/);
    if (!match) {
        // Try MM/DD without leading year
        const match2 = cleaned.match(/^(\d{1,2})[/](\d{1,2})$/);
        if (match2) {
            const month = match2[1].padStart(2, '0');
            const day = match2[2].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        return null;
    }

    const y = match[1] || year;
    const month = match[2].padStart(2, '0');
    const day = match[3].padStart(2, '0');
    return `${y}-${month}-${day}`;
}

/**
 * Parse a recurring pattern string like "毎週月曜日" into a day-of-week index.
 * @param {string} str - e.g. "毎週月曜日", "毎週火曜"
 * @returns {number|null} Day index (0=Sun..6=Sat) or null
 */
export function parseRecurring(str) {
    if (!str.includes('毎週')) return null;

    // Check for X曜 pattern (e.g., 月曜) to avoid false matches
    // (e.g., "毎週月曜日" contains "日" which would falsely match Sunday)
    for (let i = 0; i < JP_DAYS.length; i++) {
        if (str.includes(JP_DAYS[i] + '曜')) return i;
    }
    return null;
}

/**
 * Expand a recurring day-of-week pattern to concrete dates within the given date range.
 * @param {number} dayIndex - 0=Sun..6=Sat
 * @param {string[]} weekDates - ISO date strings to search within
 * @returns {string[]} Matching dates (0 or more)
 */
export function expandRecurring(dayIndex, weekDates) {
    return weekDates.filter(dateStr => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.getDay() === dayIndex;
    });
}
