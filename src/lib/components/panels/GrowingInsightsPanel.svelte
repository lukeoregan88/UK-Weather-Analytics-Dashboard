<script lang="ts">
	import { format, parseISO } from 'date-fns';
	import type { GrowingInsights, SolarEnergyInsights } from '../../types.js';

	export let growingInsights: GrowingInsights | null;
	export let solarEnergyInsights: SolarEnergyInsights | null;
</script>

{#if growingInsights}
	<div class="mb-4 rounded-lg bg-white p-4 shadow-sm">
		<div class="mb-4 flex items-center">
			<div class="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
				<i class="fa-solid fa-seedling text-green-600"></i>
			</div>
			<div>
				<h3 class="text-lg font-semibold text-gray-900">Growing Season Insights</h3>
				<p class="text-xs text-gray-600">Agricultural and gardening recommendations</p>
				<p class="mt-1 text-xs text-gray-500">Based on 10 years of historical weather data</p>
			</div>
		</div>

		<div class="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
			<!-- Growing Season Overview -->
			<div class="rounded-lg border border-green-200 bg-green-50 p-4">
				<h4 class="text-md mb-3 font-medium text-green-900">Predicted Growing Season</h4>
				<div class="space-y-2">
					<div class="flex justify-between">
						<span class="text-sm text-green-700">Start:</span>
						<span class="text-sm font-medium text-green-800">
							{growingInsights.optimalGrowingSeason.start
								? format(parseISO(growingInsights.optimalGrowingSeason.start), 'dd MMM yyyy')
								: 'Data not available'}
						</span>
					</div>
					<div class="flex justify-between">
						<span class="text-sm text-green-700">End:</span>
						<span class="text-sm font-medium text-green-800">
							{growingInsights.optimalGrowingSeason.end
								? format(parseISO(growingInsights.optimalGrowingSeason.end), 'dd MMM yyyy')
								: 'Data not available'}
						</span>
					</div>
					<div class="flex justify-between">
						<span class="text-sm text-green-700">Duration:</span>
						<span class="text-sm font-medium text-green-800">
							{growingInsights.optimalGrowingSeason.duration} days
						</span>
					</div>
					<div class="flex justify-between">
						<span class="text-sm text-green-700">Frost-free days (current year):</span>
						<span class="text-sm font-medium text-green-800">
							{growingInsights.frostFreeDays}
						</span>
					</div>
				</div>
			</div>

			<!-- Solar Growing Conditions -->
			<div class="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
				<h4 class="text-md mb-3 font-medium text-yellow-900">Solar Conditions</h4>
				<div class="space-y-2">
					<div class="flex justify-between">
						<span class="text-sm text-yellow-700">Light conditions:</span>
						<span
							class="text-sm font-medium text-yellow-800 {growingInsights.solarGrowingConditions ===
							'Excellent'
								? 'text-green-600'
								: growingInsights.solarGrowingConditions === 'Good'
									? 'text-green-500'
									: growingInsights.solarGrowingConditions === 'Fair'
										? 'text-yellow-600'
										: 'text-red-600'}"
						>
							{growingInsights.solarGrowingConditions}
						</span>
					</div>
					<div class="flex justify-between">
						<span class="text-sm text-yellow-700">Growing degree days (current year):</span>
						<span class="text-sm font-medium text-yellow-800">
							{growingInsights.growingDegreeDays}
						</span>
					</div>
					{#if solarEnergyInsights}
						<div class="flex justify-between">
							<span class="text-sm text-yellow-700">Energy potential:</span>
							<span class="text-sm font-medium text-yellow-800">
								{solarEnergyInsights.yearlyEnergyPotential.toFixed(0)} kWh/m²/year
							</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Recommended Crops -->
			<div class="lg:col-span-2">
				<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
					<h4 class="text-md mb-3 font-medium text-blue-900">Recommended Crops</h4>
					<div class="flex flex-wrap gap-2">
						{#each growingInsights.recommendedCrops as crop}
							<span
								class="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
							>
								{crop}
							</span>
						{/each}
					</div>
					<p class="mt-2 text-xs text-blue-700">
						Based on average temperature, solar radiation, and frost-free days in your area.
					</p>
				</div>
			</div>
		</div>
	</div>
{/if}
