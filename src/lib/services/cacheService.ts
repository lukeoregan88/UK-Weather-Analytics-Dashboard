interface CacheEntry<T> {
	data: T;
	timestamp: number;
	expiresAt: number;
}

interface CacheConfig {
	ttl: number; // Time to live in milliseconds
}

class CacheService {
	private readonly defaultTTL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

	/**
	 * Generate a cache key from location coordinates and data type
	 */
	private generateKey(lat: number, lng: number, type: string): string {
		return `rainfall_cache_${type}_${lat.toFixed(4)}_${lng.toFixed(4)}`;
	}

	/**
	 * Store data in cache with expiry
	 */
	set<T>(lat: number, lng: number, type: string, data: T, config?: CacheConfig): void {
		try {
			const ttl = config?.ttl || this.defaultTTL;
			const now = Date.now();
			const cacheEntry: CacheEntry<T> = {
				data,
				timestamp: now,
				expiresAt: now + ttl
			};

			const key = this.generateKey(lat, lng, type);
			localStorage.setItem(key, JSON.stringify(cacheEntry));

			console.log(
				`Cached ${type} data for ${lat.toFixed(4)}, ${lng.toFixed(4)} (expires in ${ttl / 1000 / 60 / 60} hours)`
			);
		} catch (error) {
			console.warn('Failed to cache data:', error);
		}
	}

	/**
	 * Retrieve data from cache if not expired
	 */
	get<T>(lat: number, lng: number, type: string): T | null {
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
	 * Check if cache exists and is valid for given location and type
	 */
	has(lat: number, lng: number, type: string): boolean {
		return this.get(lat, lng, type) !== null;
	}

	/**
	 * Clear all cached data for a location
	 */
	clearLocation(lat: number, lng: number): void {
		try {
			const types = ['historical', 'current_year', 'current_weather'];
			types.forEach((type) => {
				const key = this.generateKey(lat, lng, type);
				localStorage.removeItem(key);
			});
			console.log(`Cleared all cached data for ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
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
	 * Get cache statistics
	 */
	getStats(): { totalEntries: number; totalSize: number; oldestEntry: Date | null } {
		let totalEntries = 0;
		let totalSize = 0;
		let oldestTimestamp = Date.now();

		try {
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key && key.startsWith('rainfall_cache_')) {
					const value = localStorage.getItem(key);
					if (value) {
						totalEntries++;
						totalSize += value.length;

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
			oldestEntry: totalEntries > 0 ? new Date(oldestTimestamp) : null
		};
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
