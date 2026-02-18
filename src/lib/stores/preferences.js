import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Persistent view mode store ('map' | 'list').
 */
function createViewMode() {
	const initial = browser ? (localStorage.getItem('viewMode') || 'map') : 'map';
	const { subscribe, set } = writable(initial);

	return {
		subscribe,
		set(value) {
			set(value);
			if (browser) localStorage.setItem('viewMode', value);
		}
	};
}

export const viewMode = createViewMode();

/**
 * Persistent favorites store (Set<string> of truck IDs).
 */
function createFavorites() {
	let initial = new Set();
	if (browser) {
		try {
			const saved = JSON.parse(localStorage.getItem('favorites') || '[]');
			initial = new Set(saved);
		} catch {
			initial = new Set();
		}
	}

	const { subscribe, update, set } = writable(initial);

	function persist(favSet) {
		if (browser) {
			localStorage.setItem('favorites', JSON.stringify([...favSet]));
		}
	}

	return {
		subscribe,
		toggle(truckId) {
			update(favs => {
				const next = new Set(favs);
				if (next.has(truckId)) {
					next.delete(truckId);
				} else {
					next.add(truckId);
				}
				persist(next);
				return next;
			});
		},
		has(truckId) {
			let result = false;
			// Synchronous read via subscribe
			const unsub = subscribe(favs => { result = favs.has(truckId); });
			unsub();
			return result;
		}
	};
}

export const favorites = createFavorites();
