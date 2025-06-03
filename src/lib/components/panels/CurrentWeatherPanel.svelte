<script lang="ts">
	export let currentWeather: any = null;
	export let loadingWeather: boolean = false;

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

<!-- Current Weather -->
<div class="mb-4 rounded-lg bg-white p-4 shadow-sm">
	<h2 class="mb-3 text-lg font-semibold text-gray-900">Current Conditions</h2>

	{#if loadingWeather}
		<!-- Loading state for current weather -->
		<div class="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
			{#each Array(6) as _, i}
				<div class="rounded-lg bg-gray-50 p-3">
					<div class="mb-2 h-4 w-20 animate-pulse rounded bg-gray-200"></div>
					<div class="mb-1 h-6 w-16 animate-pulse rounded bg-gray-300"></div>
					<div class="h-3 w-12 animate-pulse rounded bg-gray-200"></div>
				</div>
			{/each}
		</div>
	{:else if currentWeather}
		<div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
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
			<div class="rounded-lg bg-cyan-50 p-3">
				<h3 class="text-sm font-medium text-cyan-900">Wind Speed</h3>
				<p class="text-xl font-bold text-cyan-700">
					{currentWeather.current?.wind_speed_10m?.toFixed(1) || 'N/A'} km/h
				</p>
			</div>
			<div class="rounded-lg bg-indigo-50 p-3">
				<h3 class="text-sm font-medium text-indigo-900">Wind Direction</h3>
				<p class="text-lg font-bold text-indigo-700">
					{currentWeather.current?.wind_direction_10m
						? getWindDirectionLabel(currentWeather.current.wind_direction_10m)
						: 'N/A'}
				</p>
				<p class="text-xs text-indigo-600">
					{currentWeather.current?.wind_direction_10m?.toFixed(0) || 'N/A'}°
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
