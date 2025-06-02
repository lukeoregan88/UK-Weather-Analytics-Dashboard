export interface Location {
	postcode: string;
	latitude: number;
	longitude: number;
	name: string;
	region: string;
}

export interface RainfallData {
	date: string;
	rainfall: number; // in mm
	temperature?: number; // in °C
	temperatureMin?: number; // in °C
	temperatureMax?: number; // in °C
	humidity?: number; // in %
}

export interface DailyRainfall {
	date: string;
	total: number;
	average: number;
	max: number;
}

export interface MonthlyRainfall {
	month: string;
	year: number;
	total: number;
	average: number;
	daysWithRain: number;
}

export interface YearlyComparison {
	year: number;
	totalRainfall: number;
	averageMonthly: number;
	wetDays: number;
	averageTemperature?: number;
	minTemperature?: number;
	maxTemperature?: number;
}

// New temperature-specific types
export interface TemperatureData {
	date: string;
	temperature: number; // mean temperature in °C
	temperatureMin: number; // minimum temperature in °C
	temperatureMax: number; // maximum temperature in °C
}

export interface TemperatureStats {
	mean: number;
	min: number;
	max: number;
	range: number;
}

export interface MonthlyTemperature {
	month: string;
	year: number;
	meanTemp: number;
	minTemp: number;
	maxTemp: number;
	daysAbove20: number; // warm days
	daysBelow0: number; // frost days
}

export interface TemperatureComparison {
	year: number;
	meanTemperature: number;
	minTemperature: number;
	maxTemperature: number;
	warmDays: number; // days above 20°C
	frostDays: number; // days below 0°C
	heatwaveDays: number; // days above 25°C
}

export interface WeatherApiResponse {
	daily: {
		time: string[];
		precipitation_sum: number[];
		temperature_2m_mean?: number[];
		temperature_2m_min?: number[];
		temperature_2m_max?: number[];
		relative_humidity_2m?: number[];
		wind_speed_10m_mean?: number[];
		wind_direction_10m_dominant?: number[];
		wind_gusts_10m_max?: number[];
	};
}

export interface PostcodeApiResponse {
	result: {
		postcode: string;
		latitude: number;
		longitude: number;
		admin_district: string;
		admin_county: string;
		region: string;
	};
}

export type Season = 'Spring' | 'Summer' | 'Autumn' | 'Winter';

export interface SeasonalRainfallStat {
	year: number;
	season: Season;
	totalRainfall: number;
	wetDays: number;
	averageDailyRainfall: number;
	maxDailyRainfall: number;
}

export interface SeasonalTemperatureStat {
	year: number;
	season: Season;
	averageTemperature: number;
	minTemperature: number;
	maxTemperature: number;
	frostDays: number;
	warmDays: number;
}

export interface ExtremeRainfallEvent extends RainfallData {
	rank?: number; // Position in the ranking
	percentile?: number; // Percentile within historical data
}

export interface ExtremeTemperatureEvent extends TemperatureData {
	rank?: number; // Position in the ranking
	percentile?: number; // Percentile within historical data
}

export interface Trend {
	slope: number;
	intercept: number;
	description: string;
	rSquared?: number;
}

export interface EnhancedStatistics {
	seasonalRainfall: Partial<Record<Season, SeasonalRainfallStat[]>>;
	seasonalTemperature: Partial<Record<Season, SeasonalTemperatureStat[]>>;
	seasonalWind?: Partial<Record<Season, SeasonalWindStat[]>>;
	topWettestDays: ExtremeRainfallEvent[];
	topDryestDays?: ExtremeRainfallEvent[];
	topWettestMonths: MonthlyRainfall[];
	topDryestMonths?: MonthlyRainfall[];
	topHottestDays: ExtremeTemperatureEvent[];
	topColdestDays: ExtremeTemperatureEvent[];
	topWindiestDays?: ExtremeWindEvent[];
	topCalmestDays?: ExtremeWindEvent[];
	rainfallTrend?: Trend;
	temperatureTrend?: Trend;
	windTrend?: Trend;
}

// New wind-specific types
export interface WindData {
	date: string;
	windSpeed: number; // mean wind speed in km/h
	windDirection: number; // wind direction in degrees (0-360)
	windGusts: number; // maximum wind gusts in km/h
}

export interface WindStats {
	meanSpeed: number;
	maxSpeed: number;
	maxGusts: number;
	prevailingDirection: number; // most common direction
	calmDays: number; // days with wind speed < 5 km/h
	gustyDays: number; // days with gusts > 50 km/h
}

export interface WindComparison {
	year: number;
	meanWindSpeed: number;
	maxWindSpeed: number;
	maxGusts: number;
	prevailingDirection: number;
	calmDays: number;
	gustyDays: number;
	stormyDays: number; // days with sustained winds > 60 km/h
}

export interface WindExtremes {
	strongestWinds: Array<{
		start: string;
		end: string;
		duration: number;
		maxSpeed: number;
		maxGusts: number;
	}>;
	calmPeriods: Array<{
		start: string;
		end: string;
		duration: number;
		avgSpeed: number;
	}>;
}

export interface SeasonalWindStat {
	year: number;
	season: Season;
	meanWindSpeed: number;
	maxWindSpeed: number;
	maxGusts: number;
	prevailingDirection: number;
	calmDays: number;
	gustyDays: number;
}

export interface ExtremeWindEvent extends WindData {
	rank?: number; // Position in the ranking
	percentile?: number; // Percentile within historical data
	severity?: 'Light' | 'Moderate' | 'Strong' | 'Severe' | 'Extreme';
}
