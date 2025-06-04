<script lang="ts">
	import { onMount } from 'svelte';
	import { format, parseISO, formatDistanceToNow } from 'date-fns';
	import type { NewsData } from '../../types.js';
	import { getWeatherNews, clearNewsCache } from '../../services/newsService.js';

	let newsData: NewsData | null = null;
	let loading = false;
	let error = '';

	async function loadNews() {
		if (loading) return;

		loading = true;
		error = '';

		try {
			newsData = await getWeatherNews();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load weather news';
			console.error('Error loading weather news:', err);
		} finally {
			loading = false;
		}
	}

	function refreshNews() {
		loadNews();
	}

	async function forceRefreshNews() {
		if (loading) return;

		clearNewsCache();
		await loadNews();
	}

	function formatDate(dateString: string): string {
		try {
			const date = parseISO(dateString);
			return formatDistanceToNow(date, { addSuffix: true });
		} catch {
			return 'Recently';
		}
	}

	function formatLastUpdated(lastUpdated: Date | string): string {
		try {
			const date = lastUpdated instanceof Date ? lastUpdated : new Date(lastUpdated);
			return formatDistanceToNow(date, { addSuffix: true });
		} catch {
			return 'Recently';
		}
	}

	function truncateText(text: string, maxLength: number = 150): string {
		if (text.length <= maxLength) return text;
		return text.substring(0, maxLength).trim() + '...';
	}

	onMount(() => {
		loadNews();
	});
</script>

<div class="mx-auto mb-4 max-w-7xl rounded-lg bg-white p-4 pt-4 shadow-sm">
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center">
			<div class="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
				<i class="fa-solid fa-newspaper text-blue-600"></i>
			</div>
			<div>
				<h3 class="text-lg font-semibold text-gray-900">Latest UK Weather News</h3>
				<p class="text-xs text-gray-600">From The Guardian Weather section</p>
			</div>
		</div>

		<div class="flex items-center space-x-2">
			{#if newsData}
				<span class="text-xs text-gray-500">
					Updated {formatLastUpdated(newsData.lastUpdated)}
				</span>
			{/if}
			<button
				on:click={forceRefreshNews}
				disabled={loading}
				class="rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				title="Refresh news (clears cache)"
			>
				<i class="fa-solid fa-refresh {loading ? '' : 'animate-spins'}"></i>
			</button>
		</div>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-8">
			<div class="text-center">
				<div
					class="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"
				></div>
				<p class="text-sm text-gray-600">Loading latest weather news...</p>
			</div>
		</div>
	{:else if error}
		<div class="rounded-md border border-red-200 bg-red-50 p-4">
			<div class="flex">
				<div class="flex-shrink-0">
					<i class="fa-solid fa-exclamation-triangle text-red-400"></i>
				</div>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-red-800">Error loading news</h3>
					<p class="mt-1 text-sm text-red-700">{error}</p>
					<div class="mt-3">
						<button
							on:click={forceRefreshNews}
							class="rounded-md bg-red-100 px-3 py-1 text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none"
						>
							Try again
						</button>
						<a
							href="https://www.theguardian.com/uk/weather"
							target="_blank"
							rel="noopener noreferrer"
							class="ml-2 rounded-md bg-red-100 px-3 py-1 text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none"
						>
							Visit source
						</a>
					</div>
				</div>
			</div>
		</div>
	{:else if newsData && newsData.articles.length > 0}
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			{#each newsData.articles.slice(0, 6) as article, index}
				<div
					class="group rounded-lg border border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 transition-all duration-200 hover:border-blue-300 hover:shadow-md"
				>
					<div class="flex items-start space-x-3">
						<div
							class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-200 text-blue-800"
						>
							<span class="text-xs font-bold">{index + 1}</span>
						</div>
						<div class="flex-1 space-y-1">
							<div>
								<h4
									class="text-sm leading-tight font-semibold text-gray-900 group-hover:text-blue-900"
								>
									<a
										href={article.link}
										target="_blank"
										rel="noopener noreferrer"
										class="hover:underline"
									>
										{article.title}
									</a>
								</h4>
								{#if article.description}
									<p class="mt-1 text-xs leading-relaxed text-gray-700">
										{truncateText(article.description, 120)}
									</p>
								{/if}
							</div>
							<div class="flex items-center justify-between pt-1">
								<div class="flex items-center space-x-2">
									{#if article.pubDate}
										<span class="text-xs text-gray-500">
											<i class="fa-regular fa-clock mr-1"></i>
											{formatDate(article.pubDate)}
										</span>
									{/if}
								</div>
								<a
									href={article.link}
									target="_blank"
									rel="noopener noreferrer"
									class="text-xs text-blue-600 hover:text-blue-800 hover:underline"
								>
									Read more
									<i class="fa-solid fa-external-link ml-1"></i>
								</a>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Footer with source info -->
		<div class="mt-4 rounded-md bg-gray-50 p-3">
			<div class="flex items-center justify-between text-xs text-gray-600">
				<div class="flex items-center">
					<i class="fa-solid fa-info-circle mr-1"></i>
					<span>News provided by {newsData.source}</span>
				</div>
				<a
					href="https://www.theguardian.com/uk/weather"
					target="_blank"
					rel="noopener noreferrer"
					class="text-blue-600 hover:text-blue-800 hover:underline"
				>
					View all weather news
					<i class="fa-solid fa-external-link ml-1"></i>
				</a>
			</div>
		</div>
	{:else}
		<div class="flex items-center justify-center py-8">
			<div class="text-center">
				<i class="fa-solid fa-newspaper mb-3 text-3xl text-gray-400"></i>
				<p class="text-sm text-gray-600">No weather news available at the moment</p>
				<button
					on:click={forceRefreshNews}
					class="mt-2 text-sm text-blue-600 hover:text-blue-800 hover:underline focus:outline-none"
				>
					Try loading again
				</button>
			</div>
		</div>
	{/if}
</div>
