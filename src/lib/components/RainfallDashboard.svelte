<script lang="ts">
	import { onMount } from 'svelte';
	import RainfallChart from './RainfallChart.svelte';
	import TemperatureChart from './TemperatureChart.svelte';
	import LocationMap from './LocationMap.svelte';
	import YearlyComparisonPanel from './panels/YearlyComparisonPanel.svelte';
	import EnhancedStatisticsPanel from './panels/EnhancedStatisticsPanel.svelte';
	import type {
		Location,
		RainfallData,
		YearlyComparison,
		TemperatureData,
		TemperatureStats,
		TemperatureComparison,
		EnhancedStatistics
	} from '../types.js';
	import {
		getLocationFromPostcode,
		getTenYearRainfallData,
		getCurrentYearRainfall,
		getCurrentWeather,
		getTenYearTemperatureData
	} from '../services/weatherApi.js';
	import {
		calculateYearlyComparison,
		calculateMonthlyComparison,
		calculatePercentiles,
		getRecentRainfall,
		calculateDroughtPeriods,
		calculateTemperatureStats,
		calculateYearlyTemperatureComparison,
		calculateMonthlyTemperatureComparison,
		getRecentTemperature,
		calculateTemperatureExtremes,
		calculateEnhancedYearlyComparison,
		calculateEnhancedMonthlyComparison,
		calculateAllEnhancedStatistics
	} from '../utils/dataProcessing.js';
	import { format } from 'date-fns';
	import { cacheService, postcodeStorage } from '../services/cacheService.js';

	let postcode = '';
	let location: Location | null = null;
	let loading = false;
	let loadingData = false;
	let loadingWeather = false;
	let loadingCharts = false;
	let error = '';
	let historicalData: RainfallData[] = [];
	let currentYearData: RainfallData[] = [];
	let recentData: RainfallData[] = [];
	let yearlyComparison: YearlyComparison[] = [];
	let currentWeather: any = null;
	let showMonthlyComparison = false;
	let selectedMonth = new Date().getMonth();
	let cacheStats: { totalEntries: number; totalSize: number; oldestEntry: Date | null } = {
		totalEntries: 0,
		totalSize: 0,
		oldestEntry: null
	};
	let showCacheInfo = false;

	// Temperature data
	let temperatureData: TemperatureData[] = [];
	let recentTemperatureData: TemperatureData[] = [];
	let temperatureStats: TemperatureStats | null = null;
	let temperatureComparison: TemperatureComparison[] = [];
	let temperatureExtremes: { heatWaves: any[]; coldSnaps: any[] } = {
		heatWaves: [],
		coldSnaps: []
	};
	let showTemperatureView = false;
	let enhancedStats: EnhancedStatistics | null = null;

	async function searchLocation() {
		if (!postcode.trim()) {
			error = 'Please enter a postcode';
			return;
		}

		loading = true;
		error = '';
		// Reset data to ensure clean state
		location = null;
		historicalData = [];
		currentYearData = [];
		recentData = [];
		temperatureData = [];
		currentWeather = null;
		enhancedStats = null;

		try {
			location = await getLocationFromPostcode(postcode);
			// Save postcode for next visit
			postcodeStorage.save(postcode);
			await loadWeatherData();
			updateCacheStats();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to fetch data';
		} finally {
			loading = false;
		}
	}

	async function loadWeatherData() {
		if (!location) return;

		loadingData = true;
		loadingWeather = true;
		loadingCharts = true;

		try {
			// Load current weather first for immediate feedback
			loadingWeather = true;
			currentWeather = await getCurrentWeather(location.latitude, location.longitude);
			loadingWeather = false;

			// Load historical data (last 90 days)
			historicalData = await getTenYearRainfallData(location.latitude, location.longitude);

			// Load current year data
			currentYearData = await getCurrentYearRainfall(location.latitude, location.longitude);

			// Get recent 30 days
			const recentDailyData = getRecentRainfall(historicalData, 30);
			recentData = recentDailyData.map((d) => ({ date: d.date, rainfall: d.total }));

			// Load temperature data
			temperatureData = await getTenYearTemperatureData(location.latitude, location.longitude);
			recentTemperatureData = getRecentTemperature(temperatureData, 30);
			temperatureStats = calculateTemperatureStats(temperatureData);
			temperatureExtremes = calculateTemperatureExtremes(temperatureData.slice(-90));

			loadingCharts = false;

			// Calculate initial yearly comparisons for rainfall and temperature
			const initialYearlyRainfallComparison = calculateYearlyComparison(historicalData);
			const initialYearlyTemperatureComparison =
				calculateYearlyTemperatureComparison(temperatureData);

			// Calculate enhanced statistics
			if (historicalData.length > 0 && temperatureData.length > 0) {
				enhancedStats = calculateAllEnhancedStatistics(
					historicalData,
					temperatureData,
					initialYearlyRainfallComparison,
					initialYearlyTemperatureComparison
				);
			}

			loadingData = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load weather data';
			loadingData = false;
			loadingWeather = false;
			loadingCharts = false;
		}
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			searchLocation();
		}
	}

	function updateCacheStats() {
		cacheStats = cacheService.getStats();
	}

	function clearCache() {
		if (location) {
			cacheService.clearLocation(location.latitude, location.longitude);
			updateCacheStats();
		}
	}

	function clearAllExpiredCache() {
		cacheService.clearExpired();
		updateCacheStats();
	}

	// Load saved postcode on mount
	onMount(() => {
		const savedPostcode = postcodeStorage.load();
		if (savedPostcode) {
			postcode = savedPostcode;
		}
		updateCacheStats();
	});

	$: currentYear = new Date().getFullYear();
	$: currentMonth = new Date().getMonth(); // 0-based (January = 0)
	$: currentMonthName = new Date().toLocaleString('default', { month: 'long' });
	$: selectedMonthName = new Date(2024, selectedMonth).toLocaleString('default', { month: 'long' });
	$: percentiles = historicalData.length > 0 ? calculatePercentiles(historicalData) : null;
	$: droughtPeriods =
		historicalData.length > 0 ? calculateDroughtPeriods(historicalData.slice(-90)) : [];
	$: currentYearTotal = currentYearData.reduce((sum, day) => sum + day.rainfall, 0);
	$: yearlyComparison =
		historicalData.length > 0 && temperatureData.length > 0
			? calculateEnhancedYearlyComparison(historicalData, temperatureData)
			: calculateYearlyComparison(historicalData);
	$: monthlyComparison =
		historicalData.length > 0 && temperatureData.length > 0
			? calculateEnhancedMonthlyComparison(historicalData, temperatureData, selectedMonth)
			: historicalData.length > 0
				? calculateMonthlyComparison(historicalData, selectedMonth)
				: [];
	$: temperatureComparison =
		temperatureData.length > 0
			? showMonthlyComparison
				? calculateMonthlyTemperatureComparison(temperatureData, selectedMonth)
				: calculateYearlyTemperatureComparison(temperatureData)
			: [];
	$: displayedComparison = showMonthlyComparison
		? monthlyComparison.sort((a, b) => b.year - a.year)
		: yearlyComparison.sort((a, b) => b.year - a.year);
	$: averageYearlyTotal =
		displayedComparison.length > 0
			? displayedComparison.reduce((sum, year) => sum + year.totalRainfall, 0) /
				displayedComparison.length
			: 0;
	$: last90DaysTotal =
		historicalData.length > 0
			? historicalData.slice(-90).reduce((sum, day) => sum + day.rainfall, 0)
			: 0;
	$: wettestYear =
		displayedComparison.length > 0
			? displayedComparison.reduce((max, year) =>
					year.totalRainfall > max.totalRainfall ? year : max
				)
			: null;
	$: driestYear =
		displayedComparison.length > 0
			? displayedComparison.reduce((min, year) =>
					year.totalRainfall < min.totalRainfall ? year : min
				)
			: null;
	$: averageTemperature =
		temperatureComparison.length > 0
			? temperatureComparison.reduce((sum, year) => sum + year.meanTemperature, 0) /
				temperatureComparison.length
			: 0;
	$: warmestYear =
		temperatureComparison.length > 0
			? temperatureComparison.reduce((max, year) =>
					year.meanTemperature > max.meanTemperature ? year : max
				)
			: null;
	$: coldestYear =
		temperatureComparison.length > 0
			? temperatureComparison.reduce((min, year) =>
					year.meanTemperature < min.meanTemperature ? year : min
				)
			: null;

	// Calculate available months (months that have passed in current year)
	$: availableMonths = (() => {
		const months = [];
		const now = new Date();
		const currentMonthIndex = now.getMonth();

		for (let i = 0; i <= currentMonthIndex; i++) {
			const monthName = new Date(2024, i).toLocaleString('default', { month: 'long' });
			months.push({ index: i, name: monthName });
		}
		return months;
	})();

	function handleMonthChanged(event: CustomEvent<{ month: number }>) {
		selectedMonth = event.detail.month;
	}
