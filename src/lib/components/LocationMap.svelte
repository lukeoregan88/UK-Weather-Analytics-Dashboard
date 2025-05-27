<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Location } from '../types.js';

	export let location: Location;
	export let height: string = '400px';

	let mapContainer: HTMLDivElement;
	let map: any;
	let L: any;

	onMount(async () => {
		// Dynamically import Leaflet to avoid SSR issues
		L = await import('leaflet');

		// Initialize the map
		map = L.map(mapContainer).setView([location.latitude, location.longitude], 11);

		// Add OpenStreetMap tiles
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution:
				'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(map);

		// Add a marker for the location
		const marker = L.marker([location.latitude, location.longitude]).addTo(map);

		// Add popup with location info
		marker
			.bindPopup(
				`
			<div>
				<strong>${location.name}</strong><br>
				${location.postcode}<br>
				<small>Lat: ${location.latitude.toFixed(4)}, Lng: ${location.longitude.toFixed(4)}</small>
			</div>
		`
			)
			.openPopup();
	});

	onDestroy(() => {
		if (map) {
			map.remove();
		}
	});

	// Update map when location changes
	$: if (map && L && location) {
		map.setView([location.latitude, location.longitude], 11);

		// Clear existing markers and add new one
		map.eachLayer((layer: any) => {
			if (layer instanceof L.Marker) {
				map.removeLayer(layer);
			}
		});

		const marker = L.marker([location.latitude, location.longitude]).addTo(map);
		marker
			.bindPopup(
				`
			<div>
				<strong>${location.name}</strong><br>
				${location.postcode}<br>
				<small>Lat: ${location.latitude.toFixed(4)}, Lng: ${location.longitude.toFixed(4)}</small>
			</div>
		`
			)
			.openPopup();
	}
</script>

<div bind:this={mapContainer} style="height: {height}; width: 100%;" class="rounded-lg"></div>

<style>
	:global(.leaflet-container) {
		border-radius: 0.5rem;
	}
</style>
