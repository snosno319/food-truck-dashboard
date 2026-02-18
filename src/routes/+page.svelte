<script>
	import { onMount, onDestroy } from "svelte";
	import { browser } from "$app/environment";
	import TruckCard from "$lib/components/TruckCard.svelte";
	import FilterBar from "$lib/components/FilterBar.svelte";
	import MapView from "$lib/components/MapView.svelte";
	import DayPicker from "$lib/components/DayPicker.svelte";
	import SuggestModal from "$lib/components/SuggestModal.svelte";
	import { addToast } from "$lib/stores/toast.js";
	import { viewMode, favorites } from "$lib/stores/preferences.js";
	import {
		selectedDate,
		activeCuisine,
		searchQuery,
		showOpenOnly,
		currentTime,
		createScheduleStores,
	} from "$lib/stores/schedule.js";
	import { buildDays } from "$lib/utils.js";
	import { writable } from "svelte/store";

	export let data;

	let showSuggest = false;
	let showSearch = false;
	let searchInput;
	let timer;

	// Wrap loaded data in a store so derived stores can react to it
	const scheduleData = writable({
		venues: data.schedule.venues,
		trucks: data.schedule.trucks,
		schedule: data.schedule.schedule,
	});

	// Create all derived stores from schedule data
	const {
		truckMap,
		trucksByVenue,
		allTrucksForDate,
		cuisines,
		normalizedSearch,
		venueDisplayData,
		totalVisible,
	} = createScheduleStores(scheduleData);

	// Initialize with a placeholder; will be recalculated on mount with client time
	let days = buildDays(new Date());
	$selectedDate = days[0];

	// Swipe handling for day picker
	let touchStartX = 0;
	let touchStartY = 0;

	function handleTouchStart(e) {
		touchStartX = e.touches[0].clientX;
		touchStartY = e.touches[0].clientY;
	}

	function handleTouchEnd(e) {
		const dx = e.changedTouches[0].clientX - touchStartX;
		const dy = e.changedTouches[0].clientY - touchStartY;
		if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
			const currentIdx = days.indexOf($selectedDate);
			if (dx < 0 && currentIdx < days.length - 1) {
				$selectedDate = days[currentIdx + 1];
			} else if (dx > 0 && currentIdx > 0) {
				$selectedDate = days[currentIdx - 1];
			}
		}
	}

	onMount(() => {
		if (browser) {
			const now = new Date();
			days = buildDays(now);
			$selectedDate = days[0];
			$currentTime = now;

			timer = setInterval(() => {
				$currentTime = new Date();
			}, 60000);
		}
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
	});

	function toggleFavorite(truckId) {
		const wasFav = $favorites.has(truckId);
		favorites.toggle(truckId);
		if (wasFav) {
			addToast("Removed from favorites", "info");
		} else {
			const t = $truckMap.get(truckId);
			addToast(`Added ${t ? t.name : "truck"} to favorites`, "success");
		}
	}

	function toggleSearch() {
		showSearch = !showSearch;
		$searchQuery = "";
		if (showSearch) {
			setTimeout(() => searchInput?.focus(), 100);
		}
	}

	// Auto-reset cuisine filter when switching dates if the active one is no longer available
	$: if ($activeCuisine !== "All" && !$cuisines.includes($activeCuisine)) {
		$activeCuisine = "All";
	}

	// Count of favorites present today
	$: favCountToday = $allTrucksForDate.filter((t) =>
		$favorites.has(t.id),
	).length;

	// Data staleness check — warn if data is >36 hours old
	$: dataAge = (() => {
		const updated = new Date(data.schedule.last_updated);
		const now = $currentTime;
		const hoursOld = (now - updated) / (1000 * 60 * 60);
		return { hoursOld, isStale: hoursOld > 36, updatedDate: updated };
	})();

	function toggleViewMode(mode) {
		if (!document.startViewTransition) {
			$viewMode = mode;
			return;
		}
		document.startViewTransition(() => {
			$viewMode = mode;
		});
	}
</script>

<svelte:head>
	<title>Otemachi Food Truck Schedule</title>
	<meta
		name="description"
		content="Find the best food trucks in Otemachi today."
	/>
</svelte:head>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<section
	class="page-container"
	on:touchstart={handleTouchStart}
	on:touchend={handleTouchEnd}
