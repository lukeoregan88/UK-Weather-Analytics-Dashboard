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
 * Get historical rainfall and temperature data using Open-Meteo API
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
	url.searchParams.set(
		'daily',
		'precipitation_sum,temperature_2m_mean,temperature_2m_min,temperature_2m_max,wind_speed_10m_mean,wind_direction_10m_dominant,wind_gusts_10m_max,shortwave_radiation_sum,sunshine_duration'
	);
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
			temperature: data.daily.temperature_2m_mean?.[index],
			temperatureMin: data.daily.temperature_2m_min?.[index],
			temperatureMax: data.daily.temperature_2m_max?.[index],
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

/**
 * Get temperature data for the last 10 years
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

	// Cache the result
	cacheService.set(latitude, longitude, 'temperature_historical', temperatureData);

	return temperatureData;
}

/**
 * Get wind data for the last 10 years
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
	} catch (error) {
		console.error('Wind API fetch error:', error);
		throw new Error(`Failed to fetch wind data: ${error}`);
	}
}

/**
 * Get solar radiation data for the last 10 years
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

	const start = format(startDate, 'yyyy-MM-dd');
	const end = format(endDate, 'yyyy-MM-dd');

	const url = new URL('https://archive-api.open-meteo.com/v1/archive');
	url.searchParams.set('latitude', latitude.toString());
	url.searchParams.set('longitude', longitude.toString());
	url.searchParams.set('start_date', start);
	url.searchParams.set('end_date', end);
	url.searchParams.set('daily', 'shortwave_radiation_sum,sunshine_duration');
	url.searchParams.set('timezone', 'Europe/London');

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
	} catch (error) {
		console.error('Solar API fetch error:', error);
		throw new Error(`Failed to fetch solar data: ${error}`);
	}
}
