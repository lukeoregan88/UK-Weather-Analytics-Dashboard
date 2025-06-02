<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { YearlyComparison } from '../../types.js';

	export let displayedComparison: YearlyComparison[];
	export let loadingData: boolean;
	export let showMonthlyComparison: boolean;
	export let currentMonthName: string;
	export let currentYear: number;
	export let averageYearlyTotal: number;
	export let wettestYear: YearlyComparison | null;
	export let driestYear: YearlyComparison | null;

	// Internal state for the panel
	let showAllComparisons = false;

	const dispatch = createEventDispatcher();

	function toggleMonthlyComparison() {
		showMonthlyComparison = !showMonthlyComparison;
		dispatch('toggleMonthly', showMonthlyComparison);
	}
</script>

<!-- Yearly Comparison Cards -->
{#if loadingData}
	<!-- Loading state for yearly comparison -->
	<div class="mb-4 rounded-lg bg-white p-4 shadow-sm">
		<div class="mb-4 flex items-center justify-between">
			<div class="h-6 w-48 animate-pulse rounded bg-gray-200"></div>
			<div class="h-5 w-32 animate-pulse rounded bg-gray-200"></div>
		</div>

		<div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
			{#each Array(8) as _, i}
				<div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
					<div class="mb-2 h-4 w-12 animate-pulse rounded bg-gray-200"></div>
					<div class="mb-2 h-8 w-20 animate-pulse rounded bg-gray-300"></div>
					<div class="mb-3 h-1.5 w-full animate-pulse rounded bg-gray-200"></div>
					<div class="grid grid-cols-2 gap-2">
						<div class="h-12 animate-pulse rounded bg-gray-200"></div>
						<div class="h-12 animate-pulse rounded bg-gray-200"></div>
					</div>
					<div class="mt-3 flex justify-center">
						<div class="h-6 w-16 animate-pulse rounded-full bg-gray-200"></div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Loading summary stats -->
		<div class="mt-4 rounded-lg bg-gray-50 p-3">
			<div class="grid grid-cols-1 gap-3 md:grid-cols-3">
				{#each Array(3) as _}
					<div class="text-center">
						<div class="mx-auto mb-1 h-4 w-24 animate-pulse rounded bg-gray-200"></div>
						<div class="mx-auto mb-1 h-6 w-16 animate-pulse rounded bg-gray-300"></div>
						<div class="mx-auto h-3 w-12 animate-pulse rounded bg-gray-200"></div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{:else if displayedComparison.length > 0}
	<div class="mb-4 rounded-lg bg-white p-4 shadow-sm">
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-lg font-semibold text-gray-900">
				{showMonthlyComparison ? `${currentMonthName} Comparison` : '10-Year Comparison'}
			</h3>
			<div class="flex items-center space-x-2">
				<span class="text-xs text-gray-600"> Yearly view </span>
				<button
					on:click={toggleMonthlyComparison}
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
									<h4 class="text-xl font-bold {isCurrentYear ? 'text-blue-900' : 'text-gray-900'}">
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
												{year.minTemperature?.toFixed(0)}° - {year.maxTemperature?.toFixed(0)}°C
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
