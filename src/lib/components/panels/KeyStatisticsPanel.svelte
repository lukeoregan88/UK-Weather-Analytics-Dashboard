<script lang="ts">
	import type {
		SolarStats,
		TemperatureStats,
		WindStats,
		SolarEnergyInsights
	} from '../../types.js';

	export let loadingData: boolean = false;
	export let showSolarView: boolean = false;
	export let showWindView: boolean = false;
	export let showTemperatureView: boolean = false;
	export let solarStats: SolarStats | null = null;
	export let solarEnergyInsights: SolarEnergyInsights | null = null;
	export let solarData: any[] = [];
	export let windStats: WindStats | null = null;
	export let temperatureStats: TemperatureStats | null = null;
	export let temperatureExtremes: { heatWaves: any[]; coldSnaps: any[] } = {
		heatWaves: [],
		coldSnaps: []
	};
	export let currentYearTotal: number = 0;
	export let currentYear: number = new Date().getFullYear();
	export let last90DaysTotal: number = 0;
	export let percentiles: any = null;
	export let droughtPeriods: any[] = [];

	function getWindDirectionLabel(degrees: number): string {
		const directions = [
			'N',
			'NNE',
			'NE',
			'ENE',
			'E',
			'ESE',
			'SE',
			'SSE',
			'S',
			'SSW',
			'SW',
			'WSW',
			'W',
			'WNW',
			'NW',
			'NNW'
		];
		const index = Math.round(degrees / 22.5) % 16;
		return directions[index];
	}
</script>

