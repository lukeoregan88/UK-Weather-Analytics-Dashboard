import type { Location, WeatherApiResponse, PostcodeApiResponse, RainfallData } from '../types.js';
import { format } from 'date-fns';
import { cacheService } from './cacheService.js';

/**
 * Get coordinates from UK postcode using postcodes.io API
 */
export async function getLocationFromPostcode(postcode: string): Promise<Location> {
	const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();

	try {
		console.log('Looking up postcode:', cleanPostcode);
		const response = await fetch(`https://api.postcodes.io/postcodes/${cleanPostcode}`);

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Postcode API error:', response.status, errorText);
			throw new Error(`Postcode not found: ${postcode}`);
		}

		const data: PostcodeApiResponse = await response.json();
		console.log('Postcode lookup successful:', data.result);

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
 * Get historical rainfall data using Open-Meteo API (free, no API key required)
 */
export async function getHistoricalRainfall(
	latitude: number,
	longitude: number,
	startDate: Date,
	endDate: Date
): Promise<RainfallData[]> {
	const start = format(startDate, 'yyyy-MM-dd');
	const end = format(endDate, 'yyyy-MM-dd');

	const url = new URL('https://archive-api.open-meteo.com/v1/archive');
	url.searchParams.set('latitude', latitude.toString());
	url.searchParams.set('longitude', longitude.toString());
	url.searchParams.set('start_date', start);
	url.searchParams.set('end_date', end);
	url.searchParams.set('daily', 'precipitation_sum');
	url.searchParams.set('timezone', 'Europe/London');

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

		return data.daily.time.map((date, index) => ({
			date,
			rainfall: data.daily.precipitation_sum[index] || 0,
			temperature: undefined,
			humidity: undefined
		}));
	} catch (error) {
		console.error('Weather API fetch error:', error);
		throw new Error(`Failed to fetch weather data: ${error}`);
	}
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
	url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,precipitation');
	url.searchParams.set('daily', 'precipitation_sum');
	url.searchParams.set('timezone', 'Europe/London');
	url.searchParams.set('forecast_days', '1');

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
}

/**
 * Get rainfall data for the last 10 years using the archive API
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

	const data = await getHistoricalRainfall(latitude, longitude, startDate, endDate);

	// Cache the result
	cacheService.set(latitude, longitude, 'historical', data);

	return data;
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
