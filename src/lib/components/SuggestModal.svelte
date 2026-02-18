<script>
	import { createEventDispatcher } from "svelte";
	import { isVenueOpen, getDirectionsUrl } from "$lib/utils.js";

	/** @type {import('../types').Venue[]} */
	export let venues = [];
	/** @type {Map<string, import('../types').Truck[]>} */
	export let trucksByVenue = new Map();

	const dispatch = createEventDispatcher();

	// Steps: 'choose' | 'mood' | 'spinning' | 'result'
	let step = "choose";
	let selectedMood = "";
	let result = null;

	/**
	 * Mood-based cuisine matching.
	 * Uses cuisine *keys* (from CUISINE_MAP) for reliable matching,
	 * not display labels which can change or be localized.
	 */
	const MOODS = [
		{
			key: "heavy",
			label: "ガッツリ",
			emoji: "🍖",
			cuisineKeys: ["japanese", "meat", "curry", "chicken", "pork", "korean", "chinese"],
		},
		{
			key: "light",
			label: "あっさり",
			emoji: "🥗",
			cuisineKeys: ["hawaiian", "asian", "vietnamese", "bread"],
		},
		{
			key: "spicy",
			label: "辛いもの",
			emoji: "🌶️",
			cuisineKeys: ["curry", "korean", "asian"],
		},
		{ key: "adventure", label: "冒険したい", emoji: "🎲", cuisineKeys: [] },
	];

	function getAllTrucksWithVenue() {
		const items = [];
		for (const venue of venues) {
			const trucks = trucksByVenue.get(venue.id) || [];
			const isOpen = isVenueOpen(venue.hours);
			for (const truck of trucks) {
				items.push({ truck, venue, isOpen });
			}
		}
		return items;
	}


	function pickRandom(items) {
		if (items.length === 0) return null;
		return items[Math.floor(Math.random() * items.length)];
	}

	function startRoulette() {
		step = "spinning";
		const all = getAllTrucksWithVenue();
		setTimeout(() => {
			result = pickRandom(all);
			step = "result";
		}, 800);
	}

	function startGuided() {
		step = "mood";
	}

	function selectMood(mood) {
		selectedMood = mood.key;
		step = "spinning";

		const all = getAllTrucksWithVenue();
		let filtered;

		if (mood.key === "adventure" || mood.cuisineKeys.length === 0) {
			filtered = all;
		} else {
			const keys = new Set(mood.cuisineKeys);
			filtered = all.filter((item) => keys.has(item.truck.cuisine));
		}

		// Prefer open venues if possible
		const openOnes = filtered.filter((i) => i.isOpen);
		if (openOnes.length > 0) {
			filtered = openOnes;
		}

		// If no open matches, fall back to all matching (even closed)
		if (filtered.length === 0 && mood.key !== "adventure") {
			const keys = new Set(mood.cuisineKeys);
			filtered = all.filter((item) => keys.has(item.truck.cuisine));
		}

		setTimeout(() => {
			result = pickRandom(filtered);
			step = "result";
		}, 800);
	}

	function retry() {
		result = null;
		selectedMood = "";
		step = "choose";
	}

	function close() {
		dispatch("close");
	}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="overlay" on:click|self={close}>
	<div class="modal">
		<button class="close-btn" on:click={close}>✕</button>

		{#if step === "choose"}
			<div class="modal-body choose">
				<h2>今日のランチ、どうする？</h2>
				<button class="action-btn roulette" on:click={startRoulette}>
					<span class="btn-emoji">🎰</span>
					<span class="btn-text">おまかせ！</span>
					<span class="btn-sub">ランダムに選ぶ</span>
				</button>
				<button class="action-btn guided" on:click={startGuided}>
					<span class="btn-emoji">🧭</span>
					<span class="btn-text">気分で選ぶ</span>
					<span class="btn-sub">質問に答えて提案</span>
				</button>
			</div>
		{:else if step === "mood"}
			<div class="modal-body mood">
				<h2>今日の気分は？</h2>
				<div class="mood-grid">
					{#each MOODS as mood}
						<button
							class="mood-btn"
							on:click={() => selectMood(mood)}
						>
							<span class="mood-emoji">{mood.emoji}</span>
							<span class="mood-label">{mood.label}</span>
						</button>
					{/each}
				</div>
				<button class="back-link" on:click={retry}>← 戻る</button>
			</div>
		{:else if step === "spinning"}
			<div class="modal-body spinning">
				<div class="spinner">🎰</div>
				<p>選んでいます...</p>
			</div>
		{:else if step === "result"}
			<div class="modal-body result">
				{#if result}
					<p class="result-label">今日のおすすめ</p>
					<h2 class="result-name">{result.truck.name}</h2>
					<span class="result-badge"
						>{result.truck.cuisine_label}</span
					>
					<div class="result-venue">
						<p class="venue-name">📍 {result.venue.name}</p>
						<p class="venue-hours">
							⏰ {result.venue.hours}
							{#if !result.isOpen}
								<span class="closed-warning">(Closed now)</span>
							{/if}
						</p>
					</div>
					{#if result.truck.url}
						<a
							href={result.truck.url}
							target="_blank"
							rel="noopener noreferrer"
							class="detail-link"
						>
							詳細を見る →
						</a>
					{/if}
					<a
						href={getDirectionsUrl(result.venue)}
						target="_blank"
						rel="noopener noreferrer"
						class="directions-btn"
					>
						🚶 ここへ行く（Google Maps）
					</a>
				{:else}
					<p class="no-result">今日は出店情報がありません 😢</p>
				{/if}
				<button class="retry-btn" on:click={retry}>もう一度</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 1rem;
	}

	.modal {
		background: var(--surface-1);
		border-radius: 16px;
		padding: 1.5rem;
		max-width: 380px;
		width: 100%;
		position: relative;
		max-height: 90vh;
		overflow-y: auto;
	}

	.close-btn {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		background: none;
		border: none;
		font-size: 1.2rem;
		color: var(--text-light);
		cursor: pointer;
		padding: 0.25rem;
		line-height: 1;
	}

	.modal-body {
		text-align: center;
	}

	h2 {
		font-size: 1.2rem;
		margin-bottom: 1.25rem;
		color: var(--text);
	}

	/* Choose step */
	.action-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		padding: 1rem;
		border: 2px solid var(--border);
		border-radius: 12px;
		background: var(--surface-1);
		margin-bottom: 0.75rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.action-btn:hover {
		border-color: var(--primary);
		background: var(--surface-2);
	}

	.btn-emoji {
		font-size: 1.5rem;
		margin-bottom: 0.25rem;
	}

	.btn-text {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text);
	}

	.btn-sub {
		font-size: 0.75rem;
		color: var(--text-light);
		margin-top: 0.15rem;
	}

	/* Mood step */
	.mood-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.mood-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 1rem 0.5rem;
		border: 2px solid var(--border);
		border-radius: 12px;
		background: var(--surface-1);
		cursor: pointer;
		transition: all 0.2s;
	}

	.mood-btn:hover {
		border-color: var(--primary);
		background: var(--surface-2);
	}

	.mood-emoji {
		font-size: 1.5rem;
	}

	.mood-label {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text);
	}

	.back-link {
		background: none;
		border: none;
		color: var(--text-light);
		font-size: 0.85rem;
		cursor: pointer;
	}

	/* Spinning step */
	.spinning {
		padding: 2rem 0;
	}

	.spinner {
		font-size: 3rem;
		animation: spin 0.6s linear infinite;
	}

	.spinning p {
		margin-top: 1rem;
		color: var(--text-light);
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	/* Result step */
	.result-label {
		font-size: 0.8rem;
		color: var(--text-light);
		margin-bottom: 0.25rem;
	}

	.result-name {
		font-size: 1.4rem;
		margin-bottom: 0.5rem;
	}

	.result-badge {
		display: inline-block;
		background: var(--primary);
		color: var(--surface-1);
		padding: 0.2rem 0.6rem;
		border-radius: 20px;
		font-size: 0.75rem;
		font-weight: 600;
		margin-bottom: 1rem;
	}

	.result-venue {
		background: var(--surface-2);
		padding: 0.75rem;
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	.venue-name {
		font-weight: 600;
		font-size: 0.9rem;
		color: var(--text);
	}

	.venue-hours {
		font-size: 0.8rem;
		color: var(--text-light);
		margin-top: 0.25rem;
	}

	.closed-warning {
		color: var(--danger);
		font-weight: bold;
		margin-left: 0.5rem;
		font-size: 0.75rem;
	}

	.detail-link {
		display: block;
		font-size: 0.85rem;
		color: var(--text-light);
		margin-bottom: 0.75rem;
		text-decoration: none;
		border-bottom: 1px dotted var(--text-light);
		width: fit-content;
		margin-left: auto;
		margin-right: auto;
	}

	.detail-link:hover {
		color: var(--primary);
		border-color: var(--primary);
	}

	.directions-btn {
		display: block;
		width: 100%;
		padding: 0.75rem;
		background: var(--primary);
		color: var(--surface-1);
		border: none;
		border-radius: 50px;
		font-size: 0.95rem;
		font-weight: 600;
		text-align: center;
		text-decoration: none;
		transition: opacity 0.2s;
		margin-bottom: 0.75rem;
	}

	.directions-btn:hover {
		opacity: 0.9;
	}

	.no-result {
		padding: 2rem 0;
		color: var(--text-light);
		font-size: 1.1rem;
	}

	.retry-btn {
		background: none;
		border: 1px solid var(--border);
		border-radius: 20px;
		padding: 0.5rem 1.25rem;
		color: var(--text-light);
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.retry-btn:hover {
		border-color: var(--text);
		color: var(--text);
	}
</style>
