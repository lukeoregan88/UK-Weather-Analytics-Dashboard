interface CacheEntry<T> {
	data: T;
	timestamp: number;
	expiresAt: number;
}

interface CacheConfig {
	ttl: number; // Time to live in milliseconds
}

// Enhanced cache types for better organization
export type CacheType =
	| 'historical'
	| 'current_year'
	| 'current_weather'
	| 'temperature_historical'
	| 'wind_historical'
	| 'solar_historical'
	| 'historical_raw' // For raw API responses with date ranges
	| 'weather_news' // For weather news articles
	| 'weather_warnings'; // For weather warnings from Met Office

class CacheService {
	private readonly defaultTTL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

	// TTL configurations for different data types
	private readonly ttlConfig = {
		historical: 24 * 60 * 60 * 1000, // 24 hours for historical data
		current_year: 6 * 60 * 60 * 1000, // 6 hours for current year data
		current_weather: 60 * 60 * 1000, // 1 hour for current weather
		temperature_historical: 24 * 60 * 60 * 1000, // 24 hours for historical temperature
		wind_historical: 24 * 60 * 60 * 1000, // 24 hours for historical wind
		solar_historical: 24 * 60 * 60 * 1000, // 24 hours for historical solar
		historical_raw: 24 * 60 * 60 * 1000, // 24 hours for raw API responses
		weather_news: 30 * 60 * 1000, // 30 minutes for weather news
		weather_warnings: 10 * 60 * 1000 // 10 minutes for weather warnings
	};

	/**
	 * Generate a cache key from location coordinates and data type
	 */
	private generateKey(lat: number, lng: number, type: string, additionalKey?: string): string {
		const baseKey = `rainfall_cache_${type}_${lat.toFixed(4)}_${lng.toFixed(4)}`;
		return additionalKey ? `${baseKey}_${additionalKey}` : baseKey;
	}

	/**
	 * Generate a cache key for date-range specific data
	 */
	private generateDateRangeKey(
		lat: number,
		lng: number,
		type: string,
		startDate: string,
		endDate: string
	): string {
		return this.generateKey(lat, lng, type, `${startDate}_${endDate}`);
	}

	/**
	 * Store data in cache with expiry
	 */
	set<T>(lat: number, lng: number, type: CacheType, data: T, config?: CacheConfig): void {
		try {
			const ttl = config?.ttl || this.ttlConfig[type] || this.defaultTTL;
			const now = Date.now();
			const cacheEntry: CacheEntry<T> = {
				data,
				timestamp: now,
				expiresAt: now + ttl
			};

			const key = this.generateKey(lat, lng, type);
			localStorage.setItem(key, JSON.stringify(cacheEntry));

			console.log(
				`Cached ${type} data for ${lat.toFixed(4)}, ${lng.toFixed(4)} (expires in ${(ttl / 1000 / 60 / 60).toFixed(1)} hours)`
			);
		} catch (error) {
			console.warn('Failed to cache data:', error);
		}
	}

	/**
	 * Store data in cache with date range key
	 */
	setWithDateRange<T>(
		lat: number,
		lng: number,
		type: string,
		startDate: string,
		endDate: string,
		data: T,
		config?: CacheConfig
	): void {
		try {
			const ttl = config?.ttl || this.defaultTTL;
			const now = Date.now();
			const cacheEntry: CacheEntry<T> = {
				data,
				timestamp: now,
				expiresAt: now + ttl
			};

			const key = this.generateDateRangeKey(lat, lng, type, startDate, endDate);
			localStorage.setItem(key, JSON.stringify(cacheEntry));

			console.log(
				`Cached ${type} data for ${lat.toFixed(4)}, ${lng.toFixed(4)} (${startDate} to ${endDate}) (expires in ${(ttl / 1000 / 60 / 60).toFixed(1)} hours)`
			);
		} catch (error) {
			console.warn('Failed to cache data:', error);
		}
	}

