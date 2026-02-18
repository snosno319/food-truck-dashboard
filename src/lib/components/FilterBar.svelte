<script>
	export let cuisines = [];
	export let activeCuisine = "All";
	/** @type {Truck[]} */
	export let trucks = [];
	import { createEventDispatcher } from "svelte";
	import { CUISINE_MAP } from "$lib/cuisine.js";

	const dispatch = createEventDispatcher();

	function select(cuisine) {
		dispatch("select", cuisine);
	}

	// Build a reverse lookup: cuisine_label → cuisine key
	// so we can get the emoji for each filter pill
	$: labelToKey = (() => {
		const map = {};
		for (const t of trucks) {
			if (t.cuisine_label && t.cuisine) {
				map[t.cuisine_label] = t.cuisine;
			}
		}
		return map;
	})();

	function getEmoji(cuisineLabel) {
		const key = labelToKey[cuisineLabel];
		if (key && CUISINE_MAP[key]) return CUISINE_MAP[key].emoji;
		return "🚚";
	}
</script>

<div class="filter-bar">
	<button
		class:active={activeCuisine === "All"}
		on:click={() => select("All")}
	>
		All
	</button>
	{#each cuisines as cuisine}
		<button
			class:active={activeCuisine === cuisine}
			on:click={() => select(cuisine)}
		>
			<span class="filter-emoji">{getEmoji(cuisine)}</span>
			{cuisine}
		</button>
	{/each}
</div>

<style>
	.filter-bar {
		display: flex;
		gap: 0.5rem;
		overflow-x: auto;
		padding: 0.25rem 0.25rem 1rem 0.25rem;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}
	.filter-bar::-webkit-scrollbar {
		display: none;
	}

	button {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.45rem 1rem;
		background: var(--surface-1);
		border: 1px solid rgba(0, 0, 0, 0.05);
		border-radius: 999px;
		white-space: nowrap;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--text-light);
		transition: all 0.2s;
		box-shadow: var(--shadow-sm);
	}

	button:hover {
		transform: translateY(-1px);
		box-shadow: var(--shadow-md);
		color: var(--text);
	}

	button.active {
		background: var(--text);
		color: var(--surface-1);
		border-color: var(--text);
		box-shadow: var(--shadow-md);
	}

	.filter-emoji {
		font-size: 0.9rem;
		line-height: 1;
	}
</style>
