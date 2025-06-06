import type { WeatherWarning, WeatherWarningsData } from '../types.js';
import { cacheService } from './cacheService.js';

const RSS_FEED_URL = 'https://www.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/UK';
const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json';

// RSS2JSON response types
interface RSS2JSONItem {
	title: string;
	pubDate: string | null;
	link: string;
	guid: string;
	author: string;
	thumbnail: string;
	description: string;
	content: string;
	enclosure: {
		link: string;
		type: string;
		length: number;
	};
	categories: string[];
}

interface RSS2JSONResponse {
	status: string;
	feed: {
		url: string;
		title: string;
		link: string;
		author: string;
		description: string;
		image: string;
	};
	items: RSS2JSONItem[];
}

// Rate limiting for warnings API
class WarningsRateLimiter {
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
			throw new Error('Weather warnings API rate limit exceeded. Please try again in a minute.');
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

const warningsRateLimiter = new WarningsRateLimiter();

/**
 * Weather Warnings Service for Met Office RSS feed using RSS2JSON
 */
class WeatherWarningsService {
	private readonly CACHE_TYPE: import('./cacheService.js').CacheType = 'weather_warnings';

	/**
	 * Fetch weather warnings from Met Office RSS feed using RSS2JSON
	 */
	async getWeatherWarnings(): Promise<WeatherWarningsData> {
		// Check cache first (cache for 10 minutes)
		const cached = cacheService.get<WeatherWarningsData>(0, 0, this.CACHE_TYPE);
		if (cached) {
			// Ensure lastUpdated is a Date object (it gets serialized as string in localStorage)
			return {
				...cached,
				lastUpdated: new Date(cached.lastUpdated)
			};
		}

		return warningsRateLimiter.add(async () => {
			try {
				const url = new URL(RSS2JSON_API);
				url.searchParams.set('rss_url', RSS_FEED_URL);

				const response = await fetch(url.toString());

				if (!response.ok) {
					throw new Error(`Failed to fetch warnings: ${response.status} ${response.statusText}`);
				}

				const data: RSS2JSONResponse = await response.json();

				if (data.status !== 'ok') {
					throw new Error('RSS2JSON API returned error status');
				}

				// Process and clean the warnings
				const warnings: WeatherWarning[] = data.items
					.filter((item: RSS2JSONItem) => item.title && item.link)
					.map((item: RSS2JSONItem, index: number) => this.parseWarningItem(item, index))
					.filter((warning: WeatherWarning | null) => warning !== null) as WeatherWarning[];

				const warningsData: WeatherWarningsData = {
					warnings,
					lastUpdated: new Date(),
					source: 'Met Office UK'
				};

				// Cache for 10 minutes
				cacheService.set(0, 0, this.CACHE_TYPE, warningsData);

				return warningsData;
			} catch (error) {
				console.error('Error fetching weather warnings:', error);

				// Return fallback data if available
				const fallback = this.getFallbackWarnings();
				if (fallback) {
					return fallback;
				}

				throw new Error(
					`Failed to fetch weather warnings: ${error instanceof Error ? error.message : error}`
				);
			}
		});
	}

	/**
	 * Parse a single warning item from RSS2JSON response
	 */
	private parseWarningItem(item: RSS2JSONItem, index: number): WeatherWarning | null {
		try {
			const title = item.title?.trim() || '';
			const description = item.description?.trim() || '';
			const content = item.content?.trim() || description;
			const link = item.link || '';

			// Extract severity (Yellow, Amber, Red)
			const severityMatch = title.match(/(Yellow|Amber|Red)\s+warning/i);
			const severity = (severityMatch?.[1] as 'Yellow' | 'Amber' | 'Red') || 'Yellow';

			// Extract warning type
			const type = this.extractWarningType(title);

			// Extract regions from description/content
			const regions = this.extractRegions(content || description);

			// Extract dates from description
			const { validFrom, validTo } = this.extractDates(content || description);

			// Generate unique ID
			const id = this.generateWarningId(title, link, index);

			// Parse publication date
			const issued = item.pubDate ? new Date(item.pubDate) : new Date();

			const warning: WeatherWarning = {
				id,
				title,
				description: this.cleanDescription(content || description),
				regions,
				severity,
				type,
				validFrom,
				validTo,
				link,
				issued
			};

			return warning;
		} catch (error) {
			console.warn('Error parsing warning item:', error, item);
			return null;
		}
	}

