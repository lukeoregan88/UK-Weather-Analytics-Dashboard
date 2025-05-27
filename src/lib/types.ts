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
	// Future: rank or other specific fields if needed
}

export interface ExtremeTemperatureEvent extends TemperatureData {
	// Future: rank or other specific fields if needed
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
	topWettestDays: ExtremeRainfallEvent[];
	topDryestDays?: ExtremeRainfallEvent[]; // Added for completeness
	topWettestMonths: MonthlyRainfall[];
	topDryestMonths?: MonthlyRainfall[]; // Added for completeness
	topHottestDays: ExtremeTemperatureEvent[];
	topColdestDays: ExtremeTemperatureEvent[];
	rainfallTrend?: Trend;
	temperatureTrend?: Trend;
}
