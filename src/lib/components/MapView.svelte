<script>
    import { onMount, onDestroy } from "svelte";
    import { browser } from "$app/environment";
    import { createEventDispatcher } from "svelte";
    import { getCuisine, CUISINE_MAP } from "$lib/cuisine.js";
    import { getDirectionsUrl } from "$lib/utils.js";
    import HeartIcon from "./HeartIcon.svelte";
    import "leaflet/dist/leaflet.css";

    /** @type {import('../types').Venue[]} */
    export let venues = [];
    /** @type {Map<string, import('../types').Truck[]>} */
    export let trucksByVenue = new Map();
    /** @type {string} */
    export let activeCuisine = "All";
    /** @type {Set<string>} */
    export let favorites = new Set();

    const dispatch = createEventDispatcher();

    let mapElement;
    let map;
    /** @type {import('leaflet').LayerGroup} */
    let markersLayer;

    // Bottom sheet state
    let selectedVenue = null;
    let selectedTrucks = [];
    let sheetOpen = false;

    onMount(async () => {
        if (browser) {
            const L = (await import("leaflet")).default;

            map = L.map(mapElement, {
                zoomControl: false,
            }).setView([35.6876, 139.766], 16);

            // Zoom control in top-right
            L.control.zoom({ position: 'topright' }).addTo(map);

            // CartoDB Voyager (clean, modern)
            L.tileLayer(
                "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
                {
                    attribution:
                        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
                    subdomains: "abcd",
                    maxZoom: 20,
                },
            ).addTo(map);

            markersLayer = L.layerGroup().addTo(map);

            // Close sheet on map click
            map.on('click', () => {
                closeSheet();
            });
        }
    });

    $: if (map && markersLayer && venues) {
        updateMarkers(trucksByVenue, activeCuisine);
    }

    function updateMarkers(_trucksByVenue, _activeCuisine) {
        if (!browser) return;
        import("leaflet").then(() => {
            doUpdate();
        });
    }

    function closeSheet() {
        sheetOpen = false;
        selectedVenue = null;
        selectedTrucks = [];
    }

    function openVenueSheet(venue, trucks) {
        selectedVenue = venue;
        selectedTrucks = trucks;
        sheetOpen = true;
    }

    function toggleFav(truckId) {
        dispatch('toggleFav', truckId);
    }

    // Abbreviate venue names for markers
    const VENUE_SHORT = {
        'kawabata': '川端',
        'otemachi-place': 'OP',
        'sankei': 'サンケイ',
        'otemachi-park': 'パーク',
        'marunouchi-trust': '丸の内',
        'tokyo-torch-tower': 'TT塔',
        'tokyo-torch-park': 'TT公園',
    };

    async function doUpdate() {
        const L = (await import("leaflet")).default;
        markersLayer.clearLayers();

        venues.forEach((venue) => {
            const allTrucks = trucksByVenue.get(venue.id) || [];

            let visibleTrucks = allTrucks;
            if (activeCuisine !== "All") {
                visibleTrucks = allTrucks.filter(
                    (t) => t.cuisine_label === activeCuisine,
                );
            }

            const hasTrucks = allTrucks.length > 0;
            const hasMatch = visibleTrucks.length > 0;
            const isDimmed = activeCuisine !== "All" && !hasMatch;
            const count = hasMatch ? visibleTrucks.length : allTrucks.length;
            const shortName = VENUE_SHORT[venue.id] || venue.id.slice(0, 3);

            // Rich marker with label
            const markerHtml = `
                <div class="venue-marker ${isDimmed ? "dimmed" : ""} ${!hasTrucks ? "empty" : ""}">
                    <div class="marker-bubble">
                        <span class="marker-count">${count}</span>
                    </div>
                    <div class="marker-label">${shortName}</div>
                </div>
            `;

            const icon = L.divIcon({
                className: "venue-div-icon",
                html: markerHtml,
                iconSize: [60, 52],
                iconAnchor: [30, 42],
            });

            const marker = L.marker([venue.lat, venue.lng], {
                icon: icon,
                zIndexOffset: isDimmed ? -100 : 100,
            });

            marker.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                // Open bottom sheet instead of popup
                openVenueSheet(venue, hasMatch ? visibleTrucks : allTrucks);

                // Pan to venue with offset for bottom sheet
                if (map) {
                    const targetLat = venue.lat - 0.0008; // offset down
                    map.panTo([targetLat, venue.lng], { animate: true, duration: 0.4 });
                }
            });

            markersLayer.addLayer(marker);
        });
    }

    onDestroy(() => {
        if (map) {
            map.remove();
        }
    });