	/**
	 * Extract warning type from title
	 */
	private extractWarningType(title: string): WeatherWarning['type'] {
		const titleLower = title.toLowerCase();

		if (titleLower.includes('thunderstorm') || titleLower.includes('thunder'))
			return 'thunderstorm';
		if (titleLower.includes('rain') || titleLower.includes('rainfall')) return 'rain';
		if (titleLower.includes('snow') || titleLower.includes('blizzard')) return 'snow';
		if (titleLower.includes('wind') || titleLower.includes('gale')) return 'wind';
		if (titleLower.includes('ice') || titleLower.includes('icy')) return 'ice';
		if (titleLower.includes('fog')) return 'fog';
		if (titleLower.includes('heat') || titleLower.includes('hot')) return 'heat';
		if (titleLower.includes('cold') || titleLower.includes('freeze')) return 'cold';

		return 'rain'; // default
	}

	/**
	 * Extract regions from description
	 */
	private extractRegions(description: string): string[] {
		const regions: string[] = [];

		// Look for the pattern "affecting [region]: [areas]"
		const regionMatch = description.match(/affecting\s+([^:]+):\s*(.+?)(?:\s+valid\s+from|$)/i);

		if (regionMatch) {
			const mainRegion = regionMatch[1].trim();
			const areas = regionMatch[2];

			// Add the main region
			regions.push(mainRegion);

			// Extract individual areas (comma-separated)
			if (areas) {
				const areaList = areas
					.split(',')
					.map((area) => area.trim())
					.filter((area) => area.length > 0 && !area.match(/valid\s+from/i));
				regions.push(...areaList);
			}
		} else {
			// Alternative pattern: "warning of [type] affecting [region]: [areas]"
			const altMatch = description.match(
				/warning\s+of\s+\w+\s+affecting\s+([^:]+):\s*(.+?)(?:\s+valid\s+from|$)/i
			);
			if (altMatch) {
				const mainRegion = altMatch[1].trim();
				const areas = altMatch[2];

				regions.push(mainRegion);

				if (areas) {
					const areaList = areas
						.split(',')
						.map((area) => area.trim())
						.filter((area) => area.length > 0 && !area.match(/valid\s+from/i));
					regions.push(...areaList);
				}
			}
		}

		// Fallback: look for common UK region names in the text
		if (regions.length === 0) {
			const commonAreas = [
				'South West England',
				'South East England',
				'London & South East England',
				'East of England',
				'West Midlands',
				'East Midlands',
				'Yorkshire',
				'North West England',
				'North East England',
				'Scotland',
				'Wales',
				'Northern Ireland',
				'London',
				'Central England'
			];

			for (const area of commonAreas) {
				if (description.includes(area)) {
					regions.push(area);
				}
			}
		}

		return regions;
	}

	/**
	 * Extract valid from/to dates from description
	 */
	private extractDates(description: string): { validFrom: Date; validTo: Date } {
		const now = new Date();
		let validFrom = now;
		let validTo = new Date(now.getTime() + 24 * 60 * 60 * 1000); // default: 24 hours from now

		// Look for patterns like "valid from 0800 Sat 07 Jun to 1700 Sat 07 Jun"
		const datePattern =
			/valid\s+from\s+(\d{4})\s+\w+\s+(\d{2})\s+(\w+)\s+to\s+(\d{4})\s+\w+\s+(\d{2})\s+(\w+)/i;
		const match = description.match(datePattern);

		if (match) {
			try {
				const fromTime = match[1];
				const fromDay = parseInt(match[2]);
				const fromMonth = match[3];
				const toTime = match[4];
				const toDay = parseInt(match[5]);
				const toMonth = match[6];

				const currentYear = now.getFullYear();

				// Create from date
				const fromMonthNum = this.getMonthNumber(fromMonth);
				if (fromMonthNum !== -1) {
					validFrom = new Date(currentYear, fromMonthNum, fromDay);
					validFrom.setHours(parseInt(fromTime.substring(0, 2)), parseInt(fromTime.substring(2)));

					// If the date appears to be in the past but the warning is active,
					// it might be for next year (common with test data)
					if (validFrom < now && now.getTime() - validFrom.getTime() > 7 * 24 * 60 * 60 * 1000) {
						validFrom.setFullYear(currentYear + 1);
					}
				}

				// Create to date
				const toMonthNum = this.getMonthNumber(toMonth);
				if (toMonthNum !== -1) {
					validTo = new Date(currentYear, toMonthNum, toDay);
					validTo.setHours(parseInt(toTime.substring(0, 2)), parseInt(toTime.substring(2)));

					// Ensure to date is after from date
					if (validTo < validFrom) {
						validTo.setFullYear(validFrom.getFullYear());
						if (validTo < validFrom) {
							validTo.setFullYear(validFrom.getFullYear() + 1);
						}
					}
				}
			} catch (error) {
				console.warn('Error parsing dates from description:', error);
			}
		} else {
			console.warn('No date pattern found in description:', description);
		}

		return { validFrom, validTo };
	}