</script>

<div class="min-h-screen bg-gray-50">
	<div class="mx-auto max-w-7xl">
		<!-- Header -->
		<div class="mt-4 mb-4 rounded-lg bg-white p-4 shadow-sm">
			<h1 class="mb-2 text-2xl font-bold text-gray-900">UK Rainfall Analysis Dashboard</h1>
			<p class="mb-4 text-sm text-gray-600">
				Analyse historical rainfall patterns and current conditions for any UK location
			</p>

			<!-- Search -->
			<div class="flex items-end gap-3">
				<div class="flex-1">
					<label for="postcode" class="mb-1 block text-sm font-medium text-gray-700">
						UK Postcode
					</label>
					<input
						id="postcode"
						type="text"
						bind:value={postcode}
						on:keypress={handleKeyPress}
						placeholder="e.g. SW1A 1AA"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					/>
				</div>
				<button
					on:click={searchLocation}
					disabled={loading}
					class="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					{loading ? 'Loading...' : 'Analyse'}
				</button>
			</div>

			{#if postcode && !location}
				<div class="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3">
					<div class="flex items-center">
						<i class="fa-solid fa-circle-info mr-2" style="color: #74C0FC;"></i>
						<p class="text-sm text-blue-800">
							Found saved postcode: <strong>{postcode}</strong>. Click "Analyse" to load data.
						</p>
					</div>
				</div>
			{/if}

			{#if error}
				<div class="mt-3 rounded-md border border-red-200 bg-red-50 p-3">
					<p class="text-sm text-red-800">{error}</p>
				</div>
			{/if}

			<!-- Cache Management -->
			<div class="mt-3 flex items-center justify-between">
				<button
					on:click={() => (showCacheInfo = !showCacheInfo)}
					class="text-xs text-gray-500 hover:text-gray-700 focus:outline-none"
				>
					{showCacheInfo ? 'Hide' : 'Show'} cache info
				</button>

				{#if showCacheInfo}
					<div class="flex gap-2">
						<button
							on:click={clearAllExpiredCache}
							class="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 focus:outline-none"
						>
							Clear expired
						</button>
						{#if location}
							<button
								on:click={clearCache}
								class="rounded-md bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200 focus:outline-none"
							>
								Clear location cache
							</button>
						{/if}
					</div>
				{/if}
			</div>

			{#if showCacheInfo}
				<div class="mt-2 rounded-md bg-gray-50 p-2">
					<div class="grid grid-cols-1 gap-1 text-xs text-gray-600 sm:grid-cols-3">
						<div>
							<span class="font-medium">Cached entries:</span>
							{cacheStats.totalEntries}
						</div>
						<div>
							<span class="font-medium">Cache size:</span>
							{Math.round(cacheStats.totalSize / 1024)} KB
						</div>
						<div>
							<span class="font-medium">Oldest entry:</span>
							{cacheStats.oldestEntry ? cacheStats.oldestEntry.toLocaleDateString() : 'None'}
						</div>
					</div>
					<p class="mt-1 text-xs text-gray-500">
						Data is cached for 12 hours (historical), 6 hours (current year), and 1 hour (current
						weather) to reduce API calls.
					</p>
				</div>
			{/if}
		</div>

		{#if location}
			<!-- Loading Overlay for Initial Data Load -->
			{#if loading}
				<div class="mb-4 rounded-lg bg-white p-6 shadow-sm">
					<div class="text-center">
						<div
							class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"
						></div>
						<h3 class="mb-2 text-lg font-semibold text-gray-900">Loading Weather Data</h3>
						<p class="mb-4 text-sm text-gray-600">
							Fetching historical and current weather information for {location.name}
						</p>

						<!-- Progress indicators -->
						<div class="mx-auto max-w-md space-y-3">
							<div class="flex items-center justify-between rounded-lg bg-gray-50 p-3">
								<span class="text-sm font-medium text-gray-700">Location Data</span>
								<div class="flex items-center text-green-600">
									<svg class="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
										<path
											fill-rule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clip-rule="evenodd"
										></path>
									</svg>
									<span class="text-xs font-medium">Complete</span>
								</div>
							</div>
							<div class="flex items-center justify-between rounded-lg bg-gray-50 p-3">
								<span class="text-sm font-medium text-gray-700">Current Weather</span>
								{#if !loadingWeather}
									<div class="flex items-center text-green-600">
										<svg class="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
												clip-rule="evenodd"
											></path>
										</svg>
										<span class="text-xs font-medium">Complete</span>
									</div>
								{:else}
									<div class="flex items-center text-blue-600">
										<div
											class="mr-1 h-3 w-3 animate-spin rounded-full border border-blue-600 border-t-transparent"
										></div>
										<span class="text-xs font-medium">Loading...</span>
									</div>
								{/if}
							</div>
							<div class="flex items-center justify-between rounded-lg bg-gray-50 p-3">
								<span class="text-sm font-medium text-gray-700">Historical Data</span>
								{#if !loadingCharts}
									<div class="flex items-center text-green-600">
										<svg class="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
												clip-rule="evenodd"
											></path>
										</svg>
										<span class="text-xs font-medium">Complete</span>
									</div>
								{:else}
									<div class="flex items-center text-blue-600">
										<div
											class="mr-1 h-3 w-3 animate-spin rounded-full border border-blue-600 border-t-transparent"
										></div>
										<span class="text-xs font-medium">Loading...</span>
									</div>
								{/if}
							</div>
							<div class="flex items-center justify-between rounded-lg bg-gray-50 p-3">
								<span class="text-sm font-medium text-gray-700">Analysis & Statistics</span>
								{#if !loadingData}
									<div class="flex items-center text-green-600">
										<svg class="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
												clip-rule="evenodd"
											></path>
										</svg>
										<span class="text-xs font-medium">Complete</span>
									</div>
								{:else}
									<div class="flex items-center text-blue-600">
										<div
											class="mr-1 h-3 w-3 animate-spin rounded-full border border-blue-600 border-t-transparent"
										></div>
										<span class="text-xs font-medium">Processing...</span>
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Location Info -->
			<div class="mb-4 rounded-lg bg-white p-4 shadow-sm">
				<div class="mb-3 flex items-center justify-between">
					<h2 class="text-lg font-semibold text-gray-900">
						<i class="fa-solid fa-location-dot mr-2"></i> Location
					</h2>
					{#if cacheService.has(location.latitude, location.longitude, 'historical')}
						<span
							class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
						>
							<i class="fa-solid fa-circle-check mr-1"></i>
							Cached data
						</span>
					{/if}
				</div>
				<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
					<div>
						<p class="mb-1 text-sm text-gray-600">
							{location.name} ({location.postcode})
						</p>
						<p class="mb-1 text-sm text-gray-600">
							{location.region}
						</p>
						<p class="text-xs text-gray-500">
							Coordinates: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
						</p>
					</div>
					<div>
						<LocationMap {location} height="150px" />
					</div>
				</div>
			</div>

			<!-- Current Weather -->
			<div class="mb-4 rounded-lg bg-white p-4 shadow-sm">
				<h2 class="mb-3 text-lg font-semibold text-gray-900">Current Conditions</h2>

				{#if loadingWeather}
					<!-- Loading state for current weather -->
					<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
						{#each Array(4) as _, i}
							<div class="rounded-lg bg-gray-50 p-3">
								<div class="mb-2 h-4 w-20 animate-pulse rounded bg-gray-200"></div>
								<div class="mb-1 h-6 w-16 animate-pulse rounded bg-gray-300"></div>
								<div class="h-3 w-12 animate-pulse rounded bg-gray-200"></div>
							</div>
						{/each}
					</div>
				{:else if currentWeather}
					<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
						<div class="rounded-lg bg-blue-50 p-3">
							<h3 class="text-sm font-medium text-blue-900">Temperature</h3>
							<p class="text-xl font-bold text-blue-700">
								{currentWeather.current?.temperature_2m?.toFixed(1) || 'N/A'}°C
							</p>
						</div>
						<div class="rounded-lg bg-orange-50 p-3">
							<h3 class="text-sm font-medium text-orange-900">Today's Range</h3>
							<p class="text-lg font-bold text-orange-700">
								{currentWeather.daily?.temperature_2m_min?.[0]?.toFixed(1) || 'N/A'}° -
								{currentWeather.daily?.temperature_2m_max?.[0]?.toFixed(1) || 'N/A'}°C
							</p>
						</div>
						<div class="rounded-lg bg-green-50 p-3">
							<h3 class="text-sm font-medium text-green-900">Humidity</h3>
							<p class="text-xl font-bold text-green-700">
								{currentWeather.current?.relative_humidity_2m || 'N/A'}%
							</p>
						</div>
						<div class="rounded-lg bg-purple-50 p-3">
							<h3 class="text-sm font-medium text-purple-900">Today's Rain</h3>
							<p class="text-xl font-bold text-purple-700">
								{currentWeather.daily?.precipitation_sum?.[0]?.toFixed(1) || '0.0'} mm
							</p>
						</div>
					</div>
				{:else}
					<div class="flex items-center justify-center py-8">
						<div class="text-center">
							<div
								class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
							></div>
							<p class="mt-2 text-sm text-gray-500">Loading current weather...</p>
						</div>
					</div>
				{/if}
			</div>

			<!-- Data View Toggle -->
			<div class="mb-4 rounded-lg bg-white p-3 shadow-sm">
				<div class="flex items-center justify-center">
					<div class="flex items-center space-x-3">
						<span class="text-sm font-medium text-gray-700">Rainfall Analysis</span>
						<button
							on:click={() => (showTemperatureView = !showTemperatureView)}
							aria-label="Toggle temperature view"
							class="relative inline-flex h-5 w-9 items-center rounded-full bg-gray-200 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none {showTemperatureView
								? 'bg-blue-600'
								: 'bg-gray-200'}"
						>
							<span
								class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform {showTemperatureView
									? 'translate-x-5'
									: 'translate-x-1'}"
							></span>
						</button>
						<span class="text-sm font-medium text-gray-700">Temperature Analysis</span>
					</div>
				</div>
			</div>

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
				{:else if !showTemperatureView}
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
							<h3 class="text-xs font-medium tracking-wide text-gray-500 uppercase">
								Median Daily Rain
							</h3>
							<p class="mt-1 text-2xl font-bold text-gray-900">{percentiles.p50} mm</p>
							<p class="text-xs text-gray-600">When it rains</p>
						</div>
					{/if}

					<div class="rounded-lg bg-white p-4 shadow-sm">
						<h3 class="text-xs font-medium tracking-wide text-gray-500 uppercase">
							Drought Periods
						</h3>
						<p class="mt-1 text-2xl font-bold text-gray-900">{droughtPeriods.length}</p>
						<p class="text-xs text-gray-600">7+ day dry spells (90 days)</p>
					</div>
				{:else if temperatureStats}
					<div class="rounded-lg bg-white p-4 shadow-sm">
						<h3 class="text-xs font-medium tracking-wide text-gray-500 uppercase">
							Average Temperature
						</h3>
						<p class="mt-1 text-2xl font-bold text-gray-900">
							{temperatureStats.mean.toFixed(1)}°C
						</p>
						<p class="text-xs text-gray-600">Historical mean</p>
					</div>

					<div class="rounded-lg bg-white p-4 shadow-sm">
						<h3 class="text-xs font-medium tracking-wide text-gray-500 uppercase">
							Temperature Range
						</h3>
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
				{/if}
			</div>

			<!-- Charts -->
			<div class="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
				{#if loadingCharts}
					<!-- Loading state for charts -->
					<div class="rounded-lg bg-white p-4 shadow-sm">
						<div class="mb-3 h-6 w-32 animate-pulse rounded bg-gray-200"></div>
						<div class="h-64 w-full animate-pulse rounded bg-gray-100"></div>
					</div>
					<div class="rounded-lg bg-white p-4 shadow-sm">
						<div class="mb-3 h-6 w-40 animate-pulse rounded bg-gray-200"></div>
						<div class="h-64 w-full animate-pulse rounded bg-gray-100"></div>
					</div>
				{:else if !showTemperatureView}
					<!-- Recent Rainfall -->
					<div class="rounded-lg bg-white p-4 shadow-sm">
						<h3 class="mb-3 text-lg font-semibold text-gray-900">Last 30 Days</h3>
						{#if recentData.length > 0}
							<RainfallChart
								data={recentData}
								title="Daily Rainfall (Last 30 Days)"
								type="bar"
								height={250}
							/>
						{:else}
							<div class="flex items-center justify-center py-16">
								<div class="text-center">
									<div
										class="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
									></div>
									<p class="mt-2 text-sm text-gray-500">Loading chart data...</p>
								</div>
							</div>
						{/if}
					</div>

					<!-- Current Year vs Historical -->
					<div class="rounded-lg bg-white p-4 shadow-sm">
						<h3 class="mb-3 text-lg font-semibold text-gray-900">Current Year Trend</h3>
						{#if currentYearData.length > 0}
							<RainfallChart
								data={currentYearData}
								title="{currentYear} Daily Rainfall"
								type="line"
								height={250}
							/>
						{:else}
							<div class="flex items-center justify-center py-16">
								<div class="text-center">
									<div
										class="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
									></div>
									<p class="mt-2 text-sm text-gray-500">Loading chart data...</p>
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<!-- Recent Temperature -->
					<div class="rounded-lg bg-white p-4 shadow-sm">
						<h3 class="mb-3 text-lg font-semibold text-gray-900">
							Temperature Trends (Last 30 Days)
						</h3>
						{#if recentTemperatureData.length > 0}
							<TemperatureChart
								data={recentTemperatureData}
								title="Daily Temperature (Last 30 Days)"
								type="line"
								height={250}
								showMinMax={true}
							/>
						{:else}
							<div class="flex items-center justify-center py-16">
								<div class="text-center">
									<div
										class="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
									></div>
									<p class="mt-2 text-sm text-gray-500">Loading temperature data...</p>
								</div>
							</div>
						{/if}
					</div>

					<!-- Current Year Temperature -->
					<div class="rounded-lg bg-white p-4 shadow-sm">
						<h3 class="mb-3 text-lg font-semibold text-gray-900">Current Year Temperature</h3>
						{#if temperatureData.length > 0}
							{@const currentYearTempData = temperatureData.filter(
								(d) => new Date(d.date).getFullYear() === currentYear
							)}
							<TemperatureChart
								data={currentYearTempData}
								title="{currentYear} Temperature Trend"
								type="line"
								height={250}
								showMinMax={false}
							/>
						{:else}
							<div class="flex items-center justify-center py-16">
								<div class="text-center">
									<div
										class="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
									></div>
									<p class="mt-2 text-sm text-gray-500">Loading temperature data...</p>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Yearly Comparison Cards -->
			<YearlyComparisonPanel
				{displayedComparison}
				{loadingData}
				bind:showMonthlyComparison
				{currentMonthName}
				{currentYear}
				{averageYearlyTotal}
				{wettestYear}
				{driestYear}
				{selectedMonth}
				{availableMonths}
				on:monthChanged={handleMonthChanged}
			/>

			<!-- Drought Analysis / Temperature Extremes -->
			{#if !showTemperatureView}
				{#if droughtPeriods.length > 0}
					<div class="rounded-lg bg-white p-4 shadow-sm">
						<div class="mb-4 flex items-center">
							<div class="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
								<svg
									class="h-5 w-5 text-orange-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
									></path>
								</svg>
							</div>
							<div>
								<h3 class="text-lg font-semibold text-gray-900">Notable Drought Periods</h3>
								<p class="text-xs text-gray-600">
									Dry spells of 7+ consecutive days (last 90 days)
								</p>
							</div>
						</div>

						<div class="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
							{#each droughtPeriods.slice(0, 6) as drought, index}
								<div
									class="group relative overflow-hidden rounded-lg border border-gray-200 bg-gradient-to-r from-orange-50 to-yellow-50 p-3 transition-all duration-200 hover:border-orange-300 hover:shadow-md"
								>
									<div class="flex items-start justify-between">
										<div class="flex-1">
											<div class="mb-2 flex items-center">
												<div
													class="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-200 text-orange-800"
												>
													<span class="text-xs font-bold">{index + 1}</span>
												</div>
												<div class="flex items-center text-orange-700">
													<svg class="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
														<path
															fill-rule="evenodd"
															d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
															clip-rule="evenodd"
														></path>
													</svg>
													<span class="text-sm font-semibold">{drought.duration} days</span>
												</div>
											</div>
											<p class="mb-1 text-xs font-medium text-gray-800">No significant rainfall</p>
											<div class="flex items-center text-xs text-gray-600">
												<svg class="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
													<path
														fill-rule="evenodd"
														d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
														clip-rule="evenodd"
													></path>
												</svg>
												<span>
													{format(new Date(drought.start), 'dd MMM')} - {format(
														new Date(drought.end),
														'dd MMM yyyy'
													)}
												</span>
											</div>
										</div>
										<div class="ml-2 flex flex-col items-end">
											<div class="rounded-full bg-orange-200 px-2 py-0.5">
												<span class="text-xs font-medium text-orange-800">
													{drought.duration >= 14
														? 'Severe'
														: drought.duration >= 10
															? 'Moderate'
															: 'Mild'}
												</span>
											</div>
										</div>
									</div>

									<!-- Progress bar showing drought severity -->
									<div class="mt-2">
										<div class="h-1 w-full rounded-full bg-orange-200">
											<div
												class="h-1 rounded-full transition-all duration-300 {drought.duration >= 14
													? 'bg-red-500'
													: drought.duration >= 10
														? 'bg-orange-500'
														: 'bg-yellow-500'}"
												style="width: {Math.min((drought.duration / 21) * 100, 100)}%"
											></div>
										</div>
										<div class="mt-1 flex justify-between text-xs text-gray-500">
											<span>7 days</span>
											<span>21+ days</span>
										</div>
									</div>
								</div>
							{/each}
						</div>

						{#if droughtPeriods.length > 6}
							<div class="mt-3 text-center">
								<p class="text-xs text-gray-500">
									Showing 6 of {droughtPeriods.length} drought periods
								</p>
							</div>
						{/if}

						{#if droughtPeriods.length === 0}
							<div class="py-6 text-center">
								<div
									class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-100"
								>
									<svg
										class="h-5 w-5 text-green-600"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M5 13l4 4L19 7"
										></path>
									</svg>
								</div>
								<h4 class="mt-2 text-sm font-medium text-gray-900">
									No significant drought periods
								</h4>
								<p class="mt-1 text-xs text-gray-500">
									No dry spells of 7+ days in the last 90 days
								</p>
							</div>
						{/if}
					</div>
				{/if}
			{:else}
				<!-- Temperature Extremes Analysis -->
				{#if temperatureExtremes.heatWaves.length > 0 || temperatureExtremes.coldSnaps.length > 0}
					<div class="rounded-lg bg-white p-4 shadow-sm">
						<div class="mb-4 flex items-center">
							<div class="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
								<svg
									class="h-5 w-5 text-red-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
									></path>
								</svg>
							</div>
							<div>
								<h3 class="text-lg font-semibold text-gray-900">Temperature Extremes</h3>
								<p class="text-xs text-gray-600">Heat waves and cold snaps (last 90 days)</p>
							</div>
						</div>

						<!-- Heat Waves -->
						{#if temperatureExtremes.heatWaves.length > 0}
							<div class="mb-4">
								<h4 class="text-md mb-2 font-medium text-gray-900">
									Heat Waves (3+ days above 25°C)
								</h4>
								<div class="grid gap-2 sm:grid-cols-1 lg:grid-cols-2">
									{#each temperatureExtremes.heatWaves.slice(0, 4) as heatWave, index}
										<div
											class="group relative overflow-hidden rounded-lg border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 p-2 transition-all duration-200 hover:border-red-300 hover:shadow-md"
										>
											<div class="flex items-start justify-between">
												<div class="flex-1">
													<div class="mb-1 flex items-center">
														<div
															class="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-200 text-red-800"
														>
															<span class="text-xs font-bold">{index + 1}</span>
														</div>
														<div class="flex items-center text-red-700">
															<span class="text-xs font-semibold">{heatWave.duration} days</span>
														</div>
													</div>
													<p class="mb-1 text-xs font-medium text-gray-800">
														Peak: {heatWave.maxTemp.toFixed(1)}°C
													</p>
													<div class="flex items-center text-xs text-gray-600">
														<span>
															{format(new Date(heatWave.start), 'dd MMM')} - {format(
																new Date(heatWave.end),
																'dd MMM yyyy'
															)}
														</span>
													</div>
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Cold Snaps -->
						{#if temperatureExtremes.coldSnaps.length > 0}
							<div class="mb-4">
								<h4 class="text-md mb-2 font-medium text-gray-900">
									Cold Snaps (3+ days below -2°C)
								</h4>
								<div class="grid gap-2 sm:grid-cols-1 lg:grid-cols-2">
									{#each temperatureExtremes.coldSnaps.slice(0, 4) as coldSnap, index}
										<div
											class="group relative overflow-hidden rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-2 transition-all duration-200 hover:border-blue-300 hover:shadow-md"
										>
											<div class="flex items-start justify-between">
												<div class="flex-1">
													<div class="mb-1 flex items-center">
														<div
															class="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-200 text-blue-800"
														>
															<span class="text-xs font-bold">{index + 1}</span>
														</div>
														<div class="flex items-center text-blue-700">
															<span class="text-xs font-semibold">{coldSnap.duration} days</span>
														</div>
													</div>
													<p class="mb-1 text-sm font-medium text-gray-800">
														Low: {coldSnap.minTemp.toFixed(1)}°C
													</p>
													<div class="flex items-center text-xs text-gray-600">
														<span>
															{format(new Date(coldSnap.start), 'dd MMM')} - {format(
																new Date(coldSnap.end),
																'dd MMM yyyy'
															)}
														</span>
													</div>
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						{#if temperatureExtremes.heatWaves.length === 0 && temperatureExtremes.coldSnaps.length === 0}
							<div class="py-8 text-center">
								<div
									class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100"
								>
									<svg
										class="h-6 w-6 text-green-600"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M5 13l4 4L19 7"
										></path>
									</svg>
								</div>
								<h4 class="mt-2 text-sm font-medium text-gray-900">
									No extreme temperature events
								</h4>
								<p class="mt-1 text-sm text-gray-500">
									No significant heat waves or cold snaps in the last 90 days
								</p>
							</div>
						{/if}
					</div>
				{/if}
			{/if}

			<!-- Enhanced Statistics Section -->
			<EnhancedStatisticsPanel {enhancedStats} {loadingData} />
		{/if}
	</div>

	<!-- Data Sources Footnote -->
	<div class="mt-8 border-t border-gray-200 bg-gray-200 pt-6">
		<div class="mx-auto max-w-7xl px-4">
			<div class="rounded-lg bg-gray-200 p-4">
				<h4 class="mb-2 text-sm font-semibold text-gray-700">Data Sources</h4>
				<div class="space-y-1 text-xs text-gray-600">
					<p>
						<strong>Weather Data:</strong> Historical and current weather data provided by
						<a
							href="https://open-meteo.com/"
							target="_blank"
							rel="noopener noreferrer"
							class="text-blue-600 underline hover:text-blue-800"
						>
							Open-Meteo API
						</a>
						- Open-source weather API with historical data from 1940-present
					</p>
					<p>
						<strong>Location Data:</strong> UK postcode geocoding provided by
						<a
							href="https://postcodes.io/"
							target="_blank"
							rel="noopener noreferrer"
							class="text-blue-600 underline hover:text-blue-800"
						>
							Postcodes.io
						</a>
						- Free UK postcode lookup API
					</p>
					<p>
						<strong>Data Coverage:</strong> Rainfall and temperature data spans up to 10 years of historical
						records. Current weather conditions are updated hourly. All data is cached locally to minimise
						API requests.
					</p>
					<p class="mt-2 text-gray-500">
						<a
							href="https://github.com/lukeoregan/rainfall-dashboard"
							target="_blank"
							rel="noopener noreferrer"
							class="text-blue-600 underline hover:text-blue-800">View source code on GitHub</a
						>
						-
						<em
							>Last updated: {new Date().toLocaleDateString('en-GB', {
								year: 'numeric',
								month: 'long',
								day: 'numeric',
								hour: '2-digit',
								minute: '2-digit'
							})}</em
						>
						-
					</p>
					<h4 class="mt-4 mb-2 text-sm font-semibold text-gray-700">Support My Project</h4>
					<p class="text-xs text-gray-600">
						<a href="https://buymeacoffee.com/lukeoregan" target="_blank" rel="noopener noreferrer"
							><strong>Buy me a coffee</strong> - buymeacoffee.com/lukeoregan</a
						>
					</p>
					<p class="text-xs text-gray-600">
						<i class="fa-brands fa-bitcoin"></i> <strong>Bitcoin:</strong>
						<a
							href="https://www.blockchain.com/btc/address/bc1qmpl0fpn35ya78z2evj794kc7uu8sd4x8n69640"
							target="_blank"
							rel="noopener noreferrer"
						>
							bc1qmpl0fpn35ya78z2evj794kc7uu8sd4x8n69640
						</a>
					</p>
					<p class="text-xs text-gray-600">
						<i class="fa-brands fa-ethereum"></i> <strong>Ethereum:</strong>
						<a
							href="https://etherscan.io/address/0xF63794858A90629f7366e4d2e5817e024c2Ae365"
							target="_blank"
							rel="noopener noreferrer"
						>
							0xF63794858A90629f7366e4d2e5817e024c2Ae365
						</a>
					</p>
					<p class="text-xs text-gray-600">
						<i class="fa-kit fa-solana"></i> <strong>Solana:</strong>
						<a
							href="https://explorer.solana.com/address/2zgoiSUhb8yo3eu35te9BcSQoa6wdVTmpi8AEHd49Jdj"
							target="_blank"
							rel="noopener noreferrer"
						>
							2zgoiSUhb8yo3eu35te9BcSQoa6wdVTmpi8AEHd49Jdj
						</a>
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
