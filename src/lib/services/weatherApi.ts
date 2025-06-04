import type {
	Location,
	WeatherApiResponse,
	PostcodeApiResponse,
	RainfallData,
	TemperatureData,
	WindData,
	SolarData
} from '../types.js';
import { format } from 'date-fns';
import { cacheService } from './cacheService.js';

/**
 * Rate limiter to manage API calls and respect Open-Meteo's limits
 */
class RateLimiter {
	private queue: (() => Promise<unknown>)[] = [];
	private currentCalls = 0;
	private startTime = Date.now();
	private isProcessing = false;
	private readonly minutelyLimit = 100; // Conservative limit: 100 calls per minute

	/**
	 * Add a request function to the queue
	 */
	async add<T>(requestFunction: () => Promise<T>): Promise<T> {
		return new Promise((resolve, reject) => {
			this.queue.push(async () => {
				try {
					const result = await requestFunction();
					resolve(result);
				} catch (error) {
					reject(error);
				}
			});
			this.processQueue();
		});
	}

	/**
	 * Process the queue of requests while respecting rate limits
	 */
	private async processQueue(): Promise<void> {
		if (this.isProcessing || this.queue.length === 0) {
			return;
		}

		this.isProcessing = true;

		while (this.queue.length > 0) {
			const now = Date.now();
			const elapsedTime = now - this.startTime;

			// Reset the call count every minute
			if (elapsedTime >= 60000) {
				this.currentCalls = 0;
				this.startTime = now;
				console.log('Rate limiter: Reset call count for new minute');
			}

			// If we are under the limit, process the next request
			if (this.currentCalls < this.minutelyLimit) {
				const requestFunction = this.queue.shift();
				if (requestFunction) {
					this.currentCalls++;
					console.log(
						`Rate limiter: Processing request ${this.currentCalls}/${this.minutelyLimit}`
					);
					await requestFunction();

					// Small delay between requests to spread them out
					if (this.queue.length > 0) {
						await this.delay(600); // 600ms delay = 100 requests per minute max
					}
				}
			} else {
				// If limit reached, wait until the next minute
				const waitTime = 60000 - elapsedTime;
				console.log(
					`Rate limiter: Limit reached, waiting ${Math.round(waitTime / 1000)}s until next minute`
				);
				await this.delay(waitTime);
			}
		}

		this.isProcessing = false;
	}

	/**
	 * Delay utility function
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Get current rate limiter statistics
	 */
	getStats(): { currentCalls: number; limit: number; resetTime: number } {
		const now = Date.now();
		const elapsedTime = now - this.startTime;
		const resetTime = 60000 - elapsedTime;

		return {
			currentCalls: this.currentCalls,
			limit: this.minutelyLimit,
			resetTime: Math.max(0, resetTime)
		};
	}
}

// Create a singleton rate limiter instance
const rateLimiter = new RateLimiter();

/**
 * Export rate limiter stats for monitoring
 */
export function getRateLimiterStats() {
	return rateLimiter.getStats();
}

/**
 * Get coordinates from UK postcode using postcodes.io API
 */
export async function getLocationFromPostcode(postcode: string): Promise<Location> {
	const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();

	try {
		//console.log('Looking up postcode:', cleanPostcode);
		const response = await fetch(`https://api.postcodes.io/postcodes/${cleanPostcode}`);

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Postcode API error:', response.status, errorText);
			throw new Error(`Postcode not found: ${postcode}`);
		}

		const data: PostcodeApiResponse = await response.json();
		//console.log('Postcode lookup successful:', data.result);

		return {
			postcode: data.result.postcode,
			latitude: data.result.latitude,
			longitude: data.result.longitude,
			name: `${data.result.admin_district}, ${data.result.admin_county}`,
			region: data.result.region
		};
	} catch (error) {
		console.error('Postcode lookup error:', error);
		throw new Error(`Failed to fetch location data: ${error}`);
	}
}

/**
 * Get historical rainfall and temperature data using Open-Meteo API
 * This function now caches results based on date range to avoid redundant calls
 */
