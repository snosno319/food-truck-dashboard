import { writable, derived } from 'svelte/store';
import { isVenueOpen } from '$lib/utils.js';

/** Selected date (ISO string) */
export const selectedDate = writable('');

/** Active cuisine filter label */
export const activeCuisine = writable('All');

/** Search query */
export const searchQuery = writable('');

/** "Open now" toggle */
export const showOpenOnly = writable(false);

/** Current time (updated by page onMount interval) */
export const currentTime = writable(new Date());

/**
 * Create derived schedule stores from loaded data.
 * Call this once from +page.svelte with the loaded data to wire up all derived state.
 *
 * @param {import('svelte/store').Readable<{venues: any[], trucks: any[], schedule: any[]}>} dataStore
 */
export function createScheduleStores(dataStore) {
	/** Lookup map: truck_id → Truck */
	const truckMap = derived(dataStore, $data =>
		new Map($data.trucks.map(t => [t.id, t]))
	);

	/** Schedule entries for the selected date */
	const todaySchedule = derived(
		[dataStore, selectedDate],
		([$data, $date]) => $data.schedule.filter(e => e.date === $date)
	);

	/** Trucks grouped by venue_id for the selected date */
	const trucksByVenue = derived(
		[todaySchedule, truckMap],
		([$today, $map]) => {
			const grouped = new Map();
			for (const entry of $today) {
				const truck = $map.get(entry.truck_id);
				if (!truck) continue;
				if (!grouped.has(entry.venue_id)) {
					grouped.set(entry.venue_id, []);
				}
				grouped.get(entry.venue_id).push(truck);
			}
			return grouped;
		}
	);

	/** Flat list of all trucks for the selected date */
	const allTrucksForDate = derived(trucksByVenue, $byVenue =>
		[...$byVenue.values()].flat()
	);

	/** Available cuisine labels for the selected date */
	const cuisines = derived(allTrucksForDate, $trucks =>
		[...new Set($trucks.map(t => t.cuisine_label))].sort()
	);

	/** Normalized search query */
	const normalizedSearch = derived(searchQuery, $q => $q.toLowerCase().trim());

	/** Full venue display data with filtering applied */
	const venueDisplayData = derived(
		[dataStore, trucksByVenue, activeCuisine, normalizedSearch, showOpenOnly, currentTime],
		([$data, $byVenue, $cuisine, $search, $openOnly, $now]) => {
			return $data.venues
				.map(v => {
					const venueTrucks = $byVenue.get(v.id) || [];

					let filteredTrucks = $cuisine === 'All'
						? venueTrucks
						: venueTrucks.filter(t => t.cuisine_label === $cuisine);

					if ($search) {
						filteredTrucks = filteredTrucks.filter(t =>
							t.name.toLowerCase().includes($search) ||
							t.cuisine_label.toLowerCase().includes($search) ||
							(t.id && t.id.toLowerCase().includes($search))
						);
					}

					const isOpen = isVenueOpen(v.hours, $now);
					return { venue: v, trucks: venueTrucks, filteredTrucks, isOpen };
				})
				.filter(d => $openOnly ? d.isOpen : true);
		}
	);

	/** Total visible trucks after all filters */
	const totalVisible = derived(venueDisplayData, $data =>
		$data.reduce((n, d) => n + d.filteredTrucks.length, 0)
	);

	return {
		truckMap,
		todaySchedule,
		trucksByVenue,
		allTrucksForDate,
		cuisines,
		normalizedSearch,
		venueDisplayData,
		totalVisible
	};
}
