<script lang="ts">
	import { onMount } from 'svelte';
	import RainfallChart from './RainfallChart.svelte';
	import TemperatureChart from './TemperatureChart.svelte';
	import WindChart from './WindChart.svelte';
	import SolarChart from './SolarChart.svelte';
	import LocationMap from './LocationMap.svelte';
	import FootNote from './FootNote.svelte';
	import YearlyComparisonPanel from './panels/YearlyComparisonPanel.svelte';
	import EnhancedStatisticsPanel from './panels/EnhancedStatisticsPanel.svelte';
	import GrowingInsightsPanel from './panels/GrowingInsightsPanel.svelte';
	import WeatherExtremesPanel from './panels/WeatherExtremesPanel.svelte';
	import CurrentWeatherPanel from './panels/CurrentWeatherPanel.svelte';
	import KeyStatisticsPanel from './panels/KeyStatisticsPanel.svelte';
	import type {
		Location,
		RainfallData,
		YearlyComparison,
		TemperatureData,
		TemperatureStats,
		TemperatureComparison,
		WindData,
		WindStats,
		WindComparison,
		WindExtremes,
		SolarData,
		SolarStats,
		SolarComparison,
		SolarExtremes,
		SolarEnergyInsights,
		GrowingInsights,
		EnhancedStatistics
	} from '../types.js';
	import {
		getLocationFromPostcode,
		getTenYearRainfallData,
		getCurrentYearRainfall,
		getCurrentWeather,
		getTenYearTemperatureData,
		getTenYearWindData,
		getTenYearSolarData,
		getRateLimiterStats
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
		calculateAllEnhancedStatistics,
		calculateWindStats,
		calculateYearlyWindComparison,
		calculateMonthlyWindComparison,
		getRecentWind,
		calculateWindExtremes,
		calculateSolarStats,
		calculateYearlySolarComparison,
		calculateMonthlySolarComparison,
		getRecentSolar,
		calculateSolarExtremes,
		calculateSolarEnergyInsights,
		calculateGrowingInsights
	} from '../utils/dataProcessing.js';
	import { format, parseISO } from 'date-fns';
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
	let cacheStats: {
		totalEntries: number;
		totalSize: number;
		oldestEntry: Date | null;
		typeBreakdown: Record<string, number>;
	} = {
		totalEntries: 0,
		totalSize: 0,
		oldestEntry: null,
		typeBreakdown: {}
	};
	let rateLimiterStats: { currentCalls: number; limit: number; resetTime: number } = {
		currentCalls: 0,
		limit: 0,
		resetTime: 0
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

	// Wind data
	let windData: WindData[] = [];
	let recentWindData: WindData[] = [];
	let windStats: WindStats | null = null;
	let windComparison: WindComparison[] = [];
	let windExtremes: WindExtremes = {
		strongestWinds: [],
		calmPeriods: []
	};

	// Solar data
	let solarData: SolarData[] = [];
	let recentSolarData: SolarData[] = [];
	let solarStats: SolarStats | null = null;
	let solarComparison: SolarComparison[] = [];
	let solarExtremes: SolarExtremes = {
		brightestDays: [],
		dullestDays: [],
		solarPeaks: [],
		lowSolarPeriods: []
	};
	let solarEnergyInsights: SolarEnergyInsights | null = null;
	let growingInsights: GrowingInsights | null = null;

	let showTemperatureView = false;
	let showWindView = false;
	let showSolarView = false;
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
		windData = [];
		solarData = [];
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

			// Load wind data
			windData = await getTenYearWindData(location.latitude, location.longitude);
			recentWindData = getRecentWind(windData, 30);
			windStats = calculateWindStats(windData);
			windExtremes = calculateWindExtremes(windData.slice(-90));

			// Load solar data
			solarData = await getTenYearSolarData(location.latitude, location.longitude);
			recentSolarData = getRecentSolar(solarData, 30);
			solarStats = calculateSolarStats(solarData);
			solarExtremes = calculateSolarExtremes(solarData.slice(-90));
			solarEnergyInsights = calculateSolarEnergyInsights(solarData, location.latitude);
			growingInsights = calculateGrowingInsights(temperatureData, solarData);

			loadingCharts = false;

			// Calculate initial yearly comparisons for rainfall, temperature, and wind
			const initialYearlyRainfallComparison = calculateYearlyComparison(historicalData);
			const initialYearlyTemperatureComparison =
				calculateYearlyTemperatureComparison(temperatureData);
			const initialYearlyWindComparison = calculateYearlyWindComparison(windData);

			// Calculate enhanced statistics
			if (historicalData.length > 0 && temperatureData.length > 0) {
				enhancedStats = calculateAllEnhancedStatistics(
					historicalData,
					temperatureData,
					windData,
					initialYearlyRainfallComparison,
					initialYearlyTemperatureComparison,
					initialYearlyWindComparison
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

	function updateRateLimiterStats() {
		rateLimiterStats = getRateLimiterStats();
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

	function clearAllCache() {
		cacheService.clearAll();
		updateCacheStats();
	}

	// Load saved postcode on mount
	onMount(() => {
		const savedPostcode = postcodeStorage.load();
		if (savedPostcode) {
			postcode = savedPostcode;
		}
		updateCacheStats();
		updateRateLimiterStats();

		// Update rate limiter stats every 5 seconds
		const interval = setInterval(() => {
			updateRateLimiterStats();
		}, 5000);

		return () => clearInterval(interval);
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
		const currentYear = now.getFullYear();
		const currentMonthIndex = now.getMonth();

		// For the current year, only show months that have passed or are current
		for (let i = 0; i <= currentMonthIndex; i++) {
			const monthName = new Date(currentYear, i).toLocaleString('default', { month: 'long' });
			months.push({ index: i, name: monthName });
		}

		// For previous years in monthly view, we should have access to all 12 months
		// But for current year, we only show up to current month
		return months;
	})();

	function handleMonthChanged(event: CustomEvent<{ month: number }>) {
		selectedMonth = event.detail.month;
	}

	$: windComparison =
		windData.length > 0
			? showMonthlyComparison
				? calculateMonthlyWindComparison(windData, selectedMonth)
				: calculateYearlyWindComparison(windData)
			: [];
	$: averageWindSpeed =
		windComparison.length > 0
			? windComparison.reduce((sum, year) => sum + year.meanWindSpeed, 0) / windComparison.length
			: 0;
	$: windiestYear =
		windComparison.length > 0
			? windComparison.reduce((max, year) => (year.maxGusts > max.maxGusts ? year : max))
			: null;
	$: calmestYear =
		windComparison.length > 0
			? windComparison.reduce((min, year) => (year.meanWindSpeed < min.meanWindSpeed ? year : min))
			: null;
</script>

<div class="min-h-screen bg-gray-50">
	<div class="mx-auto max-w-7xl pt-4">
		<!-- Header -->
		<div class="mb-4 rounded-lg bg-white p-4 shadow-sm">
			<h1 class="mb-2 text-2xl font-bold text-gray-900">UK Weather Analytics Dashboard</h1>
			<p class="mb-4 text-sm text-gray-600">
				Comprehensive weather analysis including rainfall, temperature, wind, and solar data for any
				UK location
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
						<button
							on:click={clearAllCache}
							class="rounded-md bg-orange-100 px-2 py-1 text-xs text-orange-700 hover:bg-orange-200 focus:outline-none"
						>
							Clear all cache
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
					<!-- Rate Limiter Stats -->
					<div class="mb-3 border-b border-gray-200 pb-2">
						<div class="mb-1 text-xs font-medium text-gray-700">API Rate Limiting:</div>
						<div class="grid grid-cols-1 gap-1 text-xs text-gray-600 sm:grid-cols-3">
							<div>
								<span class="font-medium">Current calls:</span>
								{rateLimiterStats.currentCalls}/{rateLimiterStats.limit}
							</div>
							<div>
								<span class="font-medium">Reset in:</span>
								{Math.ceil(rateLimiterStats.resetTime / 1000)}s
							</div>
							<div class="flex items-center">
								<span class="font-medium">Status:</span>
								<span
									class="ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {rateLimiterStats.currentCalls <
									rateLimiterStats.limit * 0.8
										? 'bg-green-100 text-green-800'
										: rateLimiterStats.currentCalls < rateLimiterStats.limit
											? 'bg-yellow-100 text-yellow-800'
											: 'bg-red-100 text-red-800'}"
								>
									{rateLimiterStats.currentCalls < rateLimiterStats.limit * 0.8
										? 'Good'
										: rateLimiterStats.currentCalls < rateLimiterStats.limit
											? 'Caution'
											: 'Limited'}
								</span>
							</div>
						</div>
					</div>

					<!-- Cache Stats -->
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

					{#if Object.keys(cacheStats.typeBreakdown).length > 0}
						<div class="mt-2 border-t border-gray-200 pt-2">
							<div class="mb-1 text-xs font-medium text-gray-700">Cache breakdown:</div>
							<div class="grid grid-cols-2 gap-1 text-xs text-gray-600 sm:grid-cols-4">
								{#each Object.entries(cacheStats.typeBreakdown) as [type, count]}
									<div>
										<span class="font-medium">{type}:</span>
										{count}
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<p class="mt-1 text-xs text-gray-500">
						Data is cached for 24 hours (historical), 6 hours (current year), and 1 hour (current
						weather) to reduce API calls. Comprehensive data fetching reduces redundant requests.
						Rate limiting: {rateLimiterStats.limit} calls/minute.
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
			<CurrentWeatherPanel {currentWeather} {loadingWeather} />

			<!-- Data View Toggle -->
			<div class="mb-4 rounded-lg bg-white p-4 shadow-sm">
				<div class="flex items-center justify-center">
					<div class="flex items-center space-x-4">
						<button
							on:click={() => {
								showTemperatureView = false;
								showWindView = false;
								showSolarView = false;
							}}
							class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {!showTemperatureView &&
							!showWindView &&
							!showSolarView
								? 'bg-blue-600 text-white'
								: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
						>
							<i class="fa-solid fa-cloud-rain mr-2"></i>
							Rainfall Analysis
						</button>
						<button
							on:click={() => {
								showTemperatureView = true;
								showWindView = false;
								showSolarView = false;
							}}
							class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {showTemperatureView
								? 'bg-red-600 text-white'
								: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
						>
							<i class="fa-solid fa-thermometer-half mr-2"></i>
							Temperature Analysis
						</button>
						<button
							on:click={() => {
								showTemperatureView = false;
								showWindView = true;
								showSolarView = false;
							}}
							class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {showWindView
								? 'bg-cyan-600 text-white'
								: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
						>
							<i class="fa-solid fa-wind mr-2"></i>
							Wind Analysis
						</button>
						<button
							on:click={() => {
								showTemperatureView = false;
								showWindView = false;
								showSolarView = true;
							}}
							class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {showSolarView
								? 'bg-yellow-600 text-white'
								: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
						>
							<i class="fa-solid fa-sun mr-2"></i>
							Solar & Growing Analysis
						</button>
					</div>
				</div>
			</div>

			<!-- Key Statistics -->
			<KeyStatisticsPanel
				{loadingData}
				{showSolarView}
				{showWindView}
				{showTemperatureView}
				{solarStats}
				{solarEnergyInsights}
				{solarData}
				{windStats}
				{temperatureStats}
				{temperatureExtremes}
				{currentYearTotal}
				{currentYear}
				{last90DaysTotal}
				{percentiles}
				{droughtPeriods}
			/>

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
				{:else if showWindView}
					<!-- Recent Wind Data -->
					<div class="rounded-lg bg-white p-4 shadow-sm">
						<h3 class="mb-3 text-lg font-semibold text-gray-900">Wind Patterns (Last 30 Days)</h3>
						{#if recentWindData.length > 0}
							<WindChart
								data={recentWindData}
								title="Daily Wind Speed & Gusts (Last 30 Days)"
								type="line"
								height={250}
								showDirection={false}
								showGusts={true}
							/>
						{:else}
							<div class="flex items-center justify-center py-16">
								<div class="text-center">
									<div
										class="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
									></div>
									<p class="mt-2 text-sm text-gray-500">Loading wind data...</p>
								</div>
							</div>
						{/if}
					</div>

					<!-- Wind Direction Distribution -->
					<div class="rounded-lg bg-white p-4 shadow-sm">
						<h3 class="mb-3 text-lg font-semibold text-gray-900">Wind Direction Distribution</h3>
						{#if recentWindData.length > 0}
							<WindChart
								data={recentWindData}
								title="Wind Direction Frequency (Last 30 Days)"
								type="polar"
								height={250}
								showDirection={true}
								showGusts={false}
							/>
						{:else}
							<div class="flex items-center justify-center py-16">
								<div class="text-center">
									<div
										class="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
									></div>
									<p class="mt-2 text-sm text-gray-500">Loading wind data...</p>
								</div>
							</div>
						{/if}
					</div>
				{:else if showSolarView}
					<!-- Recent Solar Data -->
					<div class="rounded-lg bg-white p-4 shadow-sm">
						<h3 class="mb-3 text-lg font-semibold text-gray-900">Solar Radiation (Last 30 Days)</h3>
						{#if recentSolarData.length > 0}
							<SolarChart
								data={recentSolarData}
								title="Solar Radiation (Last 30 Days)"
								type="line"
								height={300}
							/>
						{:else}
							<div class="flex items-center justify-center py-16">
								<div class="text-center">
									<div
										class="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
									></div>
									<p class="mt-2 text-sm text-gray-500">Loading solar data...</p>
								</div>
							</div>
						{/if}
					</div>

					<!-- Energy Potential -->
					<div class="rounded-lg bg-white p-4 shadow-sm">
						<h3 class="mb-3 text-lg font-semibold text-gray-900">Solar Energy Potential</h3>
						{#if recentSolarData.length > 0}
							<SolarChart
								data={recentSolarData}
								title="Energy Potential (Last 30 Days)"
								type="bar"
								height={300}
								showEnergy={true}
							/>
						{:else}
							<div class="flex items-center justify-center py-16">
								<div class="text-center">
									<div
										class="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
									></div>
									<p class="mt-2 text-sm text-gray-500">Loading solar data...</p>
								</div>
							</div>
						{/if}
					</div>
				{:else if showTemperatureView}
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
				{:else}
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
				{/if}
			</div>

			<!-- Growing Insights Panel -->
			{#if showSolarView}
				<GrowingInsightsPanel {growingInsights} {solarEnergyInsights} />
			{/if}

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

			<!-- Drought Analysis / Temperature Extremes / Wind Extremes -->
			<WeatherExtremesPanel
				{showWindView}
				{showTemperatureView}
				{windExtremes}
				{droughtPeriods}
				{temperatureExtremes}
				temperatureAnomalies={{
					hotAnomalies: temperatureData
						.filter((d) => {
							// Get last 90 days
							const ninetyDaysAgo = new Date();
							ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
							return new Date(d.date) >= ninetyDaysAgo;
						})
						.filter((d) => d.temperatureMax > 0) // Has temperature data
						.map((d) => {
							const avgTemp =
								temperatureData
									.filter((td) => {
										const ninetyDaysAgo = new Date();
										ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
										return new Date(td.date) >= ninetyDaysAgo;
									})
									.reduce((sum, td) => sum + td.temperatureMax, 0) /
								temperatureData.filter((td) => {
									const ninetyDaysAgo = new Date();
									ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
									return new Date(td.date) >= ninetyDaysAgo;
								}).length;

							return {
								date: d.date,
								temperature: d.temperatureMax,
								deviation: d.temperatureMax - avgTemp
							};
						})
						.filter((d) => d.deviation >= 5) // 5°C+ above average
						.sort((a, b) => b.deviation - a.deviation)
						.slice(0, 10),
					coldAnomalies: temperatureData
						.filter((d) => {
							// Get last 90 days
							const ninetyDaysAgo = new Date();
							ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
							return new Date(d.date) >= ninetyDaysAgo;
						})
						.filter((d) => d.temperatureMin !== undefined) // Has temperature data
						.map((d) => {
							const avgTemp =
								temperatureData
									.filter((td) => {
										const ninetyDaysAgo = new Date();
										ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
										return new Date(td.date) >= ninetyDaysAgo;
									})
									.reduce((sum, td) => sum + (td.temperatureMin || 0), 0) /
								temperatureData.filter((td) => {
									const ninetyDaysAgo = new Date();
									ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
									return new Date(td.date) >= ninetyDaysAgo;
								}).length;

							return {
								date: d.date,
								temperature: d.temperatureMin || 0,
								deviation: (d.temperatureMin || 0) - avgTemp
							};
						})
						.filter((d) => d.deviation <= -5) // 5°C+ below average
						.sort((a, b) => a.deviation - b.deviation)
						.slice(0, 10),
					averageTemperature:
						temperatureData
							.filter((d) => {
								// Get last 90 days
								const ninetyDaysAgo = new Date();
								ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
								return new Date(d.date) >= ninetyDaysAgo;
							})
							.reduce((sum, d) => sum + (d.temperatureMax + (d.temperatureMin || 0)) / 2, 0) /
							temperatureData.filter((d) => {
								const ninetyDaysAgo = new Date();
								ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
								return new Date(d.date) >= ninetyDaysAgo;
							}).length || 0
				}}
				significantTemperatureEvents={{
					recordHighs: temperatureData
						.filter((d) => {
							// Get last 90 days
							const ninetyDaysAgo = new Date();
							ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
							return new Date(d.date) >= ninetyDaysAgo;
						})
						.filter((d) => d.temperatureMax > 30) // Significant high temperatures
						.sort((a, b) => b.temperatureMax - a.temperatureMax)
						.slice(0, 8)
						.map((d) => ({
							date: d.date,
							temperature: d.temperatureMax,
							description:
								d.temperatureMax > 35
									? 'Exceptional heat'
									: d.temperatureMax > 32
										? 'Very hot day'
										: 'Hot day'
						})),
					recordLows: temperatureData
						.filter((d) => {
							// Get last 90 days
							const ninetyDaysAgo = new Date();
							ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
							return new Date(d.date) >= ninetyDaysAgo;
						})
						.filter((d) => d.temperatureMin !== undefined && d.temperatureMin < 5) // Significant low temperatures
						.sort((a, b) => (a.temperatureMin || 0) - (b.temperatureMin || 0))
						.slice(0, 8)
						.map((d) => ({
							date: d.date,
							temperature: d.temperatureMin || 0,
							description:
								(d.temperatureMin || 0) < -5
									? 'Extreme cold'
									: (d.temperatureMin || 0) < 0
										? 'Freezing day'
										: 'Cold day'
						})),
					temperatureSwings: temperatureData
						.filter((d) => {
							// Get last 90 days
							const ninetyDaysAgo = new Date();
							ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
							return new Date(d.date) >= ninetyDaysAgo;
						})
						.filter(
							(d) =>
								d.temperatureMin !== undefined && d.temperatureMax - (d.temperatureMin || 0) >= 15
						) // 15°C+ daily range
						.sort(
							(a, b) =>
								b.temperatureMax -
								(b.temperatureMin || 0) -
								(a.temperatureMax - (a.temperatureMin || 0))
						)
						.slice(0, 8)
						.map((d) => ({
							date: d.date,
							minTemp: d.temperatureMin || 0,
							maxTemp: d.temperatureMax,
							range: d.temperatureMax - (d.temperatureMin || 0)
						}))
				}}
			/>

			<!-- Enhanced Statistics Section -->
			<EnhancedStatisticsPanel {enhancedStats} {loadingData} />
		{/if}
	</div>

	<!-- Data Sources Footnote -->
	<FootNote />
</div>