export async function getHistoricalRainfall(
	latitude: number,
	longitude: number,
	startDate: Date,
	endDate: Date
): Promise<RainfallData[]> {
	const start = format(startDate, 'yyyy-MM-dd');
	const end = format(endDate, 'yyyy-MM-dd');

	// Check cache first using date range
	const cached = cacheService.getWithDateRange<RainfallData[]>(
		latitude,
		longitude,
		'historical_raw',
		start,
		end
	);
	if (cached) {
		return cached;
	}

	const url = new URL('https://archive-api.open-meteo.com/v1/archive');
	url.searchParams.set('latitude', latitude.toString());
	url.searchParams.set('longitude', longitude.toString());
	url.searchParams.set('start_date', start);
	url.searchParams.set('end_date', end);
	url.searchParams.set(
		'daily',
		'precipitation_sum,temperature_2m_mean,temperature_2m_min,temperature_2m_max,wind_speed_10m_mean,wind_direction_10m_dominant,wind_gusts_10m_max,shortwave_radiation_sum,sunshine_duration'
	);
	url.searchParams.set('timezone', 'Europe/London');

	// Use rate limiter for the API call
	return rateLimiter.add(async () => {
		try {
			console.log('Fetching weather data from:', url.toString());
			const response = await fetch(url.toString());

			if (!response.ok) {
				const errorText = await response.text();
				console.error('Weather API error:', response.status, errorText);
				throw new Error(`Weather API error: ${response.status} - ${errorText}`);
			}

			const data: WeatherApiResponse = await response.json();

			if (!data.daily || !data.daily.time) {
				throw new Error('Invalid response format from weather API');
			}

			const rainfallData = data.daily.time.map((date, index) => ({
				date,
				rainfall: data.daily.precipitation_sum[index] || 0,
				temperature: data.daily.temperature_2m_mean?.[index],
				temperatureMin: data.daily.temperature_2m_min?.[index],
				temperatureMax: data.daily.temperature_2m_max?.[index],
				humidity: undefined
			}));

			// Cache the result for 24 hours
			cacheService.setWithDateRange(
				latitude,
				longitude,
				'historical_raw',
				start,
				end,
				rainfallData,
				{ ttl: 24 * 60 * 60 * 1000 }
			);

			return rainfallData;
		} catch (error) {
			console.error('Weather API fetch error:', error);
			throw new Error(`Failed to fetch weather data: ${error}`);
		}
	});
}

/**
 * Consolidated function to get comprehensive historical weather data
 * This reduces API calls by fetching all data types in a single request
 */
