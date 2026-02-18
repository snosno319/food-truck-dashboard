import { scrape } from './scrapers/mellow.js';
import { VENUES } from './config.js';

async function test() {
    const config = VENUES['otemachi-one'];
    console.log('Testing config:', config);

    // Mock week dates (next 5 days)
    const weekDates = [
        '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20'
    ];

    try {
        const fs = (await import('node:fs'));
        const res = await fetch(config.url);
        const html = await res.text();
        fs.writeFileSync('debug_otemachi_one.html', html);
        console.log('Saved HTML to debug_otemachi_one.html');

        const results = await scrape(config, weekDates);
        console.log('Results:', JSON.stringify(results, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
