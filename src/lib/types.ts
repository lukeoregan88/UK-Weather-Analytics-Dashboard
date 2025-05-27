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
	temperature?: number;
	humidity?: number;
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
}

export interface WeatherApiResponse {
	daily: {
		time: string[];
		precipitation_sum: number[];
		temperature_2m_mean?: number[];
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
