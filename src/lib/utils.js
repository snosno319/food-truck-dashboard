/**
 * Shared utility functions used across components and stores.
 */

/**
 * Check if a venue is currently open based on its hours string.
 * @param {string} hoursStr - e.g. "11:00-14:00"
 * @param {Date} [now] - Current time (defaults to new Date())
 * @returns {boolean}
 */
export function isVenueOpen(hoursStr, now = new Date()) {
	if (!hoursStr) return false;
	const [start, end] = hoursStr.split('-').map(t => t.trim());
	if (!start || !end) return false;
	const [sH, sM] = start.split(':').map(Number);
	const [eH, eM] = end.split(':').map(Number);
	const startTime = new Date(now);
	startTime.setHours(sH, sM, 0, 0);
	const endTime = new Date(now);
	endTime.setHours(eH, eM, 0, 0);
	return now >= startTime && now <= endTime;
}

/**
 * Build a Google Maps walking directions URL for a venue.
 * @param {{lat: number, lng: number}} venue
 * @returns {string}
 */
export function getDirectionsUrl(venue) {
	return `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}&travelmode=walking`;
}

/**
 * Build an array of N ISO date strings starting from a given date, in local timezone.
 * @param {Date} from - Start date
 * @param {number} [count=7] - Number of days
 * @returns {string[]} ISO date strings (YYYY-MM-DD)
 */
export function buildDays(from, count = 7) {
	return Array.from({ length: count }, (_, i) => {
		const d = new Date(from);
		d.setDate(d.getDate() + i);
		const yyyy = d.getFullYear();
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${yyyy}-${mm}-${dd}`;
	});
}