</script>

<div class="map-container">
    <div class="map-root" bind:this={mapElement}></div>

    <!-- Bottom Sheet -->
    {#if sheetOpen && selectedVenue}
        <div class="bottom-sheet" class:open={sheetOpen}>
            <div class="sheet-handle-area">
                <div class="sheet-handle"></div>
            </div>

            <div class="sheet-header">
                <div class="sheet-venue-info">
                    <h3 class="sheet-venue-name">{selectedVenue.name_en || selectedVenue.name}</h3>
                    <div class="sheet-venue-meta">
                        <span class="sheet-hours">&#128338; {selectedVenue.hours}</span>
                        <span class="sheet-sep">&middot;</span>
                        <span class="sheet-address">{selectedVenue.address}</span>
                    </div>
                </div>
                <a
                    href={getDirectionsUrl(selectedVenue)}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="directions-btn"
                    aria-label="Walking directions"
                >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M3 11l19-9-9 19-2-8-8-2z"/>
                    </svg>
                </a>
            </div>

            <div class="sheet-truck-list">
                {#if selectedTrucks.length === 0}
                    <div class="sheet-empty">
                        <span>&#128203;</span>
                        <p>No trucks scheduled today</p>
                    </div>
                {:else}
                    {#each selectedTrucks as truck (truck.id)}
                        {@const c = getCuisine(truck.cuisine)}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <div class="sheet-truck-row" on:click|stopPropagation>
                            <span class="truck-emoji" style="background:{c.bg}">{c.emoji}</span>
                            <div class="truck-info">
                                <div class="truck-name-row">
                                    {#if favorites.has(truck.id)}
                                        <span class="mini-fav">&#9829;</span>
                                    {/if}
                                    <span class="truck-name">{truck.name}</span>
                                </div>
                                <span class="truck-cuisine" style="color:{c.text}">{truck.cuisine_label}</span>
                            </div>
                            <div class="truck-actions">
                                {#if truck.accepts_preorder}
                                    <span class="mini-badge preorder">予約可</span>
                                {/if}
                                <button
                                    class="mini-fav-btn"
                                    class:active={favorites.has(truck.id)}
                                    on:click|stopPropagation={() => toggleFav(truck.id)}
                                    aria-label="Favorite"
                                >
                                    <HeartIcon filled={favorites.has(truck.id)} size={16} />
                                </button>
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>

            {#if selectedVenue.source_url}
                <a
                    href={selectedVenue.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="sheet-source-link"
                >
                    View full schedule on official site &rarr;
                </a>
            {/if}
        </div>
    {/if}
</div>

<style>
    .map-container {
        position: relative;
        height: 100%;
        width: 100%;
    }

    .map-root {
        height: 100%;
        width: 100%;
        background: var(--surface-2);
        z-index: 1;
    }

    /* ── Venue Markers ── */
    :global(.venue-div-icon) {
        background: transparent !important;
        border: none !important;
    }

    :global(.venue-marker) {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
        cursor: pointer;
    }

    :global(.marker-bubble) {
        width: 36px;
        height: 36px;
        background: var(--primary, #FF385C);
        color: white;
        border-radius: 50%;
        border: 2.5px solid white;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 15px;
        position: relative;
    }

    :global(.marker-bubble::after) {
        content: "";
        position: absolute;
        bottom: -5px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 5px solid var(--primary, #FF385C);
    }

    :global(.marker-label) {
        font-size: 10px;
        font-weight: 700;
        color: #333;
        background: rgba(255, 255, 255, 0.92);
        padding: 1px 5px;
        border-radius: 4px;
        white-space: nowrap;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        line-height: 1.3;
        letter-spacing: 0.02em;
    }

    :global(.venue-marker.empty .marker-bubble) {
        background: #95a5a6;
    }
    :global(.venue-marker.empty .marker-bubble::after) {
        border-top-color: #95a5a6;
    }

    :global(.venue-marker.dimmed) {
        opacity: 0.35;
        transform: scale(0.8);
        filter: grayscale(100%);
    }

    :global(.venue-marker:hover) {
        transform: scale(1.12);
        z-index: 1000 !important;
    }
    :global(.venue-marker:hover .marker-bubble) {
        box-shadow: 0 4px 16px rgba(255, 56, 92, 0.4);
    }

    /* ── Bottom Sheet ── */
    .bottom-sheet {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: var(--surface-1, white);
        border-radius: 20px 20px 0 0;
        box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        max-height: 55%;
        overflow-y: auto;
        animation: sheetSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        overscroll-behavior: contain;
    }

    @keyframes sheetSlideUp {
        from {
            transform: translateY(100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    .sheet-handle-area {
        display: flex;
        justify-content: center;
        padding: 10px 0 4px;
        cursor: grab;
    }

    .sheet-handle {
        width: 36px;
        height: 4px;
        background: var(--text-lighter);
        border-radius: 2px;
    }

    .sheet-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 0 16px 12px;
        border-bottom: 1px solid var(--border);
    }

    .sheet-venue-info {
        flex: 1;
        min-width: 0;
    }

    .sheet-venue-name {
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--text);
        margin: 0 0 2px;
        line-height: 1.3;
    }

    .sheet-venue-meta {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.75rem;
        color: var(--text-light);
        flex-wrap: wrap;
    }

    .sheet-sep {
        opacity: 0.4;
    }

    .directions-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: var(--primary, #FF385C);
        color: white;
        flex-shrink: 0;
        margin-left: 8px;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(255, 56, 92, 0.3);
    }

    .directions-btn:hover {
        transform: scale(1.06);
        box-shadow: 0 4px 12px rgba(255, 56, 92, 0.4);
    }

    /* ── Truck List ── */
    .sheet-truck-list {
        padding: 8px 12px;
    }

    .sheet-truck-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 4px;
        border-bottom: 1px solid var(--border);
        transition: background 0.15s;
    }

    .sheet-truck-row:last-child {
        border-bottom: none;
    }

    .sheet-truck-row:hover {
        background: var(--surface-2);
        border-radius: 10px;
    }

    .truck-emoji {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.15rem;
        flex-shrink: 0;
    }

    .truck-info {
        flex: 1;
        min-width: 0;
    }

    .truck-name-row {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .mini-fav {
        color: var(--primary);
        font-size: 0.65rem;
        line-height: 1;
    }

    .truck-name {
        font-size: 0.88rem;
        font-weight: 600;
        color: var(--text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .truck-cuisine {
        font-size: 0.72rem;
        font-weight: 500;
    }

    .truck-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
    }

    .mini-badge {
        font-size: 0.6rem;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 4px;
    }

    .mini-badge.preorder {
        background: color-mix(in srgb, var(--success) 12%, transparent);
        color: var(--success);
    }

    .mini-fav-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: none;
        background: transparent;
        color: var(--text-lighter);
        cursor: pointer;
        transition: all 0.15s;
    }

    .mini-fav-btn:hover {
        background: var(--surface-2);
        color: var(--primary);
    }

    .mini-fav-btn.active {
        color: var(--primary);
    }

    .sheet-empty {
        text-align: center;
        padding: 1.5rem 0;
        color: var(--text-light);
        font-size: 0.85rem;
    }

    .sheet-empty span {
        font-size: 1.5rem;
        display: block;
        margin-bottom: 0.3rem;
    }

    .sheet-source-link {
        display: block;
        text-align: center;
        padding: 10px 16px 16px;
        font-size: 0.78rem;
        color: var(--primary);
        text-decoration: none;
        font-weight: 500;
    }

    .sheet-source-link:hover {
        text-decoration: underline;
    }

    /* Hide leaflet attribution on small screens for cleaner look */
    :global(.leaflet-control-attribution) {
        font-size: 9px !important;
        opacity: 0.6;
        max-width: 200px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
</style>
