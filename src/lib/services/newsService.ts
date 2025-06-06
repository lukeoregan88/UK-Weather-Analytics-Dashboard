import type { NewsData, NewsArticle, RssResponse } from '../types.js';
import { cacheService } from './cacheService.js';

const RSS_FEED_URL = 'https://www.theguardian.com/uk/weather/rss';
const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json';

// Rate limiting for news API
class NewsRateLimiter {
	private calls: number = 0;
	private readonly maxCalls: number = 10; // Conservative limit for RSS2JSON
	private resetTime: number = Date.now() + 60000; // 1 minute window

	async add<T>(fn: () => Promise<T>): Promise<T> {
		// Reset counter if time window has passed
		if (Date.now() > this.resetTime) {
			this.calls = 0;
			this.resetTime = Date.now() + 60000;
		}

		if (this.calls >= this.maxCalls) {
			throw new Error('News API rate limit exceeded. Please try again in a minute.');
		}

		this.calls++;
		return fn();
	}

	getStats() {
		return {
			currentCalls: this.calls,
			limit: this.maxCalls,
			resetTime: Math.max(0, this.resetTime - Date.now())
		};
	}
}

const newsRateLimiter = new NewsRateLimiter();

/**
 * Fetch UK weather news from The Guardian RSS feed
 */
export async function getWeatherNews(): Promise<NewsData> {
	// Check cache first (cache for 30 minutes)
	const cached = cacheService.get<NewsData>(0, 0, 'weather_news');
	if (cached) {
		// Ensure lastUpdated is a Date object (it gets serialized as string in localStorage)
		return {
			...cached,
			lastUpdated: new Date(cached.lastUpdated)
		};
	}

	return newsRateLimiter.add(async () => {
		try {
			const url = new URL(RSS2JSON_API);
			url.searchParams.set('rss_url', RSS_FEED_URL);
			url.searchParams.set('api_key', ''); // Optional: add API key for higher limits
			url.searchParams.set('count', '10'); // Limit to 10 articles

			const response = await fetch(url.toString());

			if (!response.ok) {
				throw new Error(`Failed to fetch news: ${response.status} ${response.statusText}`);
			}

			const data: RssResponse = await response.json();

			if (data.status !== 'ok') {
				throw new Error('RSS2JSON API returned error status');
			}

			// Process and clean the articles
			const articles: NewsArticle[] = data.items
				.filter((item) => item.title && item.link)
				.map((item) => ({
					title: item.title.trim(),
					description: cleanDescription(item.description || ''),
					link: item.link,
					pubDate: item.pubDate,
					category: item.category,
					author: item.author
				}));

			const newsData: NewsData = {
				articles,
				lastUpdated: new Date(),
				source: 'The Guardian - UK Weather'
			};

			// Cache for 30 minutes
			cacheService.set(0, 0, 'weather_news', newsData, {
				ttl: 30 * 60 * 1000 // 30 minutes
			});

			return newsData;
		} catch (error) {
			console.error('Error fetching weather news:', error);

			// Return fallback data if available
			const fallback = getFallbackNews();
			if (fallback) {
				return fallback;
			}

			throw new Error(
				`Failed to fetch weather news: ${error instanceof Error ? error.message : error}`
			);
		}
	});
}

/**
 * Clean HTML content from RSS description
 */
function cleanDescription(description: string): string {
	// Remove HTML tags and decode entities
	const cleaned = description
		.replace(/<[^>]*>/g, '') // Remove HTML tags
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.trim();

	// Limit to reasonable length
	return cleaned.length > 200 ? cleaned.substring(0, 200) + '...' : cleaned;
}

/**
 * Provide fallback news in case of API failure
 */
function getFallbackNews(): NewsData | null {
	return {
		articles: [
			{
				title: 'Weather news temporarily unavailable',
				description:
					"We're currently unable to fetch the latest weather news. Please check back shortly or visit The Guardian directly for the latest UK weather updates.",
				link: 'https://www.theguardian.com/uk/weather',
				pubDate: new Date().toISOString()
			}
		],
		lastUpdated: new Date(),
		source: 'Fallback'
	};
}

/**
 * Get rate limiter statistics for news API
 */
export function getNewsRateLimiterStats() {
	return newsRateLimiter.getStats();
}

/**
 * Clear news cache
 */
export function clearNewsCache() {
	cacheService.remove(0, 0, 'weather_news');
}