>
	{#if dataAge.isStale}
		<div class="stale-banner">
			<span class="stale-icon">&#9888;</span>
			<span>Schedule data may be outdated (last updated {Math.round(dataAge.hoursOld)}h ago). Check venue links for latest info.</span>
		</div>
	{/if}

	<div class="controls">
		<div class="top-row">
			<div class="tabs">
				<button
					class:active={$viewMode === "map"}
					on:click={() => toggleViewMode("map")}
				>
					<svg
						viewBox="0 0 24 24"
						width="15"
						height="15"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
						/><circle cx="12" cy="10" r="3" />
					</svg>
					Map
				</button>
				<button
					class:active={$viewMode === "list"}
					on:click={() => toggleViewMode("list")}
				>
					<svg
						viewBox="0 0 24 24"
						width="15"
						height="15"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<line x1="8" y1="6" x2="21" y2="6" /><line
							x1="8"
							y1="12"
							x2="21"
							y2="12"
						/><line x1="8" y1="18" x2="21" y2="18" /><line
							x1="3"
							y1="6"
							x2="3.01"
							y2="6"
						/><line x1="3" y1="12" x2="3.01" y2="12" /><line
							x1="3"
							y1="18"
							x2="3.01"
							y2="18"
						/>
					</svg>
					List
				</button>
			</div>

			<div class="top-actions">
				<button
					class="icon-btn"
					class:active={showSearch}
					on:click={toggleSearch}
					aria-label="Search trucks"
				>
					<svg
						viewBox="0 0 24 24"
						width="18"
						height="18"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<circle cx="11" cy="11" r="8" />
						<path d="m21 21-4.35-4.35" />
					</svg>
				</button>
				<label class="toggle-switch">
					<input type="checkbox" bind:checked={$showOpenOnly} />
					<span class="slider"></span>
					<span class="label-text">Open</span>
				</label>
			</div>
		</div>

		{#if showSearch}
			<div class="search-bar">
				<svg
					class="search-icon"
					viewBox="0 0 24 24"
					width="16"
					height="16"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<circle cx="11" cy="11" r="8" />
					<path d="m21 21-4.35-4.35" />
				</svg>
				<input
					bind:this={searchInput}
					bind:value={$searchQuery}
					type="text"
					placeholder="Search trucks..."
					class="search-input"
				/>
				{#if $searchQuery}
					<button
						class="search-clear"
						on:click={() => ($searchQuery = "")}
					>
						✕
					</button>
				{/if}
			</div>
		{/if}

		<DayPicker
			{days}
			selectedDate={$selectedDate}
			scheduleEntries={data.schedule.schedule}
			on:select={(e) => ($selectedDate = e.detail)}
		/>

		{#if $cuisines.length > 0}
			<FilterBar
				cuisines={$cuisines}
				activeCuisine={$activeCuisine}
				trucks={$allTrucksForDate}
				on:select={(e) => ($activeCuisine = e.detail)}
			/>
		{/if}

		{#if favCountToday > 0}
			<div class="fav-banner">
				<span class="fav-heart-icon">&#9829;</span>
				<span
					>Your favorites: <strong>{favCountToday}</strong>
					truck{favCountToday > 1 ? "s" : ""} today</span
				>
			</div>
		{/if}
	</div>

	{#if $viewMode === "list"}
		<div class="list-content">
			{#if $venueDisplayData.length === 0}
				<div class="empty-state-large">
					<div class="empty-icon">
						{#if $showOpenOnly}
							&#128564;
						{:else}
							&#128722;
						{/if}
					</div>
					<h3 class="empty-title">
						{#if $showOpenOnly}
							All venues are closed right now
						{:else}
							No venues match your filters
						{/if}
					</h3>
					<p class="empty-sub">
						{#if $showOpenOnly}
							Lunch hours are typically 11:00 - 14:00
						{:else}
							Try adjusting your cuisine filter or date
						{/if}
					</p>
					{#if $showOpenOnly}
						<button
							class="reset-btn"
							on:click={() => ($showOpenOnly = false)}
							>Show All Venues</button
						>
					{/if}
				</div>
			{:else if $normalizedSearch && $totalVisible === 0}
				<div class="empty-state-large">
					<div class="empty-icon">&#128269;</div>
					<h3 class="empty-title">No results for "{$searchQuery}"</h3>
					<p class="empty-sub">Try a different name or keyword</p>
					<button
						class="reset-btn"
						on:click={() => ($searchQuery = "")}
						>Clear Search</button
					>
				</div>
			{/if}

			{#each $venueDisplayData as { venue, trucks, filteredTrucks, isOpen } (venue.id)}
				<div
					class="venue-section"
					class:greyed-out={trucks.length === 0}
				>
					<div class="venue-header">
						<div class="venue-title-row">
							<h2>{venue.name_en || venue.name}</h2>
							{#if isOpen}
								<span class="badge open-badge">OPEN</span>
							{:else}
								<span class="badge closed-badge">Closed</span>
							{/if}
						</div>
						<div class="venue-meta">
							<span class="venue-hours">{venue.hours}</span>
							<span class="venue-sep">&middot;</span>
							<span class="venue-address">{venue.address}</span>
							{#if trucks.length > 0}
								<span class="venue-sep">&middot;</span>
								<span class="truck-count"
									>{trucks.length}台</span
								>
							{/if}
						</div>
					</div>

					{#if trucks.length === 0}
						<div class="no-data-card">
							<div class="no-data-icon">&#128203;</div>
							<p>この日の出店情報はありません</p>
							{#if venue.source_url}
								<a
									href={venue.source_url}
									target="_blank"
									rel="noopener noreferrer"
									class="source-link"
								>
									公式サイトで確認 →
								</a>
							{/if}
						</div>
					{:else if filteredTrucks.length > 0}
						<div class="grid">
							{#each filteredTrucks as truck, idx (truck.id)}
								<TruckCard
									{truck}
									isFavorite={$favorites.has(truck.id)}
									venueName={venue.name_en || venue.name}
									animDelay={idx * 40}
									on:toggleFav={(e) =>
										toggleFavorite(e.detail)}
								/>
							{/each}
						</div>
					{:else}
						<p class="empty-msg">
							この条件に合うキッチンカーは本日ありません
						</p>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<div class="map-wrapper">
			<MapView
				venues={data.schedule.venues}
				trucksByVenue={$trucksByVenue}
				activeCuisine={$activeCuisine}
				favorites={$favorites}
				on:toggleFav={(e) => toggleFavorite(e.detail)}
			/>
		</div>
	{/if}

	<footer class="app-footer">
		<p>
			最終更新: {new Date(data.schedule.last_updated).toLocaleString(
				"ja-JP",
				{
					month: "short",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				},
			)}
		</p>
	</footer>

	<button
		class="suggest-fab"
		on:click={() => (showSuggest = true)}
		aria-label="Suggest a Lunch"
	>
		🎲
	</button>

	{#if showSuggest}
		<SuggestModal
			venues={data.schedule.venues}
			trucksByVenue={$trucksByVenue}
			on:close={() => (showSuggest = false)}
		/>
	{/if}
</section>

<style>
	/* Staleness Warning */
	.stale-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 0.75rem;
		background: #fff3cd;
		border: 1px solid #ffc107;
		border-radius: 10px;
		font-size: 0.78rem;
		color: #664d03;
		margin-bottom: 0.5rem;
		animation: slideDown 0.3s ease;
	}

	:global(.dark) .stale-banner {
		background: #332701;
		border-color: #665200;
		color: #ffda6a;
	}

	.stale-icon {
		font-size: 1rem;
		flex-shrink: 0;
	}

	.page-container {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.controls {
		position: sticky;
		top: var(--header-height);
		background: var(--bg);
		z-index: 90;
		padding-top: 1rem;
		padding-bottom: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.controls::after {
		content: "";
		position: absolute;
		bottom: -20px;
		left: 0;
		right: 0;
		height: 20px;
		background: linear-gradient(to bottom, var(--bg), transparent);
		pointer-events: none;
	}

	.top-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.top-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: var(--surface-2);
		color: var(--text-light);
		transition: all 0.2s;
	}

	.icon-btn:hover,
	.icon-btn.active {
		background: var(--text);
		color: var(--surface-1);
	}

	.tabs {
		display: flex;
		gap: 0.25rem;
		background: var(--surface-2);
		padding: 4px;
		border-radius: 12px;
	}

	.tabs button {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 6px 16px;
		border-radius: 8px;
		border: none;
		font-weight: 600;
		font-size: 0.9rem;
		color: var(--text-light);
		transition: all 0.2s;
	}

	.tabs button.active {
		background: var(--surface-1);
		color: var(--text);
		box-shadow: var(--shadow-sm);
	}

	/* Search Bar */
	.search-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: var(--surface-1);
		border: 1.5px solid rgba(0, 0, 0, 0.08);
		border-radius: 12px;
		padding: 0.5rem 0.75rem;
		margin-bottom: 0.75rem;
		animation: slideDown 0.2s ease;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.search-icon {
		color: var(--text-light);
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
		border: none;
		background: transparent;
		font-size: 0.9rem;
		color: var(--text);
		outline: none;
		font-family: inherit;
	}

	.search-input::placeholder {
		color: var(--text-light);
		opacity: 0.6;
	}

	.search-clear {
		color: var(--text-light);
		font-size: 0.8rem;
		padding: 2px 6px;
		border-radius: 50%;
		transition: all 0.15s;
	}

	.search-clear:hover {
		background: var(--surface-2);
		color: var(--text);
	}

	/* Favorites banner */
	.fav-banner {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.75rem;
		background: linear-gradient(135deg, #fff0f3, #fff5f5);
		border-radius: 10px;
		font-size: 0.8rem;
		color: var(--text);
		margin-bottom: 0.25rem;
		animation: slideDown 0.25s ease;
	}

	.fav-heart-icon {
		color: var(--primary);
		font-size: 0.9rem;
	}

	/* Toggle Switch */
	.toggle-switch {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--text);
	}

	.toggle-switch input {
		display: none;
	}

	.slider {
		position: relative;
		width: 40px;
		height: 24px;
		background-color: var(--surface-2);
		border-radius: 20px;
		transition: 0.3s;
	}

	.slider:before {
		content: "";
		position: absolute;
		height: 18px;
		width: 18px;
		left: 3px;
		bottom: 3px;
		background-color: white;
		border-radius: 50%;
		transition: 0.3s;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	input:checked + .slider {
		background-color: var(--success);
	}

	input:checked + .slider:before {
		transform: translateX(16px);
	}

	.list-content {
		padding-bottom: 2rem;
	}

	.venue-section {
		margin-bottom: 2rem;
	}

	.venue-section.greyed-out {
		opacity: 0.5;
	}

	.venue-header {
		margin-bottom: 0.75rem;
	}

	.venue-title-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
	}

	h2 {
		font-size: 1.15rem;
		color: var(--text);
		margin: 0;
	}

	.open-badge {
		background-color: #e6fcf5;
		color: var(--success);
		font-size: 0.65rem;
		letter-spacing: 0.04em;
	}

	.closed-badge {
		background-color: var(--surface-2);
		color: var(--text-light);
	}

	.venue-meta {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.8rem;
		color: var(--text-light);
		flex-wrap: wrap;
	}

	.venue-hours {
		font-size: inherit;
		color: inherit;
	}

	.venue-sep {
		opacity: 0.4;
	}

	.venue-address {
		font-size: inherit;
	}

	.truck-count {
		font-weight: 600;
		color: var(--primary);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--spacing);
	}

	.no-data-card {
		background: var(--surface-2);
		padding: 2rem;
		border-radius: var(--border-radius);
		text-align: center;
		color: var(--text-light);
		border: 1px dashed rgba(0, 0, 0, 0.1);
	}

	.no-data-icon {
		font-size: 1.5rem;
		margin-bottom: 0.5rem;
		opacity: 0.6;
	}

	.source-link {
		display: inline-block;
		margin-top: 1rem;
		color: var(--primary);
		font-weight: 600;
		text-decoration: none;
	}

	.source-link:hover {
		text-decoration: underline;
	}

	.map-wrapper {
		height: calc(100vh - 180px);
		border-radius: var(--border-radius);
		overflow: hidden;
		border: 1px solid rgba(0, 0, 0, 0.05);
		box-shadow: var(--shadow-md);
		position: relative;
	}

	.empty-msg {
		color: var(--text-light);
		font-style: italic;
		background: var(--surface-2);
		padding: 1rem;
		border-radius: 8px;
		text-align: center;
	}

	.app-footer {
		text-align: center;
		padding: 2rem;
		margin-top: auto;
		border-top: 1px solid rgba(0, 0, 0, 0.05);
		background: var(--surface-1);
	}

	.app-footer p {
		font-size: 0.8rem;
		color: var(--text-light);
	}

	.suggest-fab {
		position: fixed;
		bottom: 2rem;
		right: 2rem;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: var(--primary);
		color: white;
		border: none;
		font-size: 1.6rem;
		box-shadow: var(--shadow-lg);
		cursor: pointer;
		z-index: 100;
		transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.suggest-fab:hover {
		transform: scale(1.08) rotate(10deg);
		background: var(--primary-dark);
		box-shadow: 0 8px 28px rgba(255, 56, 92, 0.35);
	}

	.suggest-fab:active {
		transform: scale(0.92);
	}

	/* Improved empty states */
	.empty-state-large {
		text-align: center;
		padding: 4rem 1.5rem;
		color: var(--text-light);
	}

	.empty-icon {
		font-size: 2.5rem;
		margin-bottom: 0.75rem;
		opacity: 0.7;
	}

	.empty-title {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--text);
		margin-bottom: 0.4rem;
	}

	.empty-sub {
		font-size: 0.85rem;
		color: var(--text-light);
		margin-bottom: 1rem;
	}

	.reset-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.5rem 1.25rem;
		border-radius: 999px;
		background: var(--surface-1);
		color: var(--primary);
		font-weight: 600;
		font-size: 0.85rem;
		border: 1.5px solid var(--primary);
		transition: all 0.2s;
	}

	.reset-btn:hover {
		background: var(--primary);
		color: white;
	}
</style>