export async function getComprehensiveHistoricalData(
	latitude: number,
	longitude: number,
	startDate: Date,
	endDate: Date
): Promise<{
	rainfall: RainfallData[];
	temperature: TemperatureData[];
	wind: WindData[];
	solar: SolarData[];
}> {
	const start = format(startDate, 'yyyy-MM-dd');
	const end = format(endDate, 'yyyy-MM-dd');

	// Check if we have cached comprehensive data
	const cacheKey = `comprehensive_${start}_${end}`;
	const cached = cacheService.getWithDateRange<{
		rainfall: RainfallData[];
		temperature: TemperatureData[];
		wind: WindData[];
		solar: SolarData[];
	}>(latitude, longitude, cacheKey, start, end);

	if (cached) {
		return cached;
	}

	const url = new URL('https://archive-api.open-meteo.com/v1/archive');
	url.searchParams.set('latitude', latitude.toString());
	url.searchParams.set('longitude', longitude.toString());
	url.searchParams.set('start_date', start);
	url.searchParams.set('end_date', end);
	url.searchParams.set(
		'daily',
		'precipitation_sum,temperature_2m_mean,temperature_2m_min,temperature_2m_max,wind_speed_10m_mean,wind_direction_10m_dominant,wind_gusts_10m_max,shortwave_radiation_sum,sunshine_duration'
	);
	url.searchParams.set('timezone', 'Europe/London');

	// Use rate limiter for the API call
	return rateLimiter.add(async () => {
		try {
			console.log('Fetching comprehensive weather data from:', url.toString());
			const response = await fetch(url.toString());

			if (!response.ok) {
				const errorText = await response.text();
				console.error('Comprehensive weather API error:', response.status, errorText);
				throw new Error(`Weather API error: ${response.status} - ${errorText}`);
			}

			const data: WeatherApiResponse = await response.json();

			if (!data.daily || !data.daily.time) {
				throw new Error('Invalid response format from weather API');
			}

			// Process all data types from single API response
			const rainfall: RainfallData[] = data.daily.time.map((date, index) => ({
				date,
				rainfall: data.daily.precipitation_sum[index] || 0,
				temperature: data.daily.temperature_2m_mean?.[index],
				temperatureMin: data.daily.temperature_2m_min?.[index],
				temperatureMax: data.daily.temperature_2m_max?.[index],
				humidity: undefined
			}));

			const temperature: TemperatureData[] = data.daily.time
				.map((date, index) => ({
					date,
					temperature: data.daily.temperature_2m_mean?.[index],
					temperatureMin: data.daily.temperature_2m_min?.[index],
					temperatureMax: data.daily.temperature_2m_max?.[index]
				}))
				.filter(
					(d) =>
						d.temperature !== undefined &&
						d.temperatureMin !== undefined &&
						d.temperatureMax !== undefined
				) as TemperatureData[];

			const wind: WindData[] = data.daily.time
				.map((date, index) => ({
					date,
					windSpeed: data.daily.wind_speed_10m_mean?.[index] || 0,
					windDirection: data.daily.wind_direction_10m_dominant?.[index] || 0,
					windGusts: data.daily.wind_gusts_10m_max?.[index] || 0
				}))
				.filter((d) => d.windSpeed !== null && d.windDirection !== null && d.windGusts !== null);

			const solar: SolarData[] = data.daily.time
				.map((date, index) => ({
					date,
					solarRadiation: data.daily.shortwave_radiation_sum?.[index] || 0,
					solarRadiationSum: data.daily.shortwave_radiation_sum?.[index] || 0,
					uvIndex: undefined,
					sunshineDuration: data.daily.sunshine_duration?.[index]
				}))
				.filter((d) => d.solarRadiation !== null);

			const comprehensiveData = { rainfall, temperature, wind, solar };

			// Cache the comprehensive result
			cacheService.setWithDateRange(latitude, longitude, cacheKey, start, end, comprehensiveData, {
				ttl: 24 * 60 * 60 * 1000
			});

			return comprehensiveData;
		} catch (error) {
			console.error('Comprehensive weather API fetch error:', error);
			throw new Error(`Failed to fetch comprehensive weather data: ${error}`);
		}
	});
}

/**
 * Get current weather data using Open-Meteo current weather API
 */
export async function getCurrentWeather(latitude: number, longitude: number) {
	// Check cache first - shorter TTL for current weather (1 hour)
	const cached = cacheService.get(latitude, longitude, 'current_weather');
	if (cached) {
		return cached;
	}

	const url = new URL('https://api.open-meteo.com/v1/forecast');
	url.searchParams.set('latitude', latitude.toString());
	url.searchParams.set('longitude', longitude.toString());
	url.searchParams.set(
		'current',
		'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m'
	);
	url.searchParams.set(
		'daily',
		'precipitation_sum,temperature_2m_min,temperature_2m_max,wind_speed_10m_max,wind_gusts_10m_max'
	);
	url.searchParams.set('timezone', 'Europe/London');
	url.searchParams.set('forecast_days', '1');

	// Use rate limiter for the API call
	return rateLimiter.add(async () => {
		try {
			const response = await fetch(url.toString());

			if (!response.ok) {
				throw new Error(`Current weather API error: ${response.status}`);
			}

			const data = await response.json();

			// Cache current weather for 1 hour
			cacheService.set(latitude, longitude, 'current_weather', data, { ttl: 60 * 60 * 1000 });

			return data;
		} catch (error) {
			throw new Error(`Failed to fetch current weather: ${error}`);
		}
	});
}

/**
 * Get rainfall data for the last 10 years using the archive API
 * Now uses comprehensive data function to reduce API calls
 */
export async function getTenYearRainfallData(
	latitude: number,
	longitude: number
): Promise<RainfallData[]> {
	// Check cache first
	const cached = cacheService.get<RainfallData[]>(latitude, longitude, 'historical');
	if (cached) {
		return cached;
	}

	const currentYear = new Date().getFullYear();
	const startDate = new Date(currentYear - 10, 0, 1); // 10 years ago, January 1st
	const endDate = new Date(); // Today

	// Use comprehensive data function or fallback to rainfall-specific
	try {
		const comprehensiveData = await getComprehensiveHistoricalData(
			latitude,
			longitude,
			startDate,
			endDate
		);
		const data = comprehensiveData.rainfall;

		// Cache the result
		cacheService.set(latitude, longitude, 'historical', data);
		return data;
	} catch (comprehensiveError) {
		// Fallback to original method
		console.warn(
			'Comprehensive data fetch failed, falling back to rainfall-only:',
			comprehensiveError
		);
		const data = await getHistoricalRainfall(latitude, longitude, startDate, endDate);
		cacheService.set(latitude, longitude, 'historical', data);
		return data;
	}
}

