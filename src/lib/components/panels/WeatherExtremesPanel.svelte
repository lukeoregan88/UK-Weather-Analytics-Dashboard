<script lang="ts">
	import { format } from 'date-fns';
	import type { WindExtremes } from '../../types.js';

	export let showWindView: boolean = false;
	export let showTemperatureView: boolean = false;
	export let windExtremes: WindExtremes = { strongestWinds: [], calmPeriods: [] };
	export let droughtPeriods: any[] = [];
	export let temperatureExtremes: { heatWaves: any[]; coldSnaps: any[] } = {
		heatWaves: [],
		coldSnaps: []
	};
	export let temperatureAnomalies: {
		hotAnomalies: any[];
		coldAnomalies: any[];
		averageTemperature: number;
	} = {
		hotAnomalies: [],
		coldAnomalies: [],
		averageTemperature: 0
	};
	export let significantTemperatureEvents: {
		recordHighs: any[];
		recordLows: any[];
		temperatureSwings: any[];
	} = {
		recordHighs: [],
		recordLows: [],
		temperatureSwings: []
	};
</script>

<!-- Wind Extremes Analysis -->
{#if showWindView}
	{#if windExtremes.strongestWinds.length > 0 || windExtremes.calmPeriods.length > 0}
		<div class="rounded-lg bg-white p-4 shadow-sm">
			<div class="mb-4 flex items-center">
				<div class="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100">
					<svg class="h-5 w-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 4l8 8-8 8"
						></path>
					</svg>
				</div>
				<div>
					<h3 class="text-lg font-semibold text-gray-900">Wind Pattern Analysis</h3>
					<p class="text-xs text-gray-600">Notable wind events (last 90 days)</p>
				</div>
			</div>

			<!-- Strong Wind Periods -->
			{#if windExtremes.strongestWinds.length > 0}
				<div class="mb-4">
					<h4 class="text-md mb-2 font-medium text-gray-900">
						Strong Wind Periods (3+ days with gusts > 60 km/h)
					</h4>
					<div class="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
						{#each windExtremes.strongestWinds.slice(0, 4) as windEvent, index}
							<div
								class="group relative overflow-hidden rounded-lg border border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50 p-3 transition-all duration-200 hover:border-cyan-300 hover:shadow-md"
							>
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<div class="mb-2 flex items-center">
											<div
												class="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-200 text-cyan-800"
											>
												<span class="text-xs font-bold">{index + 1}</span>
											</div>
											<div class="flex items-center text-cyan-700">
												<svg class="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
													<path
														fill-rule="evenodd"
														d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
														clip-rule="evenodd"
													></path>
												</svg>
												<span class="text-sm font-semibold">{windEvent.duration} days</span>
											</div>
										</div>
										<p class="mb-1 text-xs font-medium text-gray-800">
											Max gusts: {windEvent.maxGusts.toFixed(1)} km/h
										</p>
										<p class="mb-1 text-xs font-medium text-gray-800">
											Max speed: {windEvent.maxSpeed.toFixed(1)} km/h
										</p>
										<div class="flex items-center text-xs text-gray-600">
											<svg class="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
												<path
													fill-rule="evenodd"
													d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
													clip-rule="evenodd"
												></path>
											</svg>
											<span>
												{format(new Date(windEvent.start), 'dd MMM')} - {format(
													new Date(windEvent.end),
													'dd MMM yyyy'
												)}
											</span>
										</div>
									</div>
									<div class="ml-2 flex flex-col items-end">
										<div class="rounded-full bg-cyan-200 px-2 py-0.5">
											<span class="text-xs font-medium text-cyan-800">
												{windEvent.duration >= 7
													? 'Severe'
													: windEvent.duration >= 5
														? 'Strong'
														: 'Moderate'}
											</span>
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Calm Periods -->
			{#if windExtremes.calmPeriods.length > 0}
				<div class="mb-4">
					<h4 class="text-md mb-2 font-medium text-gray-900">
						Extended Calm Periods (5+ days with wind &lt; 10 km/h)
					</h4>
					<div class="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
						{#each windExtremes.calmPeriods.slice(0, 4) as calmEvent, index}
							<div
								class="group relative overflow-hidden rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-3 transition-all duration-200 hover:border-green-300 hover:shadow-md"
							>
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<div class="mb-2 flex items-center">
											<div
												class="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-200 text-green-800"
											>
												<span class="text-xs font-bold">{index + 1}</span>
											</div>
											<div class="flex items-center text-green-700">
												<span class="text-sm font-semibold">{calmEvent.duration} days</span>
											</div>
										</div>
										<p class="mb-1 text-xs font-medium text-gray-800">
											Average: {calmEvent.avgSpeed.toFixed(1)} km/h
										</p>
										<div class="flex items-center text-xs text-gray-600">
											<span>
												{format(new Date(calmEvent.start), 'dd MMM')} - {format(
													new Date(calmEvent.end),
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

			{#if windExtremes.strongestWinds.length === 0 && windExtremes.calmPeriods.length === 0}
				<div class="py-8 text-center">
					<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
						<svg
							class="h-6 w-6 text-gray-600"
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
					<h4 class="mt-2 text-sm font-medium text-gray-900">No notable wind events</h4>
					<p class="mt-1 text-sm text-gray-500">No significant wind patterns in the last 90 days</p>
				</div>
			{/if}
		</div>
	{/if}
{:else if !showTemperatureView}
	<!-- Drought Analysis -->
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
					<p class="text-xs text-gray-600">Dry spells of 7+ consecutive days (last 90 days)</p>
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
					<div class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
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
					<h4 class="mt-2 text-sm font-medium text-gray-900">No significant drought periods</h4>
					<p class="mt-1 text-xs text-gray-500">No dry spells of 7+ days in the last 90 days</p>
				</div>
			{/if}
		</div>
	{/if}
{/if}

<!-- Temperature Extremes Analysis -->
{#if showTemperatureView}
	{#if temperatureExtremes.heatWaves.length > 0 || temperatureExtremes.coldSnaps.length > 0 || temperatureAnomalies.hotAnomalies.length > 0 || temperatureAnomalies.coldAnomalies.length > 0 || significantTemperatureEvents.recordHighs.length > 0 || significantTemperatureEvents.recordLows.length > 0 || significantTemperatureEvents.temperatureSwings.length > 0}
		<div class="rounded-lg bg-white p-4 shadow-sm">
			<div class="mb-4 flex items-center">
				<div class="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
					<svg class="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
						></path>
					</svg>
				</div>
				<div>
					<h3 class="text-lg font-semibold text-gray-900">Temperature Analysis</h3>
					<p class="text-xs text-gray-600">Temperature patterns and extremes (last 90 days)</p>
				</div>
			</div>

			<!-- Heat Waves -->
			{#if temperatureExtremes.heatWaves.length > 0}
				<div class="mb-4">
					<h4 class="text-md mb-2 font-medium text-gray-900">Heat Waves (3+ days above 25°C)</h4>
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
					<h4 class="text-md mb-2 font-medium text-gray-900">Cold Snaps (3+ days below -2°C)</h4>
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

			<!-- Temperature Anomalies -->
			{#if temperatureAnomalies.hotAnomalies.length > 0 || temperatureAnomalies.coldAnomalies.length > 0}
				<div class="mb-4">
					<h4 class="text-md mb-2 font-medium text-gray-900">Temperature Anomalies</h4>
					<div class="mb-3 rounded-lg bg-gray-50 p-3">
						<div class="flex items-center justify-between text-sm">
							<span class="text-gray-700">90-day average temperature:</span>
							<span class="font-semibold text-gray-900"
								>{temperatureAnomalies.averageTemperature.toFixed(1)}°C</span
							>
						</div>
					</div>

					<!-- Hot Anomalies -->
					{#if temperatureAnomalies.hotAnomalies.length > 0}
						<div class="mb-3">
							<h5 class="mb-2 text-sm font-medium text-gray-800">
								Unusually Hot Days (5°C+ above average)
							</h5>
							<div class="grid gap-2 sm:grid-cols-1 lg:grid-cols-3">
								{#each temperatureAnomalies.hotAnomalies.slice(0, 6) as anomaly, index}
									<div
										class="rounded-lg border border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 p-2"
									>
										<div class="flex items-center justify-between">
											<div>
												<p class="text-xs font-medium text-gray-800">
													{anomaly.temperature.toFixed(1)}°C
												</p>
												<p class="text-xs text-gray-600">+{anomaly.deviation.toFixed(1)}°C</p>
											</div>
											<div class="text-xs text-gray-600">
												{format(new Date(anomaly.date), 'dd MMM')}
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Cold Anomalies -->
					{#if temperatureAnomalies.coldAnomalies.length > 0}
						<div class="mb-3">
							<h5 class="mb-2 text-sm font-medium text-gray-800">
								Unusually Cold Days (5°C+ below average)
							</h5>
							<div class="grid gap-2 sm:grid-cols-1 lg:grid-cols-3">
								{#each temperatureAnomalies.coldAnomalies.slice(0, 6) as anomaly, index}
									<div
										class="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-2"
									>
										<div class="flex items-center justify-between">
											<div>
												<p class="text-xs font-medium text-gray-800">
													{anomaly.temperature.toFixed(1)}°C
												</p>
												<p class="text-xs text-gray-600">{anomaly.deviation.toFixed(1)}°C</p>
											</div>
											<div class="text-xs text-gray-600">
												{format(new Date(anomaly.date), 'dd MMM')}
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Significant Temperature Events -->
			{#if significantTemperatureEvents.recordHighs.length > 0 || significantTemperatureEvents.recordLows.length > 0 || significantTemperatureEvents.temperatureSwings.length > 0}
				<div class="mb-4">
					<h4 class="text-md mb-2 font-medium text-gray-900">Significant Temperature Events</h4>

					<!-- Record Highs -->
					{#if significantTemperatureEvents.recordHighs.length > 0}
						<div class="mb-3">
							<h5 class="mb-2 text-sm font-medium text-gray-800">Notable High Temperatures</h5>
							<div class="grid gap-2 sm:grid-cols-1 lg:grid-cols-2">
								{#each significantTemperatureEvents.recordHighs.slice(0, 4) as record, index}
									<div
										class="rounded-lg border border-red-200 bg-gradient-to-r from-red-50 to-pink-50 p-3"
									>
										<div class="flex items-start justify-between">
											<div class="flex-1">
												<div class="mb-1 flex items-center">
													<div
														class="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-200 text-red-800"
													>
														<span class="text-xs font-bold">{index + 1}</span>
													</div>
													<span class="text-sm font-semibold text-red-700"
														>{record.temperature.toFixed(1)}°C</span
													>
												</div>
												<p class="mb-1 text-xs text-gray-800">
													{record.description || 'Daily high temperature'}
												</p>
												<div class="flex items-center text-xs text-gray-600">
													<span>{format(new Date(record.date), 'dd MMM yyyy')}</span>
												</div>
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Record Lows -->
					{#if significantTemperatureEvents.recordLows.length > 0}
						<div class="mb-3">
							<h5 class="mb-2 text-sm font-medium text-gray-800">Notable Low Temperatures</h5>
							<div class="grid gap-2 sm:grid-cols-1 lg:grid-cols-2">
								{#each significantTemperatureEvents.recordLows.slice(0, 4) as record, index}
									<div
										class="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-3"
									>
										<div class="flex items-start justify-between">
											<div class="flex-1">
												<div class="mb-1 flex items-center">
													<div
														class="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-200 text-blue-800"
													>
														<span class="text-xs font-bold">{index + 1}</span>
													</div>
													<span class="text-sm font-semibold text-blue-700"
														>{record.temperature.toFixed(1)}°C</span
													>
												</div>
												<p class="mb-1 text-xs text-gray-800">
													{record.description || 'Daily low temperature'}
												</p>
												<div class="flex items-center text-xs text-gray-600">
													<span>{format(new Date(record.date), 'dd MMM yyyy')}</span>
												</div>
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Temperature Swings -->
					{#if significantTemperatureEvents.temperatureSwings.length > 0}
						<div class="mb-3">
							<h5 class="mb-2 text-sm font-medium text-gray-800">
								Large Temperature Swings (15°C+ daily range)
							</h5>
							<div class="grid gap-2 sm:grid-cols-1 lg:grid-cols-2">
								{#each significantTemperatureEvents.temperatureSwings.slice(0, 4) as swing, index}
									<div
										class="rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-3"
									>
										<div class="flex items-start justify-between">
											<div class="flex-1">
												<div class="mb-1 flex items-center">
													<div
														class="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-purple-200 text-purple-800"
													>
														<span class="text-xs font-bold">{index + 1}</span>
													</div>
													<span class="text-sm font-semibold text-purple-700"
														>{swing.range.toFixed(1)}°C range</span
													>
												</div>
												<p class="mb-1 text-xs text-gray-800">
													{swing.minTemp.toFixed(1)}°C to {swing.maxTemp.toFixed(1)}°C
												</p>
												<div class="flex items-center text-xs text-gray-600">
													<span>{format(new Date(swing.date), 'dd MMM yyyy')}</span>
												</div>
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}

			{#if temperatureExtremes.heatWaves.length === 0 && temperatureExtremes.coldSnaps.length === 0 && temperatureAnomalies.hotAnomalies.length === 0 && temperatureAnomalies.coldAnomalies.length === 0 && significantTemperatureEvents.recordHighs.length === 0 && significantTemperatureEvents.recordLows.length === 0 && significantTemperatureEvents.temperatureSwings.length === 0}
				<div class="py-8 text-center">
					<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
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
					<h4 class="mt-2 text-sm font-medium text-gray-900">No notable temperature events</h4>
					<p class="mt-1 text-sm text-gray-500">
						No significant temperature patterns or extremes in the last 90 days
					</p>
				</div>
			{/if}
		</div>
	{/if}
{:else if temperatureExtremes.heatWaves.length > 0 || temperatureExtremes.coldSnaps.length > 0}
	<div class="rounded-lg bg-white p-4 shadow-sm">
		<div class="mb-4 flex items-center">
			<div class="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
				<svg class="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
				<h4 class="text-md mb-2 font-medium text-gray-900">Heat Waves (3+ days above 25°C)</h4>
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
				<h4 class="text-md mb-2 font-medium text-gray-900">Cold Snaps (3+ days below -2°C)</h4>
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
				<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
					<svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"
						></path>
					</svg>
				</div>
				<h4 class="mt-2 text-sm font-medium text-gray-900">No extreme temperature events</h4>
				<p class="mt-1 text-sm text-gray-500">
					No significant heat waves or cold snaps in the last 90 days
				</p>
			</div>
		{/if}
	</div>
{/if}
