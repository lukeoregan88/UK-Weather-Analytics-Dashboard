<script lang="ts">
	import { onMount } from 'svelte';
	import RainfallChart from './RainfallChart.svelte';
	import LocationMap from './LocationMap.svelte';
	import type { Location, RainfallData, YearlyComparison } from '../types.js';
	import {
		getLocationFromPostcode,
		getTenYearRainfallData,
		getCurrentYearRainfall,
		getCurrentWeather
	} from '../services/weatherApi.js';
	import {
		calculateYearlyComparison,
		calculateMonthlyComparison,
		calculatePercentiles,
		getRecentRainfall,
		calculateDroughtPeriods
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

			// Yearly comparison is now calculated reactively

			// Get current weather
			currentWeather = await getCurrentWeather(location.latitude, location.longitude);
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
	$: yearlyComparison = historicalData.length > 0 ? calculateYearlyComparison(historicalData) : [];
	$: monthlyComparison =
		historicalData.length > 0 ? calculateMonthlyComparison(historicalData, currentMonth) : [];
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
</script>

<div class="min-h-screen bg-gray-50 p-4">
	<div class="mx-auto max-w-7xl">
		<!-- Header -->
		<div class="mb-6 rounded-lg bg-white p-6 shadow-sm">
			<h1 class="mb-4 text-3xl font-bold text-gray-900">UK Rainfall Analysis Dashboard</h1>
			<p class="mb-6 text-gray-600">
				Analyse historical rainfall patterns and current conditions for any UK location
			</p>

			<!-- Search -->
			<div class="flex items-end gap-4">
				<div class="flex-1">
					<label for="postcode" class="mb-2 block text-sm font-medium text-gray-700">
						UK Postcode
					</label>
					<input
						id="postcode"
						type="text"
						bind:value={postcode}
						on:keypress={handleKeyPress}
						placeholder="e.g. SW1A 1AA"
						class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					/>
				</div>
				<button
					on:click={searchLocation}
					disabled={loading}
					class="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					{loading ? 'Loading...' : 'Analyse'}
				</button>
			</div>

			{#if postcode && !location}
				<div class="mt-4 rounded-md border border-blue-200 bg-blue-50 p-4">
					<div class="flex items-center">
						<svg class="mr-2 h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
								clip-rule="evenodd"
							></path>
						</svg>
						<p class="text-blue-800">
							Found saved postcode: <strong>{postcode}</strong>. Click "Analyse" to load data.
						</p>
					</div>
				</div>
			{/if}

			{#if error}
				<div class="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
					<p class="text-red-800">{error}</p>
				</div>
			{/if}

			<!-- Cache Management -->
			<div class="mt-4 flex items-center justify-between">
				<button
					on:click={() => (showCacheInfo = !showCacheInfo)}
					class="text-sm text-gray-500 hover:text-gray-700 focus:outline-none"
				>
					{showCacheInfo ? 'Hide' : 'Show'} cache info
				</button>

				{#if showCacheInfo}
					<div class="flex gap-2">
						<button
							on:click={clearAllExpiredCache}
							class="rounded-md bg-gray-100 px-3 py-1 text-xs text-gray-700 hover:bg-gray-200 focus:outline-none"
						>
							Clear expired
						</button>
						{#if location}
							<button
								on:click={clearCache}
								class="rounded-md bg-red-100 px-3 py-1 text-xs text-red-700 hover:bg-red-200 focus:outline-none"
							>
								Clear location cache
							</button>
						{/if}
					</div>
				{/if}
			</div>

			{#if showCacheInfo}
				<div class="mt-2 rounded-md bg-gray-50 p-3">
					<div class="grid grid-cols-1 gap-2 text-xs text-gray-600 sm:grid-cols-3">
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
					<p class="mt-2 text-xs text-gray-500">
						Data is cached for 12 hours (historical), 6 hours (current year), and 1 hour (current
						weather) to reduce API calls.
					</p>
				</div>
			{/if}
		</div>

		{#if location}
			<!-- Location Info -->
			<div class="mb-6 rounded-lg bg-white p-6 shadow-sm">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-xl font-semibold text-gray-900">Location</h2>
					{#if cacheService.has(location.latitude, location.longitude, 'historical')}
						<span
							class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
						>
							<svg class="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clip-rule="evenodd"
								></path>
							</svg>
							Cached data
						</span>
					{/if}
				</div>
				<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<div>
						<p class="mb-2 text-gray-600">
							{location.name} ({location.postcode})
						</p>
						<p class="mb-2 text-gray-600">
							{location.region}
						</p>
						<p class="text-sm text-gray-500">
							Coordinates: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
						</p>
					</div>
					<div>
						<LocationMap {location} height="200px" />
					</div>
				</div>
			</div>

			<!-- Current Weather -->
			{#if currentWeather}
				<div class="mb-6 rounded-lg bg-white p-6 shadow-sm">
					<h2 class="mb-4 text-xl font-semibold text-gray-900">Current Conditions</h2>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div class="rounded-lg bg-blue-50 p-4">
							<h3 class="font-medium text-blue-900">Temperature</h3>
							<p class="text-2xl font-bold text-blue-700">
								{currentWeather.current?.temperature_2m?.toFixed(1) || 'N/A'}°C
							</p>
						</div>
						<div class="rounded-lg bg-green-50 p-4">
							<h3 class="font-medium text-green-900">Humidity</h3>
							<p class="text-2xl font-bold text-green-700">
								{currentWeather.current?.relative_humidity_2m || 'N/A'}%
							</p>
						</div>
						<div class="rounded-lg bg-purple-50 p-4">
							<h3 class="font-medium text-purple-900">Today's Rain</h3>
							<p class="text-2xl font-bold text-purple-700">
								{currentWeather.daily?.precipitation_sum?.[0]?.toFixed(1) || '0.0'} mm
							</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- Key Statistics -->
			<div class="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				<div class="rounded-lg bg-white p-6 shadow-sm">
					<h3 class="text-sm font-medium tracking-wide text-gray-500 uppercase">
						{currentYear} Total
					</h3>
					<p class="mt-2 text-3xl font-bold text-gray-900">{currentYearTotal.toFixed(1)} mm</p>
					<p class="mt-1 text-sm text-gray-600">Year to date</p>
				</div>

				<div class="rounded-lg bg-white p-6 shadow-sm">
					<h3 class="text-sm font-medium tracking-wide text-gray-500 uppercase">90-Day Total</h3>
					<p class="mt-2 text-3xl font-bold text-gray-900">{last90DaysTotal.toFixed(1)} mm</p>
					<p class="mt-1 text-sm text-gray-600">Last 90 days</p>
				</div>

				{#if percentiles}
					<div class="rounded-lg bg-white p-6 shadow-sm">
						<h3 class="text-sm font-medium tracking-wide text-gray-500 uppercase">
							Median Daily Rain
						</h3>
						<p class="mt-2 text-3xl font-bold text-gray-900">{percentiles.p50} mm</p>
						<p class="mt-1 text-sm text-gray-600">When it rains</p>
					</div>
				{/if}

				<div class="rounded-lg bg-white p-6 shadow-sm">
					<h3 class="text-sm font-medium tracking-wide text-gray-500 uppercase">Drought Periods</h3>
					<p class="mt-2 text-3xl font-bold text-gray-900">{droughtPeriods.length}</p>
					<p class="mt-1 text-sm text-gray-600">7+ day dry spells (90 days)</p>
				</div>
			</div>

			<!-- Charts -->
			<div class="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
				<!-- Recent Rainfall -->
				<div class="rounded-lg bg-white p-6 shadow-sm">
					<h3 class="mb-4 text-lg font-semibold text-gray-900">Last 30 Days</h3>
					{#if recentData.length > 0}
						<RainfallChart
							data={recentData}
							title="Daily Rainfall (Last 30 Days)"
							type="bar"
							height={300}
						/>
					{:else}
						<p class="text-gray-500">No recent data available</p>
					{/if}
				</div>

				<!-- Current Year vs Historical -->
				<div class="rounded-lg bg-white p-6 shadow-sm">
					<h3 class="mb-4 text-lg font-semibold text-gray-900">Current Year Trend</h3>
					{#if currentYearData.length > 0}
						<RainfallChart
							data={currentYearData}
							title="{currentYear} Daily Rainfall"
							type="line"
							height={300}
						/>
					{:else}
						<p class="text-gray-500">No current year data available</p>
					{/if}
				</div>
			</div>

			<!-- Yearly Comparison Cards -->
			{#if displayedComparison.length > 0}
				<div class="mb-6 rounded-lg bg-white p-6 shadow-sm">
					<div class="mb-6 flex items-center justify-between">
						<h3 class="text-lg font-semibold text-gray-900">
							{showMonthlyComparison ? `${currentMonthName} Comparison` : '10-Year Comparison'}
						</h3>
						<div class="flex items-center space-x-3">
							<span class="text-sm text-gray-600"> Yearly view </span>
							<button
								on:click={() => (showMonthlyComparison = !showMonthlyComparison)}
								aria-label="Toggle monthly view"
								class="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none {showMonthlyComparison
									? 'bg-blue-600'
									: 'bg-gray-200'}"
							>
								<span
									class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {showMonthlyComparison
										? 'translate-x-6'
										: 'translate-x-1'}"
								></span>
							</button>
							<span class="text-sm text-gray-600"> Monthly view </span>
						</div>
					</div>

					<!-- Visual Cards Layout -->
					<div class="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
						{#each displayedComparison as year, index}
							{@const percentageVsAverage = (year.totalRainfall / averageYearlyTotal - 1) * 100}
							{@const isAboveAverage = year.totalRainfall > averageYearlyTotal}
							{@const isCurrentYear = year.year === currentYear}
							{@const maxRainfall = Math.max(...displayedComparison.map((y) => y.totalRainfall))}
							{@const rainfallPercentage = (year.totalRainfall / maxRainfall) * 100}

							<div
								class="group relative overflow-hidden rounded-lg border transition-all duration-200 hover:shadow-lg {isCurrentYear
									? 'border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 ring-2 ring-blue-200'
									: isAboveAverage
										? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 hover:border-green-300'
										: 'border-red-200 bg-gradient-to-br from-red-50 to-orange-50 hover:border-red-300'}"
							>
								<!-- Year Badge -->
								<div class="absolute top-3 right-3">
									{#if isCurrentYear}
										<span
											class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
										>
											<svg class="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
												<path
													fill-rule="evenodd"
													d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
													clip-rule="evenodd"
												></path>
											</svg>
											Current
										</span>
									{:else if index === 0 && !isCurrentYear}
										<span
											class="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800"
										>
											Latest
										</span>
									{/if}
								</div>

								<div class="p-5">
									<!-- Year and Trend Icon -->
									<div class="mb-3 flex items-center">
										<h4
											class="text-2xl font-bold {isCurrentYear ? 'text-blue-900' : 'text-gray-900'}"
										>
											{year.year}
										</h4>
										<div class="ml-2">
											{#if isAboveAverage}
												<svg
													class="h-5 w-5 text-green-500"
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
													class="h-5 w-5 text-red-500"
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
									<div class="mb-4">
										<p
											class="text-3xl font-bold {isCurrentYear
												? 'text-blue-700'
												: isAboveAverage
													? 'text-green-700'
													: 'text-red-700'}"
										>
											{year.totalRainfall.toFixed(0)}
											<span class="text-lg font-medium text-gray-600">mm</span>
										</p>
										<p class="text-sm text-gray-600">
											{showMonthlyComparison ? `${currentMonthName} total` : 'Total rainfall'}
										</p>
									</div>

									<!-- Visual Progress Bar -->
									<div class="mb-4">
										<div class="mb-2 flex justify-between text-xs text-gray-600">
											<span>Relative to max year</span>
											<span>{rainfallPercentage.toFixed(0)}%</span>
										</div>
										<div class="h-2 w-full rounded-full bg-gray-200">
											<div
												class="h-2 rounded-full transition-all duration-500 {isCurrentYear
													? 'bg-gradient-to-r from-blue-400 to-blue-600'
													: isAboveAverage
														? 'bg-gradient-to-r from-green-400 to-green-600'
														: 'bg-gradient-to-r from-red-400 to-red-600'}"
												style="width: {rainfallPercentage}%"
											></div>
										</div>
									</div>

									<!-- Statistics Grid -->
									<div class="grid grid-cols-2 gap-3 text-sm">
										<div class="rounded-lg bg-white/60 p-3">
											<p class="font-medium text-gray-700">
												{showMonthlyComparison ? 'Daily Avg' : 'Monthly Avg'}
											</p>
											<p class="text-lg font-bold text-gray-900">
												{year.averageMonthly.toFixed(1)} mm
											</p>
										</div>
										<div class="rounded-lg bg-white/60 p-3">
											<p class="font-medium text-gray-700">Wet Days</p>
											<p class="text-lg font-bold text-gray-900">{year.wetDays}</p>
										</div>
									</div>

									<!-- Comparison Badge -->
									<div class="mt-4 flex items-center justify-center">
										<div
											class="rounded-full px-3 py-1 text-sm font-medium {isAboveAverage
												? 'bg-green-100 text-green-800'
												: 'bg-red-100 text-red-800'}"
										>
											{isAboveAverage ? '+' : ''}{percentageVsAverage.toFixed(0)}% vs average
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>

					<!-- Summary Stats -->
					<div class="mt-6 rounded-lg bg-gray-50 p-4">
						<div class="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
							<div class="text-center">
								<p class="font-medium text-gray-700">
									Average {showMonthlyComparison ? currentMonthName : 'Annual'}
								</p>
								<p class="text-xl font-bold text-gray-900">{averageYearlyTotal.toFixed(0)} mm</p>
							</div>
							<div class="text-center">
								<p class="font-medium text-gray-700">Wettest Year</p>
								{#if wettestYear}
									<p class="text-xl font-bold text-green-700">
										{wettestYear.totalRainfall.toFixed(0)} mm
									</p>
									<p class="text-xs text-gray-600">{wettestYear.year}</p>
								{:else}
									<p class="text-xl font-bold text-gray-700">N/A</p>
								{/if}
							</div>
							<div class="text-center">
								<p class="font-medium text-gray-700">Driest Year</p>
								{#if driestYear}
									<p class="text-xl font-bold text-red-700">
										{driestYear.totalRainfall.toFixed(0)} mm
									</p>
									<p class="text-xs text-gray-600">{driestYear.year}</p>
								{:else}
									<p class="text-xl font-bold text-gray-700">N/A</p>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Drought Analysis -->
			{#if droughtPeriods.length > 0}
				<div class="rounded-lg bg-white p-6 shadow-sm">
					<div class="mb-6 flex items-center">
						<div class="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
							<svg
								class="h-6 w-6 text-orange-600"
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
							<p class="text-sm text-gray-600">Dry spells of 7+ consecutive days (last 90 days)</p>
						</div>
					</div>

					<div class="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
						{#each droughtPeriods.slice(0, 6) as drought, index}
							<div
								class="group relative overflow-hidden rounded-lg border border-gray-200 bg-gradient-to-r from-orange-50 to-yellow-50 p-4 transition-all duration-200 hover:border-orange-300 hover:shadow-md"
							>
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<div class="mb-2 flex items-center">
											<div
												class="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-orange-200 text-orange-800"
											>
												<span class="text-sm font-bold">{index + 1}</span>
											</div>
											<div class="flex items-center text-orange-700">
												<svg class="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
													<path
														fill-rule="evenodd"
														d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
														clip-rule="evenodd"
													></path>
												</svg>
												<span class="font-semibold">{drought.duration} days</span>
											</div>
										</div>
										<p class="mb-1 text-sm font-medium text-gray-800">No significant rainfall</p>
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
									<div class="ml-3 flex flex-col items-end">
										<div class="rounded-full bg-orange-200 px-2 py-1">
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
								<div class="mt-3">
									<div class="h-1.5 w-full rounded-full bg-orange-200">
										<div
											class="h-1.5 rounded-full transition-all duration-300 {drought.duration >= 14
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
						<div class="mt-4 text-center">
							<p class="text-sm text-gray-500">
								Showing 6 of {droughtPeriods.length} drought periods
							</p>
						</div>
					{/if}

					{#if droughtPeriods.length === 0}
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
							<h4 class="mt-2 text-sm font-medium text-gray-900">No significant drought periods</h4>
							<p class="mt-1 text-sm text-gray-500">No dry spells of 7+ days in the last 90 days</p>
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	</div>
</div>
