<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { WeatherWarning } from '../types.js';
	import { format } from 'date-fns';

	export let warnings: WeatherWarning[] = [];

	let currentIndex = 0;
	let carouselInterval: number | null = null;
	let isPaused = false;

	// Auto-advance carousel every 10 seconds
	function startCarousel() {
		if (warnings.length <= 1) return;

		carouselInterval = setInterval(() => {
			if (!isPaused) {
				const nextIndex = (currentIndex + 1) % warnings.length;
				console.log(
					`Carousel advancing from ${currentIndex} to ${nextIndex} (total: ${warnings.length})`
				);
				currentIndex = nextIndex;
			}
		}, 10000);
	}

	function stopCarousel() {
		if (carouselInterval) {
			clearInterval(carouselInterval);
			carouselInterval = null;
		}
	}

	function goToSlide(index: number) {
		currentIndex = index;
		// Reset the carousel timer when manually navigating
		resetCarouselTimer();
	}

	function nextSlide() {
		currentIndex = (currentIndex + 1) % warnings.length;
		// Reset the carousel timer when manually navigating
		resetCarouselTimer();
	}

	function prevSlide() {
		currentIndex = currentIndex === 0 ? warnings.length - 1 : currentIndex - 1;
		// Reset the carousel timer when manually navigating
		resetCarouselTimer();
	}

	function resetCarouselTimer() {
		if (warnings.length > 1) {
			stopCarousel();
			startCarousel();
		}
	}

	// Get severity color classes
	function getSeverityClasses(severity: WeatherWarning['severity']): string {
		switch (severity) {
			case 'Red':
				return 'border-red-500 bg-red-50';
			case 'Amber':
				return 'border-orange-500 bg-orange-50';
			case 'Yellow':
			default:
				return 'border-yellow-500 bg-yellow-50';
		}
	}

	// Get severity text color
	function getSeverityTextColor(severity: WeatherWarning['severity']): string {
		switch (severity) {
			case 'Red':
				return 'text-red-800';
			case 'Amber':
				return 'text-orange-800';
			case 'Yellow':
			default:
				return 'text-yellow-800';
		}
	}

	// Get warning type icon
	function getWarningIcon(type: WeatherWarning['type']): string {
		switch (type) {
			case 'thunderstorm':
				return 'fa-bolt';
			case 'rain':
				return 'fa-cloud-rain';
			case 'snow':
				return 'fa-snowflake';
			case 'wind':
				return 'fa-wind';
			case 'ice':
				return 'fa-icicles';
			case 'fog':
				return 'fa-smog';
			case 'heat':
				return 'fa-temperature-high';
			case 'cold':
				return 'fa-temperature-low';
			default:
				return 'fa-exclamation-triangle';
		}
	}

	// Get time until expiry
	function getTimeUntilExpiry(validTo: Date): string {
		const now = new Date();
		const diff = validTo.getTime() - now.getTime();

		if (diff <= 0) return 'Expired';

		const hours = Math.floor(diff / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

		if (hours > 0) {
			return `${hours}h ${minutes}m remaining`;
		} else {
			return `${minutes}m remaining`;
		}
	}

	// Check if warning is currently active
	function isActive(warning: WeatherWarning): boolean {
		const now = new Date();
		return warning.validFrom <= now && warning.validTo >= now;
	}

	onMount(() => {
		if (warnings.length > 1) {
			startCarousel();
		}
	});

	onDestroy(() => {
		stopCarousel();
	});

	// Track when warnings array actually changes (by reference)
	let previousWarnings = warnings;

	// Watch for warnings changes and restart carousel if needed
	$: {
		if (warnings !== previousWarnings) {
			console.log('WeatherWarningsCarousel warnings array changed:', warnings.length);
			previousWarnings = warnings;

			// Reset to first slide when warnings change
			currentIndex = 0;

			// Restart carousel
			stopCarousel();
			if (warnings.length > 1) {
				startCarousel();
			}
		}
	}
</script>

{#if warnings.length > 0}
	<div class="mx-auto mb-4 max-w-7xl rounded-lg bg-white p-4 pt-4 shadow-sm">
		<div class="mb-3 flex items-center justify-between">
			<h2 class="flex items-center text-lg font-semibold text-gray-900">
				<i class="fa-solid fa-triangle-exclamation mr-2 text-yellow-600"></i>
				Weather Warnings
			</h2>
			<div class="flex items-center text-xs text-gray-500">
				<i class="fa-solid fa-shield-halved mr-1"></i>
				Met Office UK
			</div>
		</div>

		<!-- Carousel Container -->
		<div class="relative">
			<!-- Warning Content -->
			<div
				class="overflow-hidden"
				role="region"
				aria-label="Weather warnings carousel"
				on:mouseenter={() => (isPaused = true)}
				on:mouseleave={() => (isPaused = false)}
			>
				{#each warnings as warning, index (warning.id)}
					<div
						class="transition-all duration-500 ease-in-out {index === currentIndex
							? 'opacity-100'
							: 'absolute inset-0 opacity-0'}"
					>
						<div
							class="rounded-lg border-l-4 pt-4 pr-10 pb-4 pl-10 {getSeverityClasses(
								warning.severity
							)}"
						>
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<!-- Warning Header -->
									<div class="mb-2 flex items-center">
										<i
											class="fa-solid {getWarningIcon(warning.type)} mr-2 {getSeverityTextColor(
												warning.severity
											)}"
										></i>
										<span
											class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {warning.severity ===
											'Red'
												? 'bg-red-100 text-red-800'
												: warning.severity === 'Amber'
													? 'bg-orange-100 text-orange-800'
													: 'bg-yellow-100 text-yellow-800'}"
										>
											{warning.severity} Warning
										</span>
										{#if isActive(warning)}
											<span
												class="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
											>
												<span class="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-green-400"
												></span>
												Active
											</span>
										{/if}
									</div>

									<!-- Warning Title -->
									<h3 class="mb-2 font-semibold {getSeverityTextColor(warning.severity)}">
										{warning.title}
									</h3>

									<!-- Regions Affected -->
									{#if warning.regions.length > 0}
										<div class="mb-2">
											<span class="text-sm font-medium text-gray-700">Regions affected:</span>
											<div class="mt-1 flex flex-wrap gap-1">
												{#each warning.regions.slice(0, 6) as region}
													<span
														class="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-800"
													>
														{region}
													</span>
												{/each}
												{#if warning.regions.length > 6}
													<span class="text-xs text-gray-500">
														+{warning.regions.length - 6} more
													</span>
												{/if}
											</div>
										</div>
									{/if}

									<!-- Time Information -->
									<div class="grid grid-cols-1 gap-2 text-sm text-gray-600 sm:grid-cols-2">
										<div>
											<span class="font-medium">Valid from:</span>
											{format(warning.validFrom, 'MMM dd, HH:mm')}
										</div>
										<div>
											<span class="font-medium">Until:</span>
											{format(warning.validTo, 'MMM dd, HH:mm')}
											<span class="ml-1 text-xs">
												({getTimeUntilExpiry(warning.validTo)})
											</span>
										</div>
									</div>
								</div>

								<!-- External Link -->
								<div class="ml-4">
									<a
										href={warning.link}
										target="_blank"
										rel="noopener noreferrer"
										class="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
									>
										<span class="mr-1">Details</span>
										<i class="fa-solid fa-external-link-alt text-xs"></i>
									</a>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Navigation Controls -->
			{#if warnings.length > 1}
				<!-- Previous/Next Buttons -->
				<button
					on:click={prevSlide}
					on:mouseenter={() => (isPaused = true)}
					on:mouseleave={() => (isPaused = false)}
					class="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-gray-600 shadow-lg hover:bg-white hover:text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					aria-label="Previous warning"
				>
					<i class="fa-solid fa-chevron-left text-sm"></i>
				</button>

				<button
					on:click={nextSlide}
					on:mouseenter={() => (isPaused = true)}
					on:mouseleave={() => (isPaused = false)}
					class="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-gray-600 shadow-lg hover:bg-white hover:text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					aria-label="Next warning"
				>
					<i class="fa-solid fa-chevron-right text-sm"></i>
				</button>
			{/if}
		</div>

		<!-- Pagination Dots -->
		{#if warnings.length > 1}
			<div
				class="mt-4 flex justify-center space-x-2"
				role="group"
				aria-label="Carousel navigation dots"
				on:mouseenter={() => (isPaused = true)}
				on:mouseleave={() => (isPaused = false)}
			>
				{#each warnings as _, index}
					<button
						on:click={() => goToSlide(index)}
						class="h-2 w-2 rounded-full transition-colors {index === currentIndex
							? 'bg-blue-600'
							: 'bg-gray-300'}"
						aria-label="Go to warning {index + 1}"
					></button>
				{/each}
			</div>
		{/if}

		<!-- Warning Count -->
		{#if warnings.length > 1}
			<div class="mt-2 text-center text-xs text-gray-500">
				{currentIndex + 1} of {warnings.length} warnings
			</div>
		{/if}
	</div>
{/if}