	/**
	 * Get month number from month name
	 */
	private getMonthNumber(monthName: string): number {
		const months = [
			'Jan',
			'Feb',
			'Mar',
			'Apr',
			'May',
			'Jun',
			'Jul',
			'Aug',
			'Sep',
			'Oct',
			'Nov',
			'Dec'
		];
		return months.findIndex((m) => monthName.toLowerCase().startsWith(m.toLowerCase()));
	}

	/**
	 * Generate unique warning ID
	 */
	private generateWarningId(title: string, link: string, index: number): string {
		// Try to extract base ID from link
		const linkMatch = link.match(/id=([^&]+)/);
		const baseId = linkMatch ? linkMatch[1] : null;

		// Extract region from title - use full region name
		const regionMatch = title.match(/affecting\s+(.+?)(?:\s|$)/i);
		const region = regionMatch
			? regionMatch[1]
					.replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
					.replace(/\s+/g, '-') // Replace spaces with hyphens
					.toLowerCase()
					.substring(0, 30) // Limit length but keep more detail
			: '';

		// Always include index for guaranteed uniqueness
		let finalId: string;
		if (baseId) {
			finalId = region ? `${baseId}-${region}-${index}` : `${baseId}-${index}`;
		} else {
			// Final fallback: generate ID from title and index
			const titleHash = title
				.replace(/[^a-zA-Z0-9\s]/g, '')
				.replace(/\s+/g, '-')
				.toLowerCase()
				.substring(0, 40);
			finalId = `${titleHash}-${index}`;
		}

		return finalId;
	}

	/**
	 * Clean description content
	 */
	private cleanDescription(description: string): string {
		// Clean and format the description
		return description.trim();
	}

	/**
	 * Provide fallback warnings in case of API failure
	 */
	private getFallbackWarnings(): WeatherWarningsData | null {
		return {
			warnings: [],
			lastUpdated: new Date(),
			source: 'Met Office UK (Fallback)'
		};
	}

	/**
	 * Get warnings that are currently active
	 */
	async getActiveWarnings(): Promise<WeatherWarning[]> {
		const data = await this.getWeatherWarnings();
		const now = new Date();

		return data.warnings.filter((warning) => warning.validFrom <= now && warning.validTo >= now);
	}

	/**
	 * Get warnings by severity
	 */
	async getWarningsBySeverity(severity: WeatherWarning['severity']): Promise<WeatherWarning[]> {
		const data = await this.getWeatherWarnings();
		return data.warnings.filter((warning) => warning.severity === severity);
	}

	/**
	 * Get warnings by type
	 */
	async getWarningsByType(type: WeatherWarning['type']): Promise<WeatherWarning[]> {
		const data = await this.getWeatherWarnings();
		return data.warnings.filter((warning) => warning.type === type);
	}
}

// Export singleton instance
export const weatherWarningsService = new WeatherWarningsService();

/**
 * Get rate limiter statistics for warnings API
 */
export function getWarningsRateLimiterStats() {
	return warningsRateLimiter.getStats();
}

/**
 * Clear warnings cache
 */
export function clearWarningsCache() {
	cacheService.remove(0, 0, 'weather_warnings');
}