<!-- Key Statistics -->
<div class="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
	{#if loadingData}
		<!-- Loading state for statistics -->
		{#each Array(4) as _, i}
			<div class="rounded-lg bg-white p-4 shadow-sm">
				<div class="mb-2 h-3 w-24 animate-pulse rounded bg-gray-200"></div>
				<div class="mb-1 h-8 w-20 animate-pulse rounded bg-gray-300"></div>
				<div class="h-3 w-16 animate-pulse rounded bg-gray-200"></div>
			</div>
		{/each}
	{:else if showSolarView && solarStats}
		<div class="rounded-lg bg-white p-4 shadow-sm">
			<h3 class="text-xs font-medium tracking-wide text-gray-500 uppercase">
				Average Solar Radiation
			</h3>
			<p class="mt-1 text-2xl font-bold text-gray-900">
				{solarStats.meanRadiation.toFixed(1)} MJ/m²
			</p>
			<p class="text-xs text-gray-600">Daily average</p>
		</div>

		<div class="rounded-lg bg-white p-4 shadow-sm">
			<h3 class="text-xs font-medium tracking-wide text-gray-500 uppercase">Peak Solar Days</h3>
			<p class="mt-1 text-2xl font-bold text-gray-900">{solarStats.peakSolarDays}</p>
			<p class="text-xs text-gray-600">Days > 20 MJ/m²</p>
		</div>

		<div class="rounded-lg bg-white p-4 shadow-sm">
			<h3 class="text-xs font-medium tracking-wide text-gray-500 uppercase">Energy Potential</h3>
			<p class="mt-1 text-2xl font-bold text-gray-900">
				{solarEnergyInsights?.peakSolarHours?.toFixed(2) || '0.0'} kWh
			</p>
			<p class="text-xs text-gray-600">Peak solar hours</p>
		</div>

		<div class="rounded-lg bg-white p-4 shadow-sm">
			<h3 class="text-xs font-medium tracking-wide text-gray-500 uppercase">Sunshine Duration</h3>
			<p class="mt-1 text-2xl font-bold text-gray-900">
				{solarData.length > 0
					? (
							solarData
								.filter((d) => d.sunshineDuration !== undefined)
								.reduce((sum, d) => sum + (d.sunshineDuration || 0), 0) /
							solarData.filter((d) => d.sunshineDuration !== undefined).length /
							3600
						).toFixed(1)
					: '0.0'} hrs
			</p>
			<p class="text-xs text-gray-600">Daily average</p>
		</div>
	{:else if showWindView && windStats}
		<div class="rounded-lg bg-white p-4 shadow-sm">
			<h3 class="text-xs font-medium tracking-wide text-gray-500 uppercase">Average Wind Speed</h3>
			<p class="mt-1 text-2xl font-bold text-gray-900">
				{windStats.meanSpeed.toFixed(1)} km/h
			</p>
			<p class="text-xs text-gray-600">Historical mean</p>
		</div>

		<div class="rounded-lg bg-white p-4 shadow-sm">
			<h3 class="text-xs font-medium tracking-wide text-gray-500 uppercase">Max Wind Speed</h3>
			<p class="mt-1 text-2xl font-bold text-gray-900">
				{windStats.maxSpeed.toFixed(1)} km/h
			</p>
			<p class="text-xs text-gray-600">Recorded maximum</p>
		</div>

		<div class="rounded-lg bg-white p-4 shadow-sm">
			<h3 class="text-xs font-medium tracking-wide text-gray-500 uppercase">Gusty Days</h3>
			<p class="mt-1 text-2xl font-bold text-gray-900">{windStats.gustyDays}</p>
			<p class="text-xs text-gray-600">Gusts > 50 km/h</p>
		</div>

		<div class="rounded-lg bg-white p-4 shadow-sm">
			<h3 class="text-xs font-medium tracking-wide text-gray-500 uppercase">
				Prevailing Direction
			</h3>
			<p class="mt-1 text-2xl font-bold text-gray-900">
				{getWindDirectionLabel(windStats.prevailingDirection)}
			</p>
			<p class="text-xs text-gray-600">{windStats.prevailingDirection}°</p>
		</div>
	{:else if showTemperatureView && temperatureStats}
		<div class="rounded-lg bg-white p-4 shadow-sm">
			<h3 class="text-xs font-medium tracking-wide text-gray-500 uppercase">Average Temperature</h3>
			<p class="mt-1 text-2xl font-bold text-gray-900">
				{temperatureStats.mean.toFixed(1)}°C
			</p>
			<p class="text-xs text-gray-600">Historical mean</p>
		</div>

		<div class="rounded-lg bg-white p-4 shadow-sm">
			<h3 class="text-xs font-medium tracking-wide text-gray-500 uppercase">Temperature Range</h3>
			<p class="mt-1 text-2xl font-bold text-gray-900">
				{temperatureStats.range.toFixed(1)}°C
			</p>
			<p class="text-xs text-gray-600">
				{temperatureStats.min.toFixed(1)}° to {temperatureStats.max.toFixed(1)}°C
			</p>
		</div>

		<div class="rounded-lg bg-white p-4 shadow-sm">
			<h3 class="text-xs font-medium tracking-wide text-gray-500 uppercase">Heat Waves</h3>
			<p class="mt-1 text-2xl font-bold text-gray-900">
				{temperatureExtremes.heatWaves.length}
			</p>
			<p class="text-xs text-gray-600">3+ days above 25°C (90 days)</p>
		</div>

		<div class="rounded-lg bg-white p-4 shadow-sm">
			<h3 class="text-xs font-medium tracking-wide text-gray-500 uppercase">Cold Snaps</h3>
			<p class="mt-1 text-2xl font-bold text-gray-900">
				{temperatureExtremes.coldSnaps.length}
			</p>
			<p class="text-xs text-gray-600">3+ days below -2°C (90 days)</p>
		</div>
	{:else}
		<div class="rounded-lg bg-white p-4 shadow-sm">
			<h3 class="text-xs font-medium tracking-wide text-gray-500 uppercase">
				{currentYear} Total
			</h3>
			<p class="mt-1 text-2xl font-bold text-gray-900">{currentYearTotal.toFixed(1)} mm</p>
			<p class="text-xs text-gray-600">Year to date</p>
		</div>

		<div class="rounded-lg bg-white p-4 shadow-sm">
			<h3 class="text-xs font-medium tracking-wide text-gray-500 uppercase">90-Day Total</h3>
			<p class="mt-1 text-2xl font-bold text-gray-900">{last90DaysTotal.toFixed(1)} mm</p>
			<p class="text-xs text-gray-600">Last 90 days</p>
		</div>

		{#if percentiles}
			<div class="rounded-lg bg-white p-4 shadow-sm">
				<h3 class="text-xs font-medium tracking-wide text-gray-500 uppercase">Median Daily Rain</h3>
				<p class="mt-1 text-2xl font-bold text-gray-900">{percentiles.p50} mm</p>
				<p class="text-xs text-gray-600">When it rains</p>
			</div>
		{/if}

		<div class="rounded-lg bg-white p-4 shadow-sm">
			<h3 class="text-xs font-medium tracking-wide text-gray-500 uppercase">Drought Periods</h3>
			<p class="mt-1 text-2xl font-bold text-gray-900">{droughtPeriods.length}</p>
			<p class="text-xs text-gray-600">7+ day dry spells (90 days)</p>
		</div>
	{/if}
</div>
