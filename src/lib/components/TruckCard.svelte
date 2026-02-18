<script>
	import { createEventDispatcher } from "svelte";
	import { getCuisine } from "$lib/cuisine.js";
	import HeartIcon from "./HeartIcon.svelte";

	/** @type {Truck} */
	export let truck;
	/** @type {boolean} */
	export let isFavorite = false;
	/** @type {string} */
	export let venueName = "";
	/** @type {number} */
	export let animDelay = 0;

	const dispatch = createEventDispatcher();

	$: cuisine = getCuisine(truck.cuisine);

	function toggleFav(e) {
		e.stopPropagation();
		dispatch("toggleFav", truck.id);
	}
</script>

<article class="truck-card" style="animation-delay: {animDelay}ms">
	<div class="card-hero" style="background: {cuisine.gradient}">
		<div class="hero-content">
			<span class="cuisine-emoji">{cuisine.emoji}</span>
			<button
				class="fav-btn"
				class:is-fav={isFavorite}
				on:click={toggleFav}
				aria-label={isFavorite
					? "Remove from favorites"
					: "Add to favorites"}
			>
				<HeartIcon filled={isFavorite} size={20} />
			</button>
		</div>
	</div>

	<div class="card-body">
		<div class="card-header">
			<h3>{truck.name}</h3>
			<div class="meta-row">
				<span class="cuisine-label">{truck.cuisine_label}</span>
				{#if venueName}
					<span class="separator">•</span>
					<span class="venue-name">{venueName}</span>
				{/if}
			</div>
		</div>

		<div class="card-actions">
			{#if truck.url}
				<a
					href={truck.url}
					target="_blank"
					rel="noopener noreferrer"
					class="action-btn"
				>
					詳細を見る
				</a>
			{/if}
			{#if truck.contact_instagram}
				<a
					href={truck.contact_instagram}
					target="_blank"
					rel="noopener noreferrer"
					class="icon-link"
					aria-label="Instagram"
				>
					📷
				</a>
			{/if}
		</div>

		{#if truck.accepts_preorder}
			<div class="badge-container">
				<span class="badge preorder">予約可</span>
			</div>
		{/if}
	</div>
</article>

<style>
	.truck-card {
		background: var(--surface-1);
		border-radius: var(--border-radius);
		box-shadow: var(--shadow-sm);
		overflow: hidden;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
		animation: cardFadeIn 0.4s ease-out both;
		display: flex;
		flex-direction: column;
		height: 100%;
		border: 1px solid var(--border);
	}

	.truck-card:hover {
		transform: translateY(-4px);
		box-shadow: var(--shadow-md);
	}

	.card-hero {
		height: 140px;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.hero-content {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		padding: 0.75rem;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.cuisine-emoji {
		font-size: 3rem;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
		margin: auto; /* Center in hero */
	}

	.fav-btn {
		background: var(--surface-1);
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: var(--shadow-sm);
		color: var(--text-light);
		transition: all 0.2s;
		position: absolute;
		top: 10px;
		right: 10px;
	}

	.fav-btn:hover {
		transform: scale(1.1);
		color: var(--primary);
	}

	.fav-btn.is-fav {
		color: var(--danger);
	}

	.card-body {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		flex: 1;
	}

	h3 {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text);
		margin-bottom: 0.25rem;
		line-height: 1.4;
	}

	.meta-row {
		display: flex;
		align-items: center;
		font-size: 0.85rem;
		color: var(--text-light);
		gap: 0.5rem;
	}

	.separator {
		font-size: 0.6rem;
		opacity: 0.5;
	}

	.card-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: auto;
		padding-top: 0.75rem;
	}

	.action-btn {
		flex: 1;
		background: var(--surface-2);
		color: var(--text);
		text-align: center;
		padding: 0.5rem;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 500;
		transition: background 0.2s;
	}

	.action-btn:hover {
		background: var(--border);
	}

	.icon-link {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface-2);
		border-radius: 8px;
		font-size: 1.1rem;
		transition: background 0.2s;
	}

	.icon-link:hover {
		background: var(--border);
	}

	.badge-container {
		position: absolute;
		top: 10px;
		left: 10px;
	}

	.badge.preorder {
		background: var(--surface-1);
		color: var(--accent);
		padding: 0.25rem 0.6rem;
		border-radius: 99px;
		font-size: 0.75rem;
		font-weight: 600;
		box-shadow: var(--shadow-sm);
	}

	@keyframes cardFadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