/**
 * Get rainfall data for the current year
 */
export async function getCurrentYearRainfall(
	latitude: number,
	longitude: number
): Promise<RainfallData[]> {
	// Check cache first
	const cached = cacheService.get<RainfallData[]>(latitude, longitude, 'current_year');
	if (cached) {
		return cached;
	}

	const currentYear = new Date().getFullYear();
	const startDate = new Date(currentYear, 0, 1); // January 1st of current year
	const endDate = new Date(); // Today

	const data = await getHistoricalRainfall(latitude, longitude, startDate, endDate);

	// Cache the result with shorter TTL for current year data (6 hours)
	cacheService.set(latitude, longitude, 'current_year', data, { ttl: 6 * 60 * 60 * 1000 });

	return data;
}

/**
 * Get temperature data for the last 10 years
 * Now uses comprehensive data function to reduce API calls
 */
export async function getTenYearTemperatureData(
	latitude: number,
	longitude: number
): Promise<TemperatureData[]> {
	// Check cache first
	const cached = cacheService.get<TemperatureData[]>(latitude, longitude, 'temperature_historical');
	if (cached) {
		return cached;
	}

	const currentYear = new Date().getFullYear();
	const startDate = new Date(currentYear - 10, 0, 1);
	const endDate = new Date();

	// Use comprehensive data function
	try {
		const comprehensiveData = await getComprehensiveHistoricalData(
			latitude,
			longitude,
			startDate,
			endDate
		);
		const temperatureData = comprehensiveData.temperature;

		// Cache the result
		cacheService.set(latitude, longitude, 'temperature_historical', temperatureData);
		return temperatureData;
	} catch (comprehensiveError) {
		// Fallback to original method
		console.warn(
			'Comprehensive data fetch failed, falling back to temperature extraction:',
			comprehensiveError
		);
		const rainfallData = await getHistoricalRainfall(latitude, longitude, startDate, endDate);
		const temperatureData: TemperatureData[] = rainfallData
			.filter(
				(d) =>
					d.temperature !== undefined &&
					d.temperatureMin !== undefined &&
					d.temperatureMax !== undefined
			)
			.map((d) => ({
				date: d.date,
				temperature: d.temperature!,
				temperatureMin: d.temperatureMin!,
				temperatureMax: d.temperatureMax!
			}));

		cacheService.set(latitude, longitude, 'temperature_historical', temperatureData);
		return temperatureData;
	}
}

/**
 * Get wind data for the last 10 years
 * Now uses comprehensive data function to reduce API calls
 */
