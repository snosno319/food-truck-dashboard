<script>
	import { createEventDispatcher } from "svelte";

	/** @type {string[]} */
	export let days = [];
	/** @type {string} */
	export let selectedDate = "";
	/** @type {ScheduleEntry[]} */
	export let scheduleEntries = [];

	const dispatch = createEventDispatcher();

	const JP_WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

	function formatDay(dateStr, index) {
		const d = new Date(dateStr + "T00:00:00");
		const weekday = JP_WEEKDAYS[d.getDay()];
		const month = d.getMonth() + 1;
		const day = d.getDate();
		const count = scheduleEntries.filter((e) => e.date === dateStr).length;
		return {
			label: `${month}/${day}`,
			weekday,
			isToday: index === 0,
			isWeekend: d.getDay() === 0 || d.getDay() === 6,
			truckCount: count,
		};
	}

	function select(dateStr) {
		dispatch("select", dateStr);
	}
</script>

<div class="day-picker">
	{#each days as dateStr, i}
		{@const info = formatDay(dateStr, i)}
		<button
			class:active={selectedDate === dateStr}
			class:weekend={info.isWeekend}
			class:no-data={info.truckCount === 0}
			on:click={() => select(dateStr)}
		>
			{#if info.isToday}<span class="today-label">今日</span>{/if}
			<span class="weekday">{info.weekday}</span>
			<span class="date">{info.label}</span>
			{#if info.truckCount > 0}
				<span class="count">{info.truckCount}台</span>
			{:else}
				<span class="count empty">—</span>
			{/if}
		</button>
	{/each}
</div>

<style>
	.day-picker {
		display: flex;
		gap: 0.4rem;
		overflow-x: auto;
		padding: 0.5rem 0;
		scrollbar-width: none;
		-ms-overflow-style: none;
		margin-bottom: 0.25rem;
	}
	.day-picker::-webkit-scrollbar {
		display: none;
	}

	button {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1px;
		padding: 0.5rem 0.65rem;
		background: var(--surface-1);
		border: 1.5px solid rgba(0, 0, 0, 0.1);
		border-radius: 12px;
		white-space: nowrap;
		transition: all 0.2s;
		min-width: 56px;
		position: relative;
	}

	button.active {
		background: var(--text);
		color: var(--surface-1);
		border-color: var(--text);
	}

	button.weekend:not(.active) {
		opacity: 0.6;
	}

	button.no-data:not(.active) {
		opacity: 0.45;
		border-style: dashed;
	}

	button.active .today-label {
		color: var(--surface-1);
		opacity: 0.9;
	}

	.today-label {
		font-size: 0.55rem;
		font-weight: 700;
		color: var(--primary);
		line-height: 1;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	.weekday {
		font-size: 0.7rem;
		font-weight: 600;
		line-height: 1;
	}

	.date {
		font-size: 0.85rem;
		font-weight: 700;
		line-height: 1.2;
	}

	.count {
		font-size: 0.6rem;
		font-weight: 500;
		color: var(--text-light);
		line-height: 1;
		margin-top: 1px;
	}

	.count.empty {
		opacity: 0.4;
	}

	button.active .count {
		color: var(--surface-1);
		opacity: 0.8;
	}

	button.active .weekday {
		color: var(--surface-1);
		opacity: 0.9;
	}
</style>
