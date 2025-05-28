<script lang="ts">
	import { onMount } from 'svelte';
	import RainfallChart from './RainfallChart.svelte';
	import TemperatureChart from './TemperatureChart.svelte';
	import LocationMap from './LocationMap.svelte';
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
	let error = '';
	let historicalData: RainfallData[] = [];
	let currentYearData: RainfallData[] = [];
	let recentData: RainfallData[] = [];
	let yearlyComparison: YearlyComparison[] = [];
	let currentWeather: any = null;
	let showMonthlyComparison = false;
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
	// Add new state for showing all comparison cards
	let showAllComparisons = false;

	async function searchLocation() {
		if (!postcode.trim()) {
			error = 'Please enter a postcode';
			return;
		}

		loading = true;
		error = '';

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

		try {
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

			// Get current weather
			currentWeather = await getCurrentWeather(location.latitude, location.longitude);

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
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load weather data';
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
			? calculateEnhancedMonthlyComparison(historicalData, temperatureData, currentMonth)
			: historicalData.length > 0
				? calculateMonthlyComparison(historicalData, currentMonth)
				: [];
	$: temperatureComparison =
		temperatureData.length > 0
			? showMonthlyComparison
				? calculateMonthlyTemperatureComparison(temperatureData, currentMonth)
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
			{#if currentWeather}
				<div class="mb-4 rounded-lg bg-white p-4 shadow-sm">
					<h2 class="mb-3 text-lg font-semibold text-gray-900">Current Conditions</h2>
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
				</div>
			{/if}

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
				{#if !showTemperatureView}
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
				{#if !showTemperatureView}
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
							<p class="text-gray-500">No recent data available</p>
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
							<p class="text-gray-500">No current year data available</p>
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
							<p class="text-gray-500">No recent temperature data available</p>
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
							<p class="text-gray-500">No temperature data available</p>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Yearly Comparison Cards -->
			{#if displayedComparison.length > 0}
				<div class="mb-4 rounded-lg bg-white p-4 shadow-sm">
					<div class="mb-4 flex items-center justify-between">
						<h3 class="text-lg font-semibold text-gray-900">
							{showMonthlyComparison ? `${currentMonthName} Comparison` : '10-Year Comparison'}
						</h3>
						<div class="flex items-center space-x-2">
							<span class="text-xs text-gray-600"> Yearly view </span>
							<button
								on:click={() => (showMonthlyComparison = !showMonthlyComparison)}
								aria-label="Toggle monthly view"
								class="relative inline-flex h-5 w-9 items-center rounded-full bg-gray-200 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none {showMonthlyComparison
									? 'bg-blue-600'
									: 'bg-gray-200'}"
							>
								<span
									class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform {showMonthlyComparison
										? 'translate-x-5'
										: 'translate-x-1'}"
								></span>
							</button>
							<span class="text-xs text-gray-600"> Monthly view </span>
						</div>
					</div>

					<!-- Visual Cards Layout with Show More functionality -->
					<div class="relative">
						<div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
							{#each displayedComparison as year, index}
								{@const percentageVsAverage = (year.totalRainfall / averageYearlyTotal - 1) * 100}
								{@const isAboveAverage = year.totalRainfall > averageYearlyTotal}
								{@const isCurrentYear = year.year === currentYear}
								{@const maxRainfall = Math.max(...displayedComparison.map((y) => y.totalRainfall))}
								{@const rainfallPercentage = (year.totalRainfall / maxRainfall) * 100}
								{@const isInFirstRow = index < 4}
								{@const isInSecondRow = index >= 4 && index < 8}
								{@const shouldShow = showAllComparisons || isInFirstRow || isInSecondRow}

								{#if shouldShow}
									<div
										class="group relative overflow-hidden rounded-lg border transition-all duration-200 hover:shadow-md {isCurrentYear
											? 'border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 ring-1 ring-blue-200'
											: isAboveAverage
												? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 hover:border-green-300'
												: 'border-red-200 bg-gradient-to-br from-red-50 to-orange-50 hover:border-red-300'} {!showAllComparisons &&
										isInSecondRow
											? 'pointer-events-none opacity-40 blur-[1px]'
											: ''}"
									>
										<!-- Year Badge -->
										<div class="absolute top-2 right-2">
											{#if isCurrentYear}
												<span
													class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
												>
													<i class="fa-solid fa-circle-check mr-1"></i>
													Current
												</span>
											{:else if index === 0 && !isCurrentYear}
												<span
													class="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800"
												>
													Latest
												</span>
											{/if}
										</div>

										<div class="p-3">
											<!-- Year and Trend Icon -->
											<div class="mb-2 flex items-center">
												<h4
													class="text-xl font-bold {isCurrentYear
														? 'text-blue-900'
														: 'text-gray-900'}"
												>
													{year.year}
												</h4>
												<div class="ml-1">
													{#if isAboveAverage}
														<svg
															class="h-4 w-4 text-green-500"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
															></path>
														</svg>
													{:else}
														<svg
															class="h-4 w-4 text-red-500"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
															></path>
														</svg>
													{/if}
												</div>
											</div>

											<!-- Main Rainfall Amount -->
											<div class="mb-3">
												<p
													class="text-2xl font-bold {isCurrentYear
														? 'text-blue-700'
														: isAboveAverage
															? 'text-green-700'
															: 'text-red-700'}"
												>
													{year.totalRainfall.toFixed(0)}
													<span class="text-sm font-medium text-gray-600">mm</span>
												</p>
												<p class="text-xs text-gray-600">
													{showMonthlyComparison ? `${currentMonthName} total` : 'Total rainfall'}
												</p>
											</div>

											<!-- Visual Progress Bar -->
											<div class="mb-3">
												<div class="mb-1 flex justify-between text-xs text-gray-600">
													<span>vs max year</span>
													<span>{rainfallPercentage.toFixed(0)}%</span>
												</div>
												<div class="h-1.5 w-full rounded-full bg-gray-200">
													<div
														class="h-1.5 rounded-full transition-all duration-500 {isCurrentYear
															? 'bg-gradient-to-r from-blue-400 to-blue-600'
															: isAboveAverage
																? 'bg-gradient-to-r from-green-400 to-green-600'
																: 'bg-gradient-to-r from-red-400 to-red-600'}"
														style="width: {rainfallPercentage}%"
													></div>
												</div>
											</div>

											<!-- Statistics Grid -->
											<div class="grid grid-cols-2 gap-2 text-xs">
												<div class="rounded-lg bg-white/60 p-2">
													<p class="font-medium text-gray-700">
														{showMonthlyComparison ? 'Daily Avg' : 'Monthly Avg'}
													</p>
													<p class="text-sm font-bold text-gray-900">
														{year.averageMonthly.toFixed(1)} mm
													</p>
												</div>
												<div class="rounded-lg bg-white/60 p-2">
													<p class="font-medium text-gray-700">Wet Days</p>
													<p class="text-sm font-bold text-gray-900">{year.wetDays}</p>
												</div>
												{#if year.averageTemperature !== undefined}
													<div class="rounded-lg bg-white/60 p-2">
														<p class="font-medium text-gray-700">Avg Temp</p>
														<p class="text-sm font-bold text-gray-900">
															{year.averageTemperature.toFixed(1)}°C
														</p>
													</div>
													<div class="rounded-lg bg-white/60 p-2">
														<p class="font-medium text-gray-700">Range</p>
														<p class="text-sm font-bold text-gray-900">
															{year.minTemperature?.toFixed(0)}° - {year.maxTemperature?.toFixed(
																0
															)}°C
														</p>
													</div>
												{/if}
											</div>

											<!-- Comparison Badge -->
											<div class="mt-3 flex items-center justify-center">
												<div
													class="rounded-full px-2 py-1 text-xs font-medium {isAboveAverage
														? 'bg-green-100 text-green-800'
														: 'bg-red-100 text-red-800'}"
												>
													{isAboveAverage ? '+' : ''}{percentageVsAverage.toFixed(0)}% vs avg
												</div>
											</div>
										</div>
									</div>
								{/if}
							{/each}
						</div>

						<!-- Show More/Less Button -->
						{#if displayedComparison.length > 4}
							<div class="mt-4 flex justify-center">
								<button
									on:click={() => (showAllComparisons = !showAllComparisons)}
									class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
								>
									{#if showAllComparisons}
										<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M5 15l7-7 7 7"
											></path>
										</svg>
										Show Less
									{:else}
										<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 9l-7 7-7-7"
											></path>
										</svg>
										View More ({displayedComparison.length - 4} more years)
									{/if}
								</button>
							</div>
						{/if}
					</div>

					<!-- Summary Stats -->
					<div class="mt-4 rounded-lg bg-gray-50 p-3">
						<div class="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
							<div class="text-center">
								<p class="font-medium text-gray-700">
									Average {showMonthlyComparison ? currentMonthName : 'Annual'}
								</p>
								<p class="text-lg font-bold text-gray-900">{averageYearlyTotal.toFixed(0)} mm</p>
							</div>
							<div class="text-center">
								<p class="font-medium text-gray-700">
									Wettest {showMonthlyComparison ? currentMonthName : 'Year'}
								</p>
								{#if wettestYear}
									<p class="text-lg font-bold text-green-700">
										{wettestYear.totalRainfall.toFixed(0)} mm
									</p>
									<p class="text-xs text-gray-600">{wettestYear.year}</p>
								{:else}
									<p class="text-lg font-bold text-gray-700">N/A</p>
								{/if}
							</div>
							<div class="text-center">
								<p class="font-medium text-gray-700">
									Driest {showMonthlyComparison ? currentMonthName : 'Year'}
								</p>
								{#if driestYear}
									<p class="text-lg font-bold text-red-700">
										{driestYear.totalRainfall.toFixed(0)} mm
									</p>
									<p class="text-xs text-gray-600">{driestYear.year}</p>
								{:else}
									<p class="text-lg font-bold text-gray-700">N/A</p>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/if}

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
			{#if enhancedStats}
				<div class="mt-8">
					<h2 class="mb-6 text-2xl font-semibold text-gray-900">Enhanced Analysis</h2>

					<!-- Trends -->
					<div class="mb-6 rounded-lg bg-white p-4 shadow-sm">
						<h3 class="mb-4 text-lg font-semibold text-gray-900">Overall Trends (10-Year)</h3>
						<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
							{#if enhancedStats.rainfallTrend}
								<div class="rounded-lg bg-blue-50 p-4">
									<h4 class="font-medium text-blue-900">Rainfall Trend</h4>
									<p class="text-2xl font-bold text-blue-700">
										{enhancedStats.rainfallTrend.description}
									</p>
									<p class="text-sm text-gray-600">
										Slope: {enhancedStats.rainfallTrend.slope.toFixed(2)} mm/year
										{#if enhancedStats.rainfallTrend.rSquared !== undefined}
											(R²: {enhancedStats.rainfallTrend.rSquared.toFixed(2)})
										{/if}
									</p>
								</div>
							{/if}
							{#if enhancedStats.temperatureTrend}
								<div class="rounded-lg bg-orange-50 p-4">
									<h4 class="font-medium text-orange-900">Temperature Trend</h4>
									<p class="text-2xl font-bold text-orange-700">
										{enhancedStats.temperatureTrend.description}
									</p>
									<p class="text-sm text-gray-600">
										Slope: {enhancedStats.temperatureTrend.slope.toFixed(2)} °C/year
										{#if enhancedStats.temperatureTrend.rSquared !== undefined}
											(R²: {enhancedStats.temperatureTrend.rSquared.toFixed(2)})
										{/if}
									</p>
								</div>
							{/if}
						</div>
					</div>

					<!-- Seasonal Analysis -->
					<div class="mb-6 rounded-lg bg-white p-6 shadow-sm">
						<div class="mb-6 flex items-center">
							<div
								class="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-blue-500"
							>
								<svg
									class="h-6 w-6 text-white"
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
								<h3 class="text-lg font-semibold text-gray-900">Seasonal Analysis</h3>
								<p class="text-sm text-gray-600">10-year seasonal averages and patterns</p>
							</div>
						</div>

						<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
							{#each [{ name: 'Spring', key: 'Spring', colors: 'from-green-400 to-emerald-500', bgColors: 'from-green-50 to-emerald-50', textColors: 'text-green-700', borderColors: 'border-green-200', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' }, { name: 'Summer', key: 'Summer', colors: 'from-yellow-400 to-orange-500', bgColors: 'from-yellow-50 to-orange-50', textColors: 'text-orange-700', borderColors: 'border-orange-200', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' }, { name: 'Autumn', key: 'Autumn', colors: 'from-orange-400 to-red-500', bgColors: 'from-orange-50 to-red-50', textColors: 'text-red-700', borderColors: 'border-red-200', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' }, { name: 'Winter', key: 'Winter', colors: 'from-blue-400 to-cyan-500', bgColors: 'from-blue-50 to-cyan-50', textColors: 'text-blue-700', borderColors: 'border-blue-200', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' }] as season}
								{@const sRain =
									enhancedStats.seasonalRainfall?.[
										season.key as keyof typeof enhancedStats.seasonalRainfall
									]}
								{@const sTemp =
									enhancedStats.seasonalTemperature?.[
										season.key as keyof typeof enhancedStats.seasonalTemperature
									]}
								{#if (sRain && sRain.length > 0) || (sTemp && sTemp.length > 0)}
									<div
										class="group relative overflow-hidden rounded-xl border {season.borderColors} bg-gradient-to-br {season.bgColors} p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
									>
										<!-- Season Header -->
										<div class="mb-4 flex items-center justify-between">
											<div class="flex items-center">
												<div
													class="mr-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br {season.colors} shadow-lg"
												>
													{#if season.name === 'Spring'}
														<i class="fa-solid fa-flower-tulip fa-lg" style="color: #FFFFFF;"></i>
													{:else if season.name === 'Summer'}
														<i class="fa-solid fa-sun-bright fa-lg" style="color: #FFFFFF;"></i>
													{:else if season.name === 'Autumn'}
														<i class="fa-solid fa-leaf-maple fa-lg" style="color: #FFFFFF;"></i>
													{:else}
														<i class="fa-solid fa-snowflake fa-lg" style="color: #FFFFFF;"></i>
													{/if}
												</div>
												<div>
													<h4 class="text-xl font-bold {season.textColors}">{season.name}</h4>
													<p class="text-sm text-gray-600">Seasonal averages</p>
												</div>
											</div>
											<div class="rounded-full bg-white/80 px-3 py-1 shadow-sm">
												<span class="text-xs font-medium {season.textColors}">10 Years</span>
											</div>
										</div>

										<!-- Statistics Grid -->
										<div class="space-y-3">
											{#if (sRain && sRain.length > 0) || (sTemp && sTemp.length > 0)}
												{@const avgTotalRain =
													sRain && sRain.length > 0
														? sRain.reduce((acc: number, curr) => acc + curr.totalRainfall, 0) /
															sRain.length
														: 0}
												{@const avgWetDays =
													sRain && sRain.length > 0
														? sRain.reduce((acc: number, curr) => acc + curr.wetDays, 0) /
															sRain.length
														: 0}
												{@const avgTemp =
													sTemp && sTemp.length > 0
														? sTemp.reduce(
																(acc: number, curr) => acc + curr.averageTemperature,
																0
															) / sTemp.length
														: 0}
												{@const avgFrostDays =
													sTemp && sTemp.length > 0
														? sTemp.reduce((acc: number, curr) => acc + curr.frostDays, 0) /
															sTemp.length
														: 0}
												{@const avgWarmDays =
													sTemp && sTemp.length > 0
														? sTemp.reduce((acc: number, curr) => acc + curr.warmDays, 0) /
															sTemp.length
														: 0}

												<!-- Combined Stats -->
												<div class="rounded-lg bg-white/70 p-4 backdrop-blur-sm">
													<div class="grid grid-cols-2 gap-6 md:grid-cols-5">
														<!-- Rainfall Stats -->
														{#if sRain && sRain.length > 0}
															<div class="text-center">
																<div class="mb-1 flex items-center justify-center">
																	<i class="fa-solid fa-cloud-showers-water {season.textColors}"
																	></i>
																</div>
																<p class="text-lg font-bold {season.textColors}">
																	{avgTotalRain.toFixed(1)}
																	<span class="text-xs font-medium text-gray-600">mm</span>
																</p>
																<p class="text-xs text-gray-600">Rainfall</p>
															</div>
															<div class="text-center">
																<div class="mb-1 flex items-center justify-center">
																	<i class="fa-regular fa-calendar {season.textColors}"></i>
																</div>
																<p class="text-lg font-bold {season.textColors}">
																	{avgWetDays.toFixed(0)}
																	<span class="text-xs font-medium text-gray-600">days</span>
																</p>
																<p class="text-xs text-gray-600">Wet Days</p>
															</div>
														{/if}

														<!-- Temperature Stats -->
														{#if sTemp && sTemp.length > 0}
															<div class="text-center">
																<div class="mb-1 flex items-center justify-center">
																	<i class="fa-solid fa-temperature-list {season.textColors}"></i>
																</div>
																<p class="text-lg font-bold {season.textColors}">
																	{avgTemp.toFixed(1)}
																	<span class="text-xs font-medium text-gray-600">°C</span>
																</p>
																<p class="text-xs text-gray-600">Avg Temp</p>
															</div>
															<div class="text-center">
																<div class="mb-1 flex items-center justify-center">
																	<i class="fa-solid fa-snowflake {season.textColors}"></i>
																</div>
																<p class="text-lg font-bold {season.textColors}">
																	{avgFrostDays.toFixed(0)}
																	<span class="text-xs font-medium text-gray-600">days</span>
																</p>
																<p class="text-xs text-gray-600">Frost</p>
															</div>
															<div class="text-center">
																<div class="mb-1 flex items-center justify-center">
																	<i class="fa-solid fa-sun-bright {season.textColors}"></i>
																</div>
																<p class="text-lg font-bold {season.textColors}">
																	{avgWarmDays.toFixed(0)}
																	<span class="text-xs font-medium text-gray-600">days</span>
																</p>
																<p class="text-xs text-gray-600">Warm</p>
															</div>
														{/if}
													</div>
												</div>
											{/if}
										</div>

										<!-- Decorative Elements -->
										<div
											class="absolute top-0 right-0 h-20 w-20 translate-x-10 -translate-y-10 rounded-full bg-gradient-to-br {season.colors} opacity-10"
										></div>
										<div
											class="absolute bottom-0 left-0 h-16 w-16 -translate-x-8 translate-y-8 rounded-full bg-gradient-to-br {season.colors} opacity-5"
										></div>
									</div>
								{/if}
							{/each}
						</div>
					</div>

					<!-- Extreme Events -->
					<div class="mb-6 rounded-lg bg-white p-6 shadow-sm">
						<h3 class="mb-4 text-xl font-semibold text-gray-800">Extreme Events (Top 5)</h3>
						<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
							<!-- Wettest Days -->
							<div>
								<h4 class="mb-2 font-semibold text-gray-700">Wettest Days</h4>
								<ul class="space-y-1 text-sm">
									{#each enhancedStats.topWettestDays as day (day.date)}
										<li class="flex justify-between rounded-md bg-blue-50 p-2">
											<span>{format(new Date(day.date), 'dd MMM yyyy')}</span>
											<span class="font-bold text-blue-700">{day.rainfall.toFixed(1)} mm</span>
										</li>
									{:else}
										<li class="text-gray-500">No data</li>
									{/each}
								</ul>
							</div>

							<!-- Driest Days (of days with rain) -->
							{#if enhancedStats.topDryestDays && enhancedStats.topDryestDays.length > 0}
								<div>
									<h4 class="mb-2 font-semibold text-gray-700">Driest Days (with rain)</h4>
									<ul class="space-y-1 text-sm">
										{#each enhancedStats.topDryestDays as day (day.date)}
											<li class="flex justify-between rounded-md bg-yellow-50 p-2">
												<span>{format(new Date(day.date), 'dd MMM yyyy')}</span>
												<span class="font-bold text-yellow-700">{day.rainfall.toFixed(1)} mm</span>
											</li>
										{:else}
											<li class="text-gray-500">No data</li>
										{/each}
									</ul>
								</div>
							{/if}

							<!-- Wettest Months -->
							<div>
								<h4 class="mb-2 font-semibold text-gray-700">Wettest Months</h4>
								<ul class="space-y-1 text-sm">
									{#each enhancedStats.topWettestMonths as month (`${month.year}-${month.month}`)}
										<li class="flex justify-between rounded-md bg-green-50 p-2">
											<span>{month.month} {month.year}</span>
											<span class="font-bold text-green-700">{month.total.toFixed(1)} mm</span>
										</li>
									{:else}
										<li class="text-gray-500">No data</li>
									{/each}
								</ul>
							</div>

							<!-- Hottest Days -->
							<div>
								<h4 class="mb-2 font-semibold text-gray-700">Hottest Days (Max Temp)</h4>
								<ul class="space-y-1 text-sm">
									{#each enhancedStats.topHottestDays as day (day.date)}
										<li class="flex justify-between rounded-md bg-red-50 p-2">
											<span>{format(new Date(day.date), 'dd MMM yyyy')}</span>
											<span class="font-bold text-red-700">{day.temperatureMax.toFixed(1)}°C</span>
										</li>
									{:else}
										<li class="text-gray-500">No data</li>
									{/each}
								</ul>
							</div>

							<!-- Coldest Days (Min Temp) -->
							<div>
								<h4 class="mb-2 font-semibold text-gray-700">Coldest Days (Min Temp)</h4>
								<ul class="space-y-1 text-sm">
									{#each enhancedStats.topColdestDays as day (day.date)}
										<li class="flex justify-between rounded-md bg-cyan-50 p-2">
											<span>{format(new Date(day.date), 'dd MMM yyyy')}</span>
											<span class="font-bold text-cyan-700">{day.temperatureMin.toFixed(1)}°C</span>
										</li>
									{:else}
										<li class="text-gray-500">No data</li>
									{/each}
								</ul>
							</div>
						</div>
					</div>
				</div>
			{/if}
			<!-- End of Enhanced Statistics Section -->
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
				</div>
				<h4 class="mt-4 mb-2 text-sm font-semibold text-gray-700">Support My Project</h4>
				<p class="text-xs text-gray-600">
					<a href="https://buymeacoffee.com/lukeoregan" target="_blank" rel="noopener noreferrer"
						><strong>Buy me a coffee</strong> - buymeacoffee.com/lukeoregan</a
					>
				</p>
				<p class="text-xs text-gray-600">
					<i class="fa-brands fa-bitcoin"></i> <strong>Bitcoin:</strong> 328fUT3qVNZJ8EbHGaZ3M1VvCzEbFGW39f
				</p>
				<p class="text-xs text-gray-600">
					<i class="fa-brands fa-ethereum"></i> <strong>Ethereum:</strong>
					0xF63794858A90629f7366e4d2e5817e024c2Ae365
				</p>
				<p class="text-xs text-gray-600">
					<strong>Solana:</strong> 2zgoiSUhb8yo3eu35te9BcSQoa6wdVTmpi8AEHd49Jdj
				</p>
			</div>
		</div>
	</div>
</div>