export async function getTenYearWindData(latitude: number, longitude: number): Promise<WindData[]> {
	// Check cache first
	const cached = cacheService.get<WindData[]>(latitude, longitude, 'wind_historical');
	if (cached) {
		return cached;
	}

	const currentYear = new Date().getFullYear();
	const startDate = new Date(currentYear - 10, 0, 1);
	const endDate = new Date();

	// Use comprehensive data function
	try {
		const comprehensiveData = await getComprehensiveHistoricalData(
			latitude,
			longitude,
			startDate,
			endDate
		);
		const windData = comprehensiveData.wind;

		// Cache the result
		cacheService.set(latitude, longitude, 'wind_historical', windData);
		return windData;
	} catch (comprehensiveError) {
		// Fallback to original separate API call method
		console.warn(
			'Comprehensive data fetch failed, falling back to wind-only API:',
			comprehensiveError
		);
		const start = format(startDate, 'yyyy-MM-dd');
		const end = format(endDate, 'yyyy-MM-dd');

		const url = new URL('https://archive-api.open-meteo.com/v1/archive');
		url.searchParams.set('latitude', latitude.toString());
		url.searchParams.set('longitude', longitude.toString());
		url.searchParams.set('start_date', start);
		url.searchParams.set('end_date', end);
		url.searchParams.set(
			'daily',
			'wind_speed_10m_mean,wind_direction_10m_dominant,wind_gusts_10m_max'
		);
		url.searchParams.set('timezone', 'Europe/London');

		// Use rate limiter for fallback API call
		return rateLimiter.add(async () => {
			try {
				console.log('Fetching wind data from:', url.toString());
				const response = await fetch(url.toString());

				if (!response.ok) {
					const errorText = await response.text();
					console.error('Wind API error:', response.status, errorText);
					throw new Error(`Wind API error: ${response.status} - ${errorText}`);
				}

				const data: WeatherApiResponse = await response.json();

				if (!data.daily || !data.daily.time) {
					throw new Error('Invalid response format from wind API');
				}

				const windData: WindData[] = data.daily.time
					.map((date, index) => ({
						date,
						windSpeed: data.daily.wind_speed_10m_mean?.[index] || 0,
						windDirection: data.daily.wind_direction_10m_dominant?.[index] || 0,
						windGusts: data.daily.wind_gusts_10m_max?.[index] || 0
					}))
					.filter((d) => d.windSpeed !== null && d.windDirection !== null && d.windGusts !== null);

				// Cache the result
				cacheService.set(latitude, longitude, 'wind_historical', windData);
				return windData;
			} catch (fetchError) {
				console.error('Wind API fetch error:', fetchError);
				throw new Error(`Failed to fetch wind data: ${fetchError}`);
			}
		});
	}
}

/**
 * Get solar radiation data for the last 10 years
 * Now uses comprehensive data function to reduce API calls
 */
export async function getTenYearSolarData(
	latitude: number,
	longitude: number
): Promise<SolarData[]> {
	// Check cache first
	const cached = cacheService.get<SolarData[]>(latitude, longitude, 'solar_historical');
	if (cached) {
		return cached;
	}

	const currentYear = new Date().getFullYear();
	const startDate = new Date(currentYear - 10, 0, 1);
	const endDate = new Date();

	// Use comprehensive data function
	try {
		const comprehensiveData = await getComprehensiveHistoricalData(
			latitude,
			longitude,
			startDate,
			endDate
		);
		const solarData = comprehensiveData.solar;

		// Cache the result
		cacheService.set(latitude, longitude, 'solar_historical', solarData);
		return solarData;
	} catch (comprehensiveError) {
		// Fallback to original separate API call method
		console.warn(
			'Comprehensive data fetch failed, falling back to solar-only API:',
			comprehensiveError
		);
		const start = format(startDate, 'yyyy-MM-dd');
		const end = format(endDate, 'yyyy-MM-dd');

		const url = new URL('https://archive-api.open-meteo.com/v1/archive');
		url.searchParams.set('latitude', latitude.toString());
		url.searchParams.set('longitude', longitude.toString());
		url.searchParams.set('start_date', start);
		url.searchParams.set('end_date', end);
		url.searchParams.set('daily', 'shortwave_radiation_sum,sunshine_duration');
		url.searchParams.set('timezone', 'Europe/London');

		// Use rate limiter for fallback API call
		return rateLimiter.add(async () => {
			try {
				console.log('Fetching solar data from:', url.toString());
				const response = await fetch(url.toString());

				if (!response.ok) {
					const errorText = await response.text();
					console.error('Solar API error:', response.status, errorText);
					throw new Error(`Solar API error: ${response.status} - ${errorText}`);
				}

				const data: WeatherApiResponse = await response.json();

				if (!data.daily || !data.daily.time) {
					throw new Error('Invalid response format from solar API');
				}

				const solarData: SolarData[] = data.daily.time
					.map((date, index) => ({
						date,
						solarRadiation: data.daily.shortwave_radiation_sum?.[index] || 0,
						solarRadiationSum: data.daily.shortwave_radiation_sum?.[index] || 0,
						uvIndex: undefined, // No UV Index data
						sunshineDuration: data.daily.sunshine_duration?.[index]
					}))
					.filter((d) => d.solarRadiation !== null);

				// Cache the result
				cacheService.set(latitude, longitude, 'solar_historical', solarData);
				return solarData;
			} catch (fetchError) {
				console.error('Solar API fetch error:', fetchError);
				throw new Error(`Failed to fetch solar data: ${fetchError}`);
			}
		});
	}
}