	/**
	 * Retrieve data from cache if not expired
	 */
	get<T>(lat: number, lng: number, type: CacheType): T | null {
		try {
			const key = this.generateKey(lat, lng, type);
			const cached = localStorage.getItem(key);

			if (!cached) {
				return null;
			}

			const cacheEntry: CacheEntry<T> = JSON.parse(cached);
			const now = Date.now();

			if (now > cacheEntry.expiresAt) {
				// Cache expired, remove it
				localStorage.removeItem(key);
				console.log(`Cache expired for ${type} data at ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
				return null;
			}

			const ageHours = (now - cacheEntry.timestamp) / 1000 / 60 / 60;
			console.log(
				`Using cached ${type} data for ${lat.toFixed(4)}, ${lng.toFixed(4)} (${ageHours.toFixed(1)} hours old)`
			);
			return cacheEntry.data;
		} catch (error) {
			console.warn('Failed to retrieve cached data:', error);
			return null;
		}
	}

	/**
	 * Retrieve data from cache with date range key
	 */
	getWithDateRange<T>(
		lat: number,
		lng: number,
		type: string,
		startDate: string,
		endDate: string
	): T | null {
		try {
			const key = this.generateDateRangeKey(lat, lng, type, startDate, endDate);
			const cached = localStorage.getItem(key);

			if (!cached) {
				return null;
			}

			const cacheEntry: CacheEntry<T> = JSON.parse(cached);
			const now = Date.now();

			if (now > cacheEntry.expiresAt) {
				// Cache expired, remove it
				localStorage.removeItem(key);
				console.log(
					`Cache expired for ${type} data (${startDate} to ${endDate}) at ${lat.toFixed(4)}, ${lng.toFixed(4)}`
				);
				return null;
			}

			const ageHours = (now - cacheEntry.timestamp) / 1000 / 60 / 60;
			console.log(
				`Using cached ${type} data for ${lat.toFixed(4)}, ${lng.toFixed(4)} (${startDate} to ${endDate}) (${ageHours.toFixed(1)} hours old)`
			);
			return cacheEntry.data;
		} catch (error) {
			console.warn('Failed to retrieve cached data:', error);
			return null;
		}
	}

	/**
	 * Check if cache exists and is valid for given location and type
	 */
	has(lat: number, lng: number, type: CacheType): boolean {
		return this.get(lat, lng, type) !== null;
	}

	/**
	 * Check if cache exists for date range
	 */
	hasWithDateRange(
		lat: number,
		lng: number,
		type: string,
		startDate: string,
		endDate: string
	): boolean {
		return this.getWithDateRange(lat, lng, type, startDate, endDate) !== null;
	}

	/**
	 * Remove specific cache entry
	 */
	remove(lat: number, lng: number, type: CacheType): void {
		try {
			const key = this.generateKey(lat, lng, type);
			const existed = localStorage.getItem(key) !== null;
			localStorage.removeItem(key);
			if (existed) {
				console.log(`Removed cached ${type} data for ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
			}
		} catch (error) {
			console.warn('Failed to remove cached data:', error);
		}
	}

	/**
	 * Clear all cached data for a location
	 */
	clearLocation(lat: number, lng: number): void {
		try {
			const types: CacheType[] = [
				'historical',
				'current_year',
				'current_weather',
				'temperature_historical',
				'wind_historical',
				'solar_historical',
				'historical_raw',
				'weather_news'
			];

			let removedCount = 0;

			// Clear standard cache entries
			types.forEach((type) => {
				const key = this.generateKey(lat, lng, type);
				if (localStorage.getItem(key)) {
					localStorage.removeItem(key);
					removedCount++;
				}
			});

			// Clear date-range specific cache entries
			for (let i = localStorage.length - 1; i >= 0; i--) {
				const key = localStorage.key(i);
				if (
					key &&
					key.startsWith(`rainfall_cache_`) &&
					key.includes(`_${lat.toFixed(4)}_${lng.toFixed(4)}_`)
				) {
					localStorage.removeItem(key);
					removedCount++;
				}
			}

			console.log(
				`Cleared ${removedCount} cached entries for ${lat.toFixed(4)}, ${lng.toFixed(4)}`
			);
		} catch (error) {
			console.warn('Failed to clear cached data:', error);
		}
	}

	/**
	 * Clear all expired cache entries
	 */
	clearExpired(): void {
		try {
			const now = Date.now();
			const keysToRemove: string[] = [];

			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key && key.startsWith('rainfall_cache_')) {
					try {
						const cached = localStorage.getItem(key);
						if (cached) {
							const cacheEntry: CacheEntry<unknown> = JSON.parse(cached);
							if (now > cacheEntry.expiresAt) {
								keysToRemove.push(key);
							}
						}
					} catch {
						// Invalid cache entry, mark for removal
						keysToRemove.push(key);
					}
				}
			}

			keysToRemove.forEach((key) => localStorage.removeItem(key));
			if (keysToRemove.length > 0) {
				console.log(`Cleared ${keysToRemove.length} expired cache entries`);
			}
		} catch (error) {
			console.warn('Failed to clear expired cache:', error);
		}
	}

	/**
	 * Clear all cache entries (useful for debugging or cache reset)
	 */
	clearAll(): void {
		try {
			const keysToRemove: string[] = [];

			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key && key.startsWith('rainfall_cache_')) {
					keysToRemove.push(key);
				}
			}

			keysToRemove.forEach((key) => localStorage.removeItem(key));
			console.log(`Cleared all ${keysToRemove.length} cache entries`);
		} catch (error) {
			console.warn('Failed to clear all cache:', error);
		}
	}

	/**
	 * Get cache statistics
	 */
	getStats(): {
		totalEntries: number;
		totalSize: number;
		oldestEntry: Date | null;
		typeBreakdown: Record<string, number>;
	} {
		let totalEntries = 0;
		let totalSize = 0;
		let oldestTimestamp = Date.now();
		const typeBreakdown: Record<string, number> = {};

		try {
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key && key.startsWith('rainfall_cache_')) {
					const value = localStorage.getItem(key);
					if (value) {
						totalEntries++;
						totalSize += value.length;

						// Extract type from key for breakdown
						const keyParts = key.split('_');
						if (keyParts.length >= 3) {
							const type = keyParts[2];
							typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
						}

						try {
							const cacheEntry: CacheEntry<unknown> = JSON.parse(value);
							if (cacheEntry.timestamp < oldestTimestamp) {
								oldestTimestamp = cacheEntry.timestamp;
							}
						} catch {
							// Invalid entry
						}
					}
				}
			}
		} catch (error) {
			console.warn('Failed to get cache stats:', error);
		}

		return {
			totalEntries,
			totalSize,
			oldestEntry: totalEntries > 0 ? new Date(oldestTimestamp) : null,
			typeBreakdown
		};
	}

	/**
	 * Get TTL configuration for a cache type
	 */
	getTTL(type: CacheType): number {
		return this.ttlConfig[type] || this.defaultTTL;
	}
}

// Export singleton instance
export const cacheService = new CacheService();

/**
 * Store and retrieve postcode from localStorage
 */
export const postcodeStorage = {
	save(postcode: string): void {
		try {
			localStorage.setItem('rainfall_last_postcode', postcode);
		} catch (error) {
			console.warn('Failed to save postcode:', error);
		}
	},

	load(): string | null {
		try {
			return localStorage.getItem('rainfall_last_postcode');
		} catch (error) {
			console.warn('Failed to load postcode:', error);
			return null;
		}
	},

	clear(): void {
		try {
			localStorage.removeItem('rainfall_last_postcode');
		} catch (error) {
			console.warn('Failed to clear postcode:', error);
		}
	}
};
