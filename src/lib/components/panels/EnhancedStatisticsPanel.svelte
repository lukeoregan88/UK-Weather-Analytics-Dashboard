<script lang="ts">
	import type { EnhancedStatistics } from '../../types.js';
	import { format } from 'date-fns';

	export let enhancedStats: EnhancedStatistics | null;
	export let loadingData: boolean;
</script>

<!-- Enhanced Statistics Section -->
{#if loadingData}
	<!-- Loading state for enhanced statistics -->
	<div class="mt-8">
		<div class="mb-6 h-8 w-64 animate-pulse rounded bg-gray-200"></div>

		<!-- Loading trends -->
		<div class="mb-6 rounded-lg bg-white p-4 shadow-sm">
			<div class="mb-4 h-6 w-48 animate-pulse rounded bg-gray-200"></div>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div class="rounded-lg bg-blue-50 p-4">
					<div class="mb-2 h-4 w-32 animate-pulse rounded bg-blue-200"></div>
					<div class="mb-2 h-8 w-24 animate-pulse rounded bg-blue-300"></div>
					<div class="h-3 w-40 animate-pulse rounded bg-blue-200"></div>
				</div>
				<div class="rounded-lg bg-orange-50 p-4">
					<div class="mb-2 h-4 w-32 animate-pulse rounded bg-orange-200"></div>
					<div class="mb-2 h-8 w-24 animate-pulse rounded bg-orange-300"></div>
					<div class="h-3 w-40 animate-pulse rounded bg-orange-200"></div>
				</div>
			</div>
		</div>

		<!-- Loading seasonal analysis -->
		<div class="mb-6 rounded-lg bg-white p-6 shadow-sm">
			<div class="mb-6 flex items-center">
				<div class="mr-3 h-10 w-10 animate-pulse rounded-full bg-gray-300"></div>
				<div>
					<div class="mb-1 h-6 w-40 animate-pulse rounded bg-gray-200"></div>
					<div class="h-4 w-56 animate-pulse rounded bg-gray-200"></div>
				</div>
			</div>
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
				{#each Array(4) as _}
					<div class="rounded-xl border border-gray-200 bg-gray-50 p-6">
						<div class="mb-4 flex items-center justify-between">
							<div class="flex items-center">
								<div class="mr-3 h-12 w-12 animate-pulse rounded-full bg-gray-300"></div>
								<div>
									<div class="mb-1 h-6 w-20 animate-pulse rounded bg-gray-200"></div>
									<div class="h-4 w-32 animate-pulse rounded bg-gray-200"></div>
								</div>
							</div>
						</div>
						<div class="h-20 animate-pulse rounded bg-gray-200"></div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{:else if enhancedStats}
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
					<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
											? sRain.reduce((acc: number, curr) => acc + curr.wetDays, 0) / sRain.length
											: 0}
									{@const avgTemp =
										sTemp && sTemp.length > 0
											? sTemp.reduce((acc: number, curr) => acc + curr.averageTemperature, 0) /
												sTemp.length
											: 0}
									{@const avgFrostDays =
										sTemp && sTemp.length > 0
											? sTemp.reduce((acc: number, curr) => acc + curr.frostDays, 0) / sTemp.length
											: 0}
									{@const avgWarmDays =
										sTemp && sTemp.length > 0
											? sTemp.reduce((acc: number, curr) => acc + curr.warmDays, 0) / sTemp.length
											: 0}

									<!-- Combined Stats -->
									<div class="rounded-lg bg-white/70 p-4 backdrop-blur-sm">
										<div class="grid grid-cols-2 gap-6 md:grid-cols-5">
											<!-- Rainfall Stats -->
											{#if sRain && sRain.length > 0}
												<div class="text-center">
													<div class="mb-1 flex items-center justify-center">
														<i class="fa-solid fa-cloud-showers-water {season.textColors}"></i>
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
