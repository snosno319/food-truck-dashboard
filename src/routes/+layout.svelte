<script>
	import "../app.css";
	import { onMount } from "svelte";
	import { browser } from "$app/environment";
	import Toast from "$lib/components/Toast.svelte";

	let dark = false;

	onMount(() => {
		if (browser) {
			// Check saved preference, fallback to system preference
			const saved = localStorage.getItem("theme");
			if (saved === "dark") {
				dark = true;
			} else if (saved === "light") {
				dark = false;
			} else {
				dark = window.matchMedia(
					"(prefers-color-scheme: dark)",
				).matches;
			}
			applyTheme();
		}
	});

	function toggleTheme() {
		dark = !dark;
		applyTheme();
		if (browser) {
			localStorage.setItem("theme", dark ? "dark" : "light");
		}
	}

	function applyTheme() {
		if (browser) {
			document.documentElement.classList.toggle("dark", dark);
		}
	}
</script>

<div class="app-shell">
	<header>
		<div class="container header-content">
			<h1>Otemachi Eats</h1>
			<button
				class="theme-toggle"
				on:click={toggleTheme}
				aria-label={dark
					? "Switch to light mode"
					: "Switch to dark mode"}
			>
				{#if dark}
					<svg
						viewBox="0 0 24 24"
						width="20"
						height="20"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<circle cx="12" cy="12" r="5" />
						<path
							d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
						/>
					</svg>
				{:else}
					<svg
						viewBox="0 0 24 24"
						width="20"
						height="20"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
						/>
					</svg>
				{/if}
			</button>
		</div>
	</header>

	<main class="container">
		<slot />
	</main>

	<footer>
		<div class="container">
			<p>© 2026 Otemachi Eats</p>
		</div>
	</footer>
</div>

<Toast />

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	header {
		background: var(--glass-bg);
		backdrop-filter: var(--glass);
		-webkit-backdrop-filter: var(--glass);
		border-bottom: 1px solid var(--border);
		position: sticky;
		top: 0;
		z-index: 100;
		height: var(--header-height);
		display: flex;
		align-items: center;
	}

	.header-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--text);
		letter-spacing: -0.03em;
	}

	.theme-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--surface-2);
		color: var(--text);
		transition: all 0.2s;
	}

	.theme-toggle:hover {
		background: var(--border);
		transform: rotate(15deg);
	}

	main {
		flex: 1;
		padding-bottom: 4rem;
	}

	footer {
		text-align: center;
		padding: 3rem 0;
		color: var(--text-light);
		font-size: 0.9rem;
		border-top: 1px solid var(--border);
		background: var(--surface-1);
	}
</style>
