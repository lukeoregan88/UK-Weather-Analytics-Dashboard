import type {
	RainfallData,
	MonthlyRainfall,
	YearlyComparison,
	DailyRainfall,
	TemperatureData,
	TemperatureStats,
	TemperatureComparison,
	Season,
	SeasonalRainfallStat,
	SeasonalTemperatureStat,
	ExtremeRainfallEvent,
	ExtremeTemperatureEvent,
	ExtremeWindEvent,
	Trend,
	EnhancedStatistics,
	WindData,
	WindStats,
	WindComparison,
	WindExtremes,
	SeasonalWindStat,
	SolarData,
	SolarStats,
	SolarComparison,
	SolarExtremes,
	SolarEnergyInsights,
	GrowingInsights,
	SeasonalSolarStat
} from '../types.js';
import { format, getYear, parseISO, getMonth } from 'date-fns';

/**
 * Group rainfall data by year
 */
export function groupByYear(data: RainfallData[]): Record<number, RainfallData[]> {
	return data.reduce(
		(acc, item) => {
			const year = getYear(parseISO(item.date));
			if (!acc[year]) acc[year] = [];
			acc[year].push(item);
			return acc;
		},
		{} as Record<number, RainfallData[]>
	);
}

/**
 * Group rainfall data by month
 */
export function groupByMonth(data: RainfallData[]): Record<string, RainfallData[]> {
	return data.reduce(
		(acc, item) => {
			const monthKey = format(parseISO(item.date), 'yyyy-MM');
			if (!acc[monthKey]) acc[monthKey] = [];
			acc[monthKey].push(item);
			return acc;
		},
		{} as Record<string, RainfallData[]>
	);
}

/**
 * Helper function to get month number from month name
 */
function getMonthNumber(monthName: string): number {
	const months = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	];
	return months.indexOf(monthName);
}

/**
 * Calculate monthly rainfall statistics
 */
export function calculateMonthlyStats(data: RainfallData[]): MonthlyRainfall[] {
	const monthlyGroups = groupByMonth(data);

	return Object.entries(monthlyGroups)
		.map(([monthKey, monthData]) => {
			const date = parseISO(monthKey + '-01');
			const total = monthData.reduce((sum, day) => sum + day.rainfall, 0);
			const daysWithRain = monthData.filter((day) => day.rainfall > 0.1).length; // 0.1mm threshold

			return {
				month: format(date, 'MMMM'),
				year: getYear(date),
				total: Math.round(total * 10) / 10,
				average: Math.round((total / monthData.length) * 10) / 10,
				daysWithRain
			};
		})
		.sort(
			(a, b) =>
				new Date(a.year, getMonthNumber(a.month)).getTime() -
				new Date(b.year, getMonthNumber(b.month)).getTime()
		);
}

/**
 * Calculate yearly comparison statistics
 */
export function calculateYearlyComparison(data: RainfallData[]): YearlyComparison[] {
	const yearlyGroups = groupByYear(data);

	return Object.entries(yearlyGroups)
		.map(([year, yearData]) => {
			const totalRainfall = yearData.reduce((sum, day) => sum + day.rainfall, 0);
			const wetDays = yearData.filter((day) => day.rainfall > 0.1).length;
			const monthlyTotals = calculateMonthlyStats(yearData);
			const averageMonthly =
				monthlyTotals.reduce((sum, month) => sum + month.total, 0) / monthlyTotals.length;

			return {
				year: parseInt(year),
				totalRainfall: Math.round(totalRainfall * 10) / 10,
				averageMonthly: Math.round(averageMonthly * 10) / 10,
				wetDays
			};
		})
		.sort((a, b) => a.year - b.year);
}

/**
 * Get recent rainfall data (last 30 days)
 */
export function getRecentRainfall(data: RainfallData[], days: number = 30): DailyRainfall[] {
	const recent = data.slice(-days);

	return recent.map((day) => ({
		date: day.date,
		total: day.rainfall,
		average: day.rainfall, // For daily data, total and average are the same
		max: day.rainfall
	}));
}

/**
 * Calculate rainfall percentiles for comparison
 */
export function calculatePercentiles(data: RainfallData[]): {
	p10: number;
	p25: number;
	p50: number;
	p75: number;
	p90: number;
} {
	const rainfallValues = data
		.map((d) => d.rainfall)
		.filter((r) => r > 0)
		.sort((a, b) => a - b);

	if (rainfallValues.length === 0) {
		return { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 };
	}

	const getPercentile = (arr: number[], percentile: number) => {
		const index = Math.ceil((percentile / 100) * arr.length) - 1;
		return arr[Math.max(0, index)];
	};

	return {
		p10: Math.round(getPercentile(rainfallValues, 10) * 10) / 10,
		p25: Math.round(getPercentile(rainfallValues, 25) * 10) / 10,
		p50: Math.round(getPercentile(rainfallValues, 50) * 10) / 10,
		p75: Math.round(getPercentile(rainfallValues, 75) * 10) / 10,
		p90: Math.round(getPercentile(rainfallValues, 90) * 10) / 10
	};
}

/**
 * Calculate drought periods (consecutive days with < 1mm rainfall)
 */
export function calculateDroughtPeriods(data: RainfallData[]): Array<{
	start: string;
	end: string;
	duration: number;
}> {
	const droughtThreshold = 1.0; // mm
	const droughts: Array<{ start: string; end: string; duration: number }> = [];
	let droughtStart: string | null = null;
	let droughtDuration = 0;

	data.forEach((day, index) => {
		if (day.rainfall < droughtThreshold) {
			if (droughtStart === null) {
				droughtStart = day.date;
				droughtDuration = 1;
			} else {
				droughtDuration++;
			}
		} else {
			if (droughtStart !== null && droughtDuration >= 7) {
				// Only count droughts of 7+ days
				droughts.push({
					start: droughtStart,
					end: index > 0 ? data[index - 1].date : day.date,
					duration: droughtDuration
				});
			}
			droughtStart = null;
			droughtDuration = 0;
		}
	});

	// Handle ongoing drought
	if (droughtStart !== null && droughtDuration >= 7) {
		droughts.push({
			start: droughtStart,
			end: data[data.length - 1].date,
			duration: droughtDuration
		});
	}

	return droughts;
}

/**
 * Calculate monthly comparison for a specific month across years
 */
export function calculateMonthlyComparison(
	data: RainfallData[],
	targetMonth: number
): YearlyComparison[] {
	const yearlyGroups = groupByYear(data);
	const currentYear = new Date().getFullYear();

	return Object.entries(yearlyGroups)
		.map(([year, yearData]) => {
			// Filter data for the target month (0-based, so January = 0)
			const monthData = yearData.filter((day: RainfallData) => {
				const date = parseISO(day.date);
				return getMonth(date) === targetMonth;
			});

			const totalRainfall = monthData.reduce((sum, day) => sum + day.rainfall, 0);
			const wetDays = monthData.filter((day) => day.rainfall > 0.1).length;

			// For monthly comparison, averageMonthly is the daily average for that month
			const averageMonthly = monthData.length > 0 ? totalRainfall / monthData.length : 0;

			return {
				year: parseInt(year),
				totalRainfall: Math.round(totalRainfall * 10) / 10,
				averageMonthly: Math.round(averageMonthly * 10) / 10,
				wetDays
			};
		})
		.filter((yearData) => {
			// Include current year if we have any data for this month, even if no rainfall
			// For previous years, only include if there's meaningful rainfall or wet days
			if (yearData.year === currentYear) {
				return true; // Always include current year
			}
			return yearData.totalRainfall > 0 || yearData.wetDays > 0; // Only include years with data for this month
		})
		.sort((a, b) => a.year - b.year);
}

/**
 * Calculate temperature statistics for a dataset
 */
export function calculateTemperatureStats(data: TemperatureData[]): TemperatureStats {
	if (data.length === 0) {
		return { mean: 0, min: 0, max: 0, range: 0 };
	}

	const temperatures = data.map((d) => d.temperature);
	const minTemps = data.map((d) => d.temperatureMin);
	const maxTemps = data.map((d) => d.temperatureMax);

	const mean = temperatures.reduce((sum, temp) => sum + temp, 0) / temperatures.length;
	const min = Math.min(...minTemps);
	const max = Math.max(...maxTemps);

	return {
		mean: Math.round(mean * 10) / 10,
		min: Math.round(min * 10) / 10,
		max: Math.round(max * 10) / 10,
		range: Math.round((max - min) * 10) / 10
	};
}

/**
 * Calculate yearly temperature comparison statistics
 */
export function calculateYearlyTemperatureComparison(
	data: TemperatureData[]
): TemperatureComparison[] {
	const yearlyGroups = data.reduce(
		(acc, item) => {
			const year = getYear(parseISO(item.date));
			if (!acc[year]) acc[year] = [];
			acc[year].push(item);
			return acc;
		},
		{} as Record<number, TemperatureData[]>
	);

	return Object.entries(yearlyGroups)
		.map(([year, yearData]) => {
			const meanTemperature =
				yearData.reduce((sum, day) => sum + day.temperature, 0) / yearData.length;
			const minTemperature = Math.min(...yearData.map((d) => d.temperatureMin));
			const maxTemperature = Math.max(...yearData.map((d) => d.temperatureMax));
			const warmDays = yearData.filter((d) => d.temperatureMax > 20).length;
			const frostDays = yearData.filter((d) => d.temperatureMin < 0).length;
			const heatwaveDays = yearData.filter((d) => d.temperatureMax > 25).length;

			return {
				year: parseInt(year),
				meanTemperature: Math.round(meanTemperature * 10) / 10,
				minTemperature: Math.round(minTemperature * 10) / 10,
				maxTemperature: Math.round(maxTemperature * 10) / 10,
				warmDays,
				frostDays,
				heatwaveDays
			};
		})
		.sort((a, b) => a.year - b.year);
}

/**
 * Calculate monthly temperature comparison for a specific month across years
 */
export function calculateMonthlyTemperatureComparison(
	data: TemperatureData[],
	targetMonth: number
): TemperatureComparison[] {
	const yearlyGroups = data.reduce(
		(acc, item) => {
			const year = getYear(parseISO(item.date));
			if (!acc[year]) acc[year] = [];
			acc[year].push(item);
			return acc;
		},
		{} as Record<number, TemperatureData[]>
	);
	const currentYear = new Date().getFullYear();

	const results = Object.entries(yearlyGroups)
		.map(([year, yearData]) => {
			// Filter data for the target month
			const monthData = yearData.filter((day: TemperatureData) => {
				const date = parseISO(day.date);
				return getMonth(date) === targetMonth;
			});

			if (monthData.length === 0) {
				return null;
			}

			const meanTemperature =
				monthData.reduce((sum, day) => sum + day.temperature, 0) / monthData.length;
			const minTemperature = Math.min(...monthData.map((d) => d.temperatureMin));
			const maxTemperature = Math.max(...monthData.map((d) => d.temperatureMax));
			const warmDays = monthData.filter((d) => d.temperatureMax > 20).length;
			const frostDays = monthData.filter((d) => d.temperatureMin < 0).length;
			const heatwaveDays = monthData.filter((d) => d.temperatureMax > 25).length;

			return {
				year: parseInt(year),
				meanTemperature: Math.round(meanTemperature * 10) / 10,
				minTemperature: Math.round(minTemperature * 10) / 10,
				maxTemperature: Math.round(maxTemperature * 10) / 10,
				warmDays,
				frostDays,
				heatwaveDays
			};
		})
		.filter((item): item is TemperatureComparison => {
			if (item === null) return false;
			// Include current year even if it has minimal data
			if (item.year === currentYear) {
				return true;
			}
			// For previous years, only include if there's meaningful data
			return item !== null;
		});

	return results.sort((a, b) => a.year - b.year);
}

/**
 * Get recent temperature data
 */
export function getRecentTemperature(
	data: TemperatureData[],
	days: number = 30
): TemperatureData[] {
	return data.slice(-days);
}

/**
 * Calculate temperature extremes (heat waves and cold snaps)
 */
export function calculateTemperatureExtremes(data: TemperatureData[]): {
	heatWaves: Array<{ start: string; end: string; duration: number; maxTemp: number }>;
	coldSnaps: Array<{ start: string; end: string; duration: number; minTemp: number }>;
} {
	const heatWaves: Array<{ start: string; end: string; duration: number; maxTemp: number }> = [];
	const coldSnaps: Array<{ start: string; end: string; duration: number; minTemp: number }> = [];

	let heatWaveStart: string | null = null;
	let heatWaveDuration = 0;
	let heatWaveMaxTemp = 0;

	let coldSnapStart: string | null = null;
	let coldSnapDuration = 0;
	let coldSnapMinTemp = 0;

	data.forEach((day, index) => {
		// Heat wave detection (3+ consecutive days above 25°C)
		if (day.temperatureMax > 25) {
			if (heatWaveStart === null) {
				heatWaveStart = day.date;
				heatWaveDuration = 1;
				heatWaveMaxTemp = day.temperatureMax;
			} else {
				heatWaveDuration++;
				heatWaveMaxTemp = Math.max(heatWaveMaxTemp, day.temperatureMax);
			}
		} else {
			if (heatWaveStart !== null && heatWaveDuration >= 3) {
				heatWaves.push({
					start: heatWaveStart,
					end: index > 0 ? data[index - 1].date : day.date,
					duration: heatWaveDuration,
					maxTemp: heatWaveMaxTemp
				});
			}
			heatWaveStart = null;
			heatWaveDuration = 0;
			heatWaveMaxTemp = 0;
		}

		// Cold snap detection (3+ consecutive days below -2°C)
		if (day.temperatureMin < -2) {
			if (coldSnapStart === null) {
				coldSnapStart = day.date;
				coldSnapDuration = 1;
				coldSnapMinTemp = day.temperatureMin;
			} else {
				coldSnapDuration++;
				coldSnapMinTemp = Math.min(coldSnapMinTemp, day.temperatureMin);
			}
		} else {
			if (coldSnapStart !== null && coldSnapDuration >= 3) {
				coldSnaps.push({
					start: coldSnapStart,
					end: index > 0 ? data[index - 1].date : day.date,
					duration: coldSnapDuration,
					minTemp: coldSnapMinTemp
				});
			}
			coldSnapStart = null;
			coldSnapDuration = 0;
			coldSnapMinTemp = 0;
		}
	});

	// Handle ongoing extremes
	if (heatWaveStart !== null && heatWaveDuration >= 3) {
		heatWaves.push({
			start: heatWaveStart,
			end: data[data.length - 1].date,
			duration: heatWaveDuration,
			maxTemp: heatWaveMaxTemp
		});
	}

	if (coldSnapStart !== null && coldSnapDuration >= 3) {
		coldSnaps.push({
			start: coldSnapStart,
			end: data[data.length - 1].date,
			duration: coldSnapDuration,
			minTemp: coldSnapMinTemp
		});
	}

	return { heatWaves, coldSnaps };
}

/**
 * Enhanced yearly comparison with temperature data
 */
export function calculateEnhancedYearlyComparison(
	rainfallData: RainfallData[],
	temperatureData: TemperatureData[]
): YearlyComparison[] {
	const rainfallComparison = calculateYearlyComparison(rainfallData);
	const temperatureComparison = calculateYearlyTemperatureComparison(temperatureData);

	// Merge the data
	return rainfallComparison.map((rainfall) => {
		const temperature = temperatureComparison.find((t) => t.year === rainfall.year);
		return {
			...rainfall,
			averageTemperature: temperature?.meanTemperature,
			minTemperature: temperature?.minTemperature,
			maxTemperature: temperature?.maxTemperature
		};
	});
}

/**
 * Enhanced monthly comparison with temperature data
 */
export function calculateEnhancedMonthlyComparison(
	rainfallData: RainfallData[],
	temperatureData: TemperatureData[],
	targetMonth: number
): YearlyComparison[] {
	const rainfallComparison = calculateMonthlyComparison(rainfallData, targetMonth);
	const temperatureComparison = calculateMonthlyTemperatureComparison(temperatureData, targetMonth);

	// Merge the data
	return rainfallComparison.map((rainfall) => {
		const temperature = temperatureComparison.find((t) => t.year === rainfall.year);
		return {
			...rainfall,
			averageTemperature: temperature?.meanTemperature,
			minTemperature: temperature?.minTemperature,
			maxTemperature: temperature?.maxTemperature
		};
	});
}

/**
 * New Helper function to determine season from a date
 */
export function getSeason(date: Date): Season {
	const month = getMonth(date); // 0-indexed (January is 0)
	if (month >= 2 && month <= 4) return 'Spring'; // Mar, Apr, May
	if (month >= 5 && month <= 7) return 'Summer'; // Jun, Jul, Aug
	if (month >= 8 && month <= 10) return 'Autumn'; // Sep, Oct, Nov
	return 'Winter'; // Dec, Jan, Feb
}

/**
 * Calculate seasonal rainfall statistics
 */
export function calculateSeasonalRainfallStats(
	data: RainfallData[]
): Partial<Record<Season, SeasonalRainfallStat[]>> {
	const seasonalGroups: Partial<Record<Season, Record<number, RainfallData[]>>> = {};

	data.forEach((item) => {
		const date = parseISO(item.date);
		const year = getYear(date);
		const season = getSeason(date);

		if (!seasonalGroups[season]) seasonalGroups[season] = {};
		if (!seasonalGroups[season]![year]) seasonalGroups[season]![year] = [];
		seasonalGroups[season]![year].push(item);
	});

	const result: Partial<Record<Season, SeasonalRainfallStat[]>> = {};

	for (const s in seasonalGroups) {
		const season = s as Season;
		result[season] = [];
		const yearlyDataForSeason = seasonalGroups[season]!;
		for (const y in yearlyDataForSeason) {
			const year = parseInt(y);
			const yearSeasonData = yearlyDataForSeason[year];

			const totalRainfall = yearSeasonData.reduce((sum, day) => sum + day.rainfall, 0);
			const wetDays = yearSeasonData.filter((day) => day.rainfall > 0.1).length;
			const averageDailyRainfall =
				yearSeasonData.length > 0 ? totalRainfall / yearSeasonData.length : 0;
			const maxDailyRainfall = Math.max(...yearSeasonData.map((d) => d.rainfall), 0);

			result[season]!.push({
				year,
				season,
				totalRainfall: Math.round(totalRainfall * 10) / 10,
				wetDays,
				averageDailyRainfall: Math.round(averageDailyRainfall * 10) / 10,
				maxDailyRainfall: Math.round(maxDailyRainfall * 10) / 10
			});
		}
		result[season]!.sort((a, b) => a.year - b.year);
	}
	return result;
}

/**
 * Calculate seasonal temperature statistics
 */
export function calculateSeasonalTemperatureStats(
	data: TemperatureData[]
): Partial<Record<Season, SeasonalTemperatureStat[]>> {
	const seasonalGroups: Partial<Record<Season, Record<number, TemperatureData[]>>> = {};

	data.forEach((item) => {
		const date = parseISO(item.date);
		const year = getYear(date);
		const season = getSeason(date);

		if (!seasonalGroups[season]) seasonalGroups[season] = {};
		if (!seasonalGroups[season]![year]) seasonalGroups[season]![year] = [];
		seasonalGroups[season]![year].push(item);
	});

	const result: Partial<Record<Season, SeasonalTemperatureStat[]>> = {};

	for (const s in seasonalGroups) {
		const season = s as Season;
		result[season] = [];
		const yearlyDataForSeason = seasonalGroups[season]!;
		for (const y in yearlyDataForSeason) {
			const year = parseInt(y);
			const yearSeasonData = yearlyDataForSeason[year];

			if (yearSeasonData.length === 0) continue;

			const averageTemperature =
				yearSeasonData.reduce((sum, day) => sum + day.temperature, 0) / yearSeasonData.length;
			const minTemperature = Math.min(...yearSeasonData.map((d) => d.temperatureMin));
			const maxTemperature = Math.max(...yearSeasonData.map((d) => d.temperatureMax));
			const frostDays = yearSeasonData.filter((d) => d.temperatureMin < 0).length;
			const warmDays = yearSeasonData.filter((d) => d.temperatureMax > 20).length; // Example threshold

			result[season]!.push({
				year,
				season,
				averageTemperature: Math.round(averageTemperature * 10) / 10,
				minTemperature: Math.round(minTemperature * 10) / 10,
				maxTemperature: Math.round(maxTemperature * 10) / 10,
				frostDays,
				warmDays
			});
		}
		result[season]!.sort((a, b) => a.year - b.year);
	}
	return result;
}

/**
 * Generic helper to get top N events (e.g., wettest days, hottest days)
 */
export function getTopNEvents<T>(
	data: T[],
	valueSelector: (item: T) => number,
	n: number,
	ascending: boolean = false // false for descending (max first), true for ascending (min first)
): T[] {
	return [...data] // Create a shallow copy to avoid mutating the original array
		.sort((a, b) => {
			const valA = valueSelector(a);
			const valB = valueSelector(b);
			return ascending ? valA - valB : valB - valA;
		})
		.slice(0, n);
}

/**
 * Get top N monthly rainfall events
 */
export function getTopNMonthlyEvents(
	monthlyData: MonthlyRainfall[],
	n: number,
	ascending: boolean = false // false for descending (max first), true for ascending (min first)
): MonthlyRainfall[] {
	return [...monthlyData]
		.sort((a, b) => (ascending ? a.total - b.total : b.total - a.total))
		.slice(0, n);
}

/**
 * Helper function for simple linear regression
 * (sum( (x_i - mean_x) * (y_i - mean_y) )) / (sum ( (x_i - mean_x)^2 ))
 */
function calculateLinearTrend(data: { x: number; y: number }[]): Trend | undefined {
	if (data.length < 2) return undefined; // Not enough data for a trend

	const n = data.length;
	const sumX = data.reduce((sum, point) => sum + point.x, 0);
	const sumY = data.reduce((sum, point) => sum + point.y, 0);
	const sumXY = data.reduce((sum, point) => sum + point.x * point.y, 0);
	const sumXX = data.reduce((sum, point) => sum + point.x * point.x, 0);
	const sumYY = data.reduce((sum, point) => sum + point.y * point.y, 0);

	const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
	const intercept = (sumY - slope * sumX) / n;

	// Calculate R-squared
	const rNumerator = n * sumXY - sumX * sumY;
	const rDenominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
	const rSquared = rDenominator === 0 ? 0 : Math.pow(rNumerator / rDenominator, 2);

	let description = 'Stable';
	if (slope > 0.05)
		description = 'Increasing'; // Thresholds can be adjusted
	else if (slope < -0.05) description = 'Decreasing';

	return { slope, intercept, description, rSquared };
}

/**
 * Calculate rainfall trend from yearly comparison data
 */
export function calculateRainfallTrend(
	yearlyComparisonData: YearlyComparison[]
): Trend | undefined {
	if (yearlyComparisonData.length < 3) return undefined; // Need at least 3 years for a meaningful trend
	const trendData = yearlyComparisonData.map((d) => ({ x: d.year, y: d.totalRainfall }));
	return calculateLinearTrend(trendData);
}

/**
 * Calculate temperature trend from yearly comparison data
 */
export function calculateTemperatureTrend(
	yearlyComparisonData: TemperatureComparison[]
): Trend | undefined {
	if (yearlyComparisonData.length < 3) return undefined;
	const trendData = yearlyComparisonData.map((d) => ({ x: d.year, y: d.meanTemperature }));
	return calculateLinearTrend(trendData);
}

/**
 * Calculate all enhanced statistics.
 */
export function calculateAllEnhancedStatistics(
	historicalRainfall: RainfallData[],
	historicalTemperature: TemperatureData[],
	historicalWind: WindData[],
	yearlyRainfallComparison: YearlyComparison[],
	yearlyTemperatureComparison: TemperatureComparison[],
	yearlyWindComparison: WindComparison[]
): EnhancedStatistics {
	const seasonalRainfall = calculateSeasonalRainfallStats(historicalRainfall);
	const seasonalTemperature = calculateSeasonalTemperatureStats(historicalTemperature);
	const seasonalWind =
		historicalWind.length > 0 ? calculateSeasonalWindStats(historicalWind) : undefined;

	const topWettestDays = getTopNEvents<RainfallData>(
		historicalRainfall,
		(d) => d.rainfall,
		5,
		false
	) as ExtremeRainfallEvent[];

	const topDryestDays = getTopNEvents<RainfallData>(
		historicalRainfall.filter((d) => d.rainfall > 0), // consider only days with some rain for "driest of the wet"
		(d) => d.rainfall,
		5,
		true // ascending for driest
	) as ExtremeRainfallEvent[];

	const allMonthlyRainfall = calculateMonthlyStats(historicalRainfall);
	const topWettestMonths = getTopNMonthlyEvents(allMonthlyRainfall, 5, false);
	const topDryestMonths = getTopNMonthlyEvents(allMonthlyRainfall, 5, true);

	const topHottestDays = getTopNEvents<TemperatureData>(
		historicalTemperature,
		(d) => d.temperatureMax, // Use max temp for hottest
		5,
		false
	) as ExtremeTemperatureEvent[];

	const topColdestDays = getTopNEvents<TemperatureData>(
		historicalTemperature,
		(d) => d.temperatureMin, // Use min temp for coldest
		5,
		true // ascending for coldest
	) as ExtremeTemperatureEvent[];

	const topWindiestDays =
		historicalWind.length > 0
			? (getTopNEvents<WindData>(
					historicalWind,
					(d) => d.windGusts, // Use gusts for windiest
					5,
					false
				) as ExtremeWindEvent[])
			: undefined;

	const topCalmestDays =
		historicalWind.length > 0
			? (getTopNEvents<WindData>(
					historicalWind.filter((d) => d.windSpeed > 0), // Exclude completely calm days
					(d) => d.windSpeed,
					5,
					true // ascending for calmest
				) as ExtremeWindEvent[])
			: undefined;

	const rainfallTrend = calculateRainfallTrend(yearlyRainfallComparison);
	const temperatureTrend = calculateTemperatureTrend(yearlyTemperatureComparison);
	const windTrend =
		yearlyWindComparison.length > 0 ? calculateWindTrend(yearlyWindComparison) : undefined;

	return {
		seasonalRainfall,
		seasonalTemperature,
		seasonalWind,
		topWettestDays,
		topDryestDays,
		topWettestMonths,
		topDryestMonths,
		topHottestDays,
		topColdestDays,
		topWindiestDays,
		topCalmestDays,
		rainfallTrend,
		temperatureTrend,
		windTrend
	};
}

/**
 * Calculate wind statistics for a dataset
 */
export function calculateWindStats(data: WindData[]): WindStats {
	if (data.length === 0) {
		return {
			meanSpeed: 0,
			maxSpeed: 0,
			maxGusts: 0,
			prevailingDirection: 0,
			calmDays: 0,
			gustyDays: 0
		};
	}

	const speeds = data.map((d) => d.windSpeed);
	const gusts = data.map((d) => d.windGusts);

	const meanSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
	const maxSpeed = Math.max(...speeds);
	const maxGusts = Math.max(...gusts);
	const calmDays = data.filter((d) => d.windSpeed < 5).length; // Light air/calm
	const gustyDays = data.filter((d) => d.windGusts > 50).length; // Gusty conditions

	// Calculate prevailing direction (most common direction)
	const directionCounts = new Array(16).fill(0);
	data.forEach((d) => {
		const index = Math.round(d.windDirection / 22.5) % 16;
		directionCounts[index]++;
	});
	const prevailingIndex = directionCounts.indexOf(Math.max(...directionCounts));
	const prevailingDirection = prevailingIndex * 22.5;

	return {
		meanSpeed: Math.round(meanSpeed * 10) / 10,
		maxSpeed: Math.round(maxSpeed * 10) / 10,
		maxGusts: Math.round(maxGusts * 10) / 10,
		prevailingDirection: Math.round(prevailingDirection),
		calmDays,
		gustyDays
	};
}

/**
 * Calculate yearly wind comparison statistics
 */
export function calculateYearlyWindComparison(data: WindData[]): WindComparison[] {
	const yearlyGroups = data.reduce(
		(acc, item) => {
			const year = getYear(parseISO(item.date));
			if (!acc[year]) acc[year] = [];
			acc[year].push(item);
			return acc;
		},
		{} as Record<number, WindData[]>
	);

	return Object.entries(yearlyGroups)
		.map(([year, yearData]) => {
			const meanWindSpeed = yearData.reduce((sum, day) => sum + day.windSpeed, 0) / yearData.length;
			const maxWindSpeed = Math.max(...yearData.map((d) => d.windSpeed));
			const maxGusts = Math.max(...yearData.map((d) => d.windGusts));
			const calmDays = yearData.filter((d) => d.windSpeed < 5).length;
			const gustyDays = yearData.filter((d) => d.windGusts > 50).length;
			const stormyDays = yearData.filter((d) => d.windSpeed > 60).length; // Strong winds

			// Calculate prevailing direction
			const directionCounts = new Array(16).fill(0);
			yearData.forEach((d) => {
				const index = Math.round(d.windDirection / 22.5) % 16;
				directionCounts[index]++;
			});
			const prevailingIndex = directionCounts.indexOf(Math.max(...directionCounts));
			const prevailingDirection = prevailingIndex * 22.5;

			return {
				year: parseInt(year),
				meanWindSpeed: Math.round(meanWindSpeed * 10) / 10,
				maxWindSpeed: Math.round(maxWindSpeed * 10) / 10,
				maxGusts: Math.round(maxGusts * 10) / 10,
				prevailingDirection: Math.round(prevailingDirection),
				calmDays,
				gustyDays,
				stormyDays
			};
		})
		.sort((a, b) => a.year - b.year);
}

/**
 * Calculate monthly wind comparison for a specific month across years
 */
export function calculateMonthlyWindComparison(
	data: WindData[],
	targetMonth: number
): WindComparison[] {
	const yearlyGroups = data.reduce(
		(acc, item) => {
			const year = getYear(parseISO(item.date));
			if (!acc[year]) acc[year] = [];
			acc[year].push(item);
			return acc;
		},
		{} as Record<number, WindData[]>
	);

	const results = Object.entries(yearlyGroups)
		.map(([year, yearData]) => {
			// Filter data for the target month
			const monthData = yearData.filter((day: WindData) => {
				const date = parseISO(day.date);
				return getMonth(date) === targetMonth;
			});

			if (monthData.length === 0) {
				return null;
			}

			const meanWindSpeed =
				monthData.reduce((sum, day) => sum + day.windSpeed, 0) / monthData.length;
			const maxWindSpeed = Math.max(...monthData.map((d) => d.windSpeed));
			const maxGusts = Math.max(...monthData.map((d) => d.windGusts));
			const calmDays = monthData.filter((d) => d.windSpeed < 5).length;
			const gustyDays = monthData.filter((d) => d.windGusts > 50).length;
			const stormyDays = monthData.filter((d) => d.windSpeed > 60).length;

			// Calculate prevailing direction
			const directionCounts = new Array(16).fill(0);
			monthData.forEach((d) => {
				const index = Math.round(d.windDirection / 22.5) % 16;
				directionCounts[index]++;
			});
			const prevailingIndex = directionCounts.indexOf(Math.max(...directionCounts));
			const prevailingDirection = prevailingIndex * 22.5;

			return {
				year: parseInt(year),
				meanWindSpeed: Math.round(meanWindSpeed * 10) / 10,
				maxWindSpeed: Math.round(maxWindSpeed * 10) / 10,
				maxGusts: Math.round(maxGusts * 10) / 10,
				prevailingDirection: Math.round(prevailingDirection),
				calmDays,
				gustyDays,
				stormyDays
			};
		})
		.filter((item): item is WindComparison => item !== null);

	return results.sort((a, b) => a.year - b.year);
}

/**
 * Get recent wind data
 */
export function getRecentWind(data: WindData[], days: number = 30): WindData[] {
	return data.slice(-days);
}

/**
 * Calculate wind extremes (strong wind periods and calm periods)
 */
export function calculateWindExtremes(data: WindData[]): WindExtremes {
	const strongestWinds: Array<{
		start: string;
		end: string;
		duration: number;
		maxSpeed: number;
		maxGusts: number;
	}> = [];
	const calmPeriods: Array<{
		start: string;
		end: string;
		duration: number;
		avgSpeed: number;
	}> = [];

	let strongWindStart: string | null = null;
	let strongWindDuration = 0;
	let strongWindMaxSpeed = 0;
	let strongWindMaxGusts = 0;

	let calmStart: string | null = null;
	let calmDuration = 0;
	let calmTotalSpeed = 0;

	data.forEach((day, index) => {
		// Strong wind detection (3+ consecutive days with gusts > 60 km/h)
		if (day.windGusts > 60) {
			if (strongWindStart === null) {
				strongWindStart = day.date;
				strongWindDuration = 1;
				strongWindMaxSpeed = day.windSpeed;
				strongWindMaxGusts = day.windGusts;
			} else {
				strongWindDuration++;
				strongWindMaxSpeed = Math.max(strongWindMaxSpeed, day.windSpeed);
				strongWindMaxGusts = Math.max(strongWindMaxGusts, day.windGusts);
			}
		} else {
			if (strongWindStart !== null && strongWindDuration >= 3) {
				strongestWinds.push({
					start: strongWindStart,
					end: index > 0 ? data[index - 1].date : day.date,
					duration: strongWindDuration,
					maxSpeed: strongWindMaxSpeed,
					maxGusts: strongWindMaxGusts
				});
			}
			strongWindStart = null;
			strongWindDuration = 0;
			strongWindMaxSpeed = 0;
			strongWindMaxGusts = 0;
		}

		// Calm period detection (5+ consecutive days with wind speed < 10 km/h)
		if (day.windSpeed < 10) {
			if (calmStart === null) {
				calmStart = day.date;
				calmDuration = 1;
				calmTotalSpeed = day.windSpeed;
			} else {
				calmDuration++;
				calmTotalSpeed += day.windSpeed;
			}
		} else {
			if (calmStart !== null && calmDuration >= 5) {
				calmPeriods.push({
					start: calmStart,
					end: index > 0 ? data[index - 1].date : day.date,
					duration: calmDuration,
					avgSpeed: Math.round((calmTotalSpeed / calmDuration) * 10) / 10
				});
			}
			calmStart = null;
			calmDuration = 0;
			calmTotalSpeed = 0;
		}
	});

	// Handle ongoing extremes
	if (strongWindStart !== null && strongWindDuration >= 3) {
		strongestWinds.push({
			start: strongWindStart,
			end: data[data.length - 1].date,
			duration: strongWindDuration,
			maxSpeed: strongWindMaxSpeed,
			maxGusts: strongWindMaxGusts
		});
	}

	if (calmStart !== null && calmDuration >= 5) {
		calmPeriods.push({
			start: calmStart,
			end: data[data.length - 1].date,
			duration: calmDuration,
			avgSpeed: Math.round((calmTotalSpeed / calmDuration) * 10) / 10
		});
	}

	return { strongestWinds, calmPeriods };
}

/**
 * Calculate seasonal wind statistics
 */
export function calculateSeasonalWindStats(
	data: WindData[]
): Partial<Record<Season, SeasonalWindStat[]>> {
	const seasonalGroups: Partial<Record<Season, Record<number, WindData[]>>> = {};

	data.forEach((item) => {
		const date = parseISO(item.date);
		const year = getYear(date);
		const season = getSeason(date);

		if (!seasonalGroups[season]) seasonalGroups[season] = {};
		if (!seasonalGroups[season]![year]) seasonalGroups[season]![year] = [];
		seasonalGroups[season]![year].push(item);
	});

	const result: Partial<Record<Season, SeasonalWindStat[]>> = {};

	for (const s in seasonalGroups) {
		const season = s as Season;
		result[season] = [];
		const yearlyDataForSeason = seasonalGroups[season]!;
		for (const y in yearlyDataForSeason) {
			const year = parseInt(y);
			const yearSeasonData = yearlyDataForSeason[year];

			if (yearSeasonData.length === 0) continue;

			const meanWindSpeed =
				yearSeasonData.reduce((sum, day) => sum + day.windSpeed, 0) / yearSeasonData.length;
			const maxWindSpeed = Math.max(...yearSeasonData.map((d) => d.windSpeed));
			const maxGusts = Math.max(...yearSeasonData.map((d) => d.windGusts));
			const calmDays = yearSeasonData.filter((d) => d.windSpeed < 5).length;
			const gustyDays = yearSeasonData.filter((d) => d.windGusts > 50).length;

			// Calculate prevailing direction
			const directionCounts = new Array(16).fill(0);
			yearSeasonData.forEach((d) => {
				const index = Math.round(d.windDirection / 22.5) % 16;
				directionCounts[index]++;
			});
			const prevailingIndex = directionCounts.indexOf(Math.max(...directionCounts));
			const prevailingDirection = prevailingIndex * 22.5;

			result[season]!.push({
				year,
				season,
				meanWindSpeed: Math.round(meanWindSpeed * 10) / 10,
				maxWindSpeed: Math.round(maxWindSpeed * 10) / 10,
				maxGusts: Math.round(maxGusts * 10) / 10,
				prevailingDirection: Math.round(prevailingDirection),
				calmDays,
				gustyDays
			});
		}
		result[season]!.sort((a, b) => a.year - b.year);
	}
	return result;
}

/**
 * Calculate wind trend analysis
 */
export function calculateWindTrend(windComparisons: WindComparison[]): Trend {
	if (windComparisons.length < 2) {
		return {
			slope: 0,
			intercept: 0,
			description: 'Insufficient data for trend analysis'
		};
	}

	const years = windComparisons.map((d) => d.year);
	const speeds = windComparisons.map((d) => d.meanWindSpeed);

	// Simple linear regression
	const n = years.length;
	const sumX = years.reduce((a, b) => a + b, 0);
	const sumY = speeds.reduce((a, b) => a + b, 0);
	const sumXY = years.reduce((acc, year, i) => acc + year * speeds[i], 0);
	const sumX2 = years.reduce((acc, year) => acc + year * year, 0);

	const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
	const intercept = (sumY - slope * sumX) / n;

	// Calculate R-squared
	const meanY = sumY / n;
	const ssRes = speeds.reduce((acc, speed, i) => {
		const predicted = slope * years[i] + intercept;
		return acc + Math.pow(speed - predicted, 2);
	}, 0);
	const ssTot = speeds.reduce((acc, speed) => acc + Math.pow(speed - meanY, 2), 0);
	const rSquared = 1 - ssRes / ssTot;

	let description = '';
	const trendMagnitude = Math.abs(slope);
	const speedChangePerDecade = slope * 10;

	if (trendMagnitude < 0.1) {
		description = 'Wind speeds have remained relatively stable';
	} else if (slope > 0) {
		description = `Wind speeds are increasing by ${speedChangePerDecade.toFixed(1)} km/h per decade`;
	} else {
		description = `Wind speeds are decreasing by ${Math.abs(speedChangePerDecade).toFixed(1)} km/h per decade`;
	}

	return {
		slope: Math.round(slope * 1000) / 1000,
		intercept: Math.round(intercept * 10) / 10,
		description,
		rSquared: Math.round(rSquared * 1000) / 1000
	};
}

/**
 * Calculate solar radiation statistics for a dataset
 */
export function calculateSolarStats(data: SolarData[]): SolarStats {
	if (data.length === 0) {
		return {
			meanRadiation: 0,
			maxRadiation: 0,
			minRadiation: 0,
			totalAnnualRadiation: 0,
			peakSolarDays: 0,
			lowSolarDays: 0,
			avgUvIndex: 0,
			maxUvIndex: 0
		};
	}

	const radiations = data.map((d) => d.solarRadiation);

	const meanRadiation = radiations.reduce((sum, rad) => sum + rad, 0) / radiations.length;
	const maxRadiation = Math.max(...radiations);
	const minRadiation = Math.min(...radiations);
	const totalAnnualRadiation = radiations.reduce((sum, rad) => sum + rad, 0);
	const peakSolarDays = data.filter((d) => d.solarRadiation > 20).length; // High solar radiation days
	const lowSolarDays = data.filter((d) => d.solarRadiation < 5).length; // Low solar radiation days

	return {
		meanRadiation: Math.round(meanRadiation * 10) / 10,
		maxRadiation: Math.round(maxRadiation * 10) / 10,
		minRadiation: Math.round(minRadiation * 10) / 10,
		totalAnnualRadiation: Math.round(totalAnnualRadiation * 10) / 10,
		peakSolarDays,
		lowSolarDays,
		avgUvIndex: 0,
		maxUvIndex: 0
	};
}

/**
 * Calculate yearly solar radiation comparison statistics
 */
export function calculateYearlySolarComparison(data: SolarData[]): SolarComparison[] {
	const yearlyGroups = data.reduce(
		(acc, item) => {
			const year = getYear(parseISO(item.date));
			if (!acc[year]) acc[year] = [];
			acc[year].push(item);
			return acc;
		},
		{} as Record<number, SolarData[]>
	);

	const allYearAverages = Object.values(yearlyGroups).map(
		(yearData) => yearData.reduce((sum, day) => sum + day.solarRadiation, 0) / yearData.length
	);
	const overallAverage =
		allYearAverages.reduce((sum, avg) => sum + avg, 0) / allYearAverages.length;

	return Object.entries(yearlyGroups)
		.map(([year, yearData]) => {
			const meanSolarRadiation =
				yearData.reduce((sum, day) => sum + day.solarRadiation, 0) / yearData.length;
			const maxSolarRadiation = Math.max(...yearData.map((d) => d.solarRadiation));
			const totalSolarRadiation = yearData.reduce((sum, day) => sum + day.solarRadiation, 0);
			const peakSolarDays = yearData.filter((d) => d.solarRadiation > 20).length;
			const lowSolarDays = yearData.filter((d) => d.solarRadiation < 5).length;
			const sunnierThanAverage = meanSolarRadiation > overallAverage;

			return {
				year: parseInt(year),
				meanSolarRadiation: Math.round(meanSolarRadiation * 10) / 10,
				maxSolarRadiation: Math.round(maxSolarRadiation * 10) / 10,
				totalSolarRadiation: Math.round(totalSolarRadiation * 10) / 10,
				peakSolarDays,
				lowSolarDays,
				sunnierThanAverage,
				avgUvIndex: 0,
				maxUvIndex: 0
			};
		})
		.sort((a, b) => a.year - b.year);
}

/**
 * Calculate monthly solar radiation comparison for a specific month
 */
export function calculateMonthlySolarComparison(
	data: SolarData[],
	month: number
): SolarComparison[] {
	const monthlyData = data.filter((item) => getMonth(parseISO(item.date)) === month);
	return calculateYearlySolarComparison(monthlyData);
}

/**
 * Get recent solar radiation data
 */
export function getRecentSolar(data: SolarData[], days: number): SolarData[] {
	return data.slice(-days);
}

/**
 * Calculate solar radiation extremes and patterns
 */
export function calculateSolarExtremes(data: SolarData[]): SolarExtremes {
	if (data.length === 0) {
		return {
			brightestDays: [],
			dullestDays: [],
			solarPeaks: [],
			lowSolarPeriods: []
		};
	}

	// Sort by solar radiation for extremes
	const sortedByRadiation = [...data].sort((a, b) => b.solarRadiation - a.solarRadiation);

	const brightestDays = sortedByRadiation.slice(0, 10).map((d, index) => ({
		date: d.date,
		solarRadiation: d.solarRadiation,
		uvIndex: undefined,
		rank: index + 1
	}));

	const dullestDays = sortedByRadiation
		.slice(-10)
		.reverse()
		.map((d, index) => ({
			date: d.date,
			solarRadiation: d.solarRadiation,
			uvIndex: undefined,
			rank: index + 1
		}));

	// Find solar peaks (3+ consecutive days with high radiation)
	const solarPeaks: Array<{
		start: string;
		end: string;
		duration: number;
		avgRadiation: number;
		maxRadiation: number;
	}> = [];

	let currentPeak: SolarData[] = [];
	for (const day of data) {
		if (day.solarRadiation > 18) {
			// High solar radiation threshold
			currentPeak.push(day);
		} else {
			if (currentPeak.length >= 3) {
				const avgRadiation =
					currentPeak.reduce((sum, d) => sum + d.solarRadiation, 0) / currentPeak.length;
				const maxRadiation = Math.max(...currentPeak.map((d) => d.solarRadiation));
				solarPeaks.push({
					start: currentPeak[0].date,
					end: currentPeak[currentPeak.length - 1].date,
					duration: currentPeak.length,
					avgRadiation: Math.round(avgRadiation * 10) / 10,
					maxRadiation: Math.round(maxRadiation * 10) / 10
				});
			}
			currentPeak = [];
		}
	}

	// Find low solar periods (5+ consecutive days with low radiation)
	const lowSolarPeriods: Array<{
		start: string;
		end: string;
		duration: number;
		avgRadiation: number;
	}> = [];

	let currentLowPeriod: SolarData[] = [];
	for (const day of data) {
		if (day.solarRadiation < 7) {
			// Low solar radiation threshold
			currentLowPeriod.push(day);
		} else {
			if (currentLowPeriod.length >= 5) {
				const avgRadiation =
					currentLowPeriod.reduce((sum, d) => sum + d.solarRadiation, 0) / currentLowPeriod.length;
				lowSolarPeriods.push({
					start: currentLowPeriod[0].date,
					end: currentLowPeriod[currentLowPeriod.length - 1].date,
					duration: currentLowPeriod.length,
					avgRadiation: Math.round(avgRadiation * 10) / 10
				});
			}
			currentLowPeriod = [];
		}
	}

	return {
		brightestDays,
		dullestDays,
		solarPeaks,
		lowSolarPeriods
	};
}

/**
 * Calculate solar energy insights for renewable energy potential
 */
export function calculateSolarEnergyInsights(
	solarData: SolarData[],
	latitude: number
): SolarEnergyInsights {
	if (solarData.length === 0) {
		return {
			optimalTiltAngle: 0,
			seasonalEfficiency: {
				spring: 0,
				summer: 0,
				autumn: 0,
				winter: 0
			},
			monthlyEnergyPotential: Array.from({ length: 12 }, (_, i) => ({
				month: format(new Date(2000, i, 1), 'MMMM'),
				potential: 0
			})),
			yearlyEnergyPotential: 0,
			peakSolarHours: 0,
			solarEfficiencyRating: 'Poor',
			recommendedSystemSize: 0,
			estimatedAnnualSavings: 0
		};
	}

	// Standard solar panel efficiency assumptions
	const panelEfficiency = 0.2; // 20% efficiency
	const systemEfficiency = 0.85; // 85% system efficiency
	const panelArea = 1; // 1 m² for calculations

	// Convert MJ/m²/day to kWh/m²/day (1 MJ/m² = 0.278 kWh/m²)
	const avgDailySolarKwh =
		(solarData.reduce((sum, d) => sum + d.solarRadiation, 0) / solarData.length) * 0.278;

	const dailyEnergyPotential = avgDailySolarKwh * panelEfficiency * systemEfficiency * panelArea;
	const yearlyEnergyPotential = dailyEnergyPotential * 365;

	// Optimal tilt angle approximation (latitude - 15° to latitude + 15° range, optimal around latitude)
	const optimalTiltAngle = Math.round(latitude);

	// Calculate monthly energy potential
	const monthlyEnergyPotential = Array.from({ length: 12 }, (_, monthIndex) => {
		const monthData = solarData.filter((d) => getMonth(parseISO(d.date)) === monthIndex);
		const monthlyAvgRadiation =
			monthData.length > 0
				? monthData.reduce((sum, d) => sum + d.solarRadiation, 0) / monthData.length
				: 0;
		const monthlyPotential = monthlyAvgRadiation * 0.278 * panelEfficiency * systemEfficiency;

		return {
			month: format(new Date(2000, monthIndex, 1), 'MMMM'),
			potential: Math.round(monthlyPotential * 100) / 100
		};
	});

	// Calculate seasonal efficiency
	const seasonalData = {
		spring: solarData.filter((d) => {
			const month = getMonth(parseISO(d.date));
			return month >= 2 && month <= 4; // March, April, May
		}),
		summer: solarData.filter((d) => {
			const month = getMonth(parseISO(d.date));
			return month >= 5 && month <= 7; // June, July, August
		}),
		autumn: solarData.filter((d) => {
			const month = getMonth(parseISO(d.date));
			return month >= 8 && month <= 10; // September, October, November
		}),
		winter: solarData.filter((d) => {
			const month = getMonth(parseISO(d.date));
			return month === 11 || month <= 1; // December, January, February
		})
	};

	const seasonalEfficiency = {
		spring:
			seasonalData.spring.length > 0
				? (seasonalData.spring.reduce((sum, d) => sum + d.solarRadiation, 0) /
						seasonalData.spring.length) *
					0.278 *
					panelEfficiency *
					systemEfficiency
				: 0,
		summer:
			seasonalData.summer.length > 0
				? (seasonalData.summer.reduce((sum, d) => sum + d.solarRadiation, 0) /
						seasonalData.summer.length) *
					0.278 *
					panelEfficiency *
					systemEfficiency
				: 0,
		autumn:
			seasonalData.autumn.length > 0
				? (seasonalData.autumn.reduce((sum, d) => sum + d.solarRadiation, 0) /
						seasonalData.autumn.length) *
					0.278 *
					panelEfficiency *
					systemEfficiency
				: 0,
		winter:
			seasonalData.winter.length > 0
				? (seasonalData.winter.reduce((sum, d) => sum + d.solarRadiation, 0) /
						seasonalData.winter.length) *
					0.278 *
					panelEfficiency *
					systemEfficiency
				: 0
	};

	// Calculate additional properties to match SolarEnergyInsights interface
	const peakSolarHours = avgDailySolarKwh / 1000; // Approximate peak sun hours
	const solarEfficiencyRating: 'Poor' | 'Fair' | 'Good' | 'Excellent' =
		avgDailySolarKwh < 2
			? 'Poor'
			: avgDailySolarKwh < 4
				? 'Fair'
				: avgDailySolarKwh < 6
					? 'Good'
					: 'Excellent';

	const recommendedSystemSize = Math.round((yearlyEnergyPotential / 1000) * 4); // kW
	const estimatedAnnualSavings = Math.round(yearlyEnergyPotential * 0.15); // £ at ~15p/kWh

	return {
		optimalTiltAngle,
		seasonalEfficiency: {
			spring: Math.round(seasonalEfficiency.spring * 100) / 100,
			summer: Math.round(seasonalEfficiency.summer * 100) / 100,
			autumn: Math.round(seasonalEfficiency.autumn * 100) / 100,
			winter: Math.round(seasonalEfficiency.winter * 100) / 100
		},
		monthlyEnergyPotential,
		yearlyEnergyPotential: Math.round(yearlyEnergyPotential * 100) / 100,
		peakSolarHours: Math.round(peakSolarHours * 10) / 10,
		solarEfficiencyRating,
		recommendedSystemSize,
		estimatedAnnualSavings
	};
}

/**
 * Calculate growing insights for agriculture and gardening
 */
export function calculateGrowingInsights(
	temperatureData: TemperatureData[],
	solarData: SolarData[]
): GrowingInsights {
	if (temperatureData.length === 0 || solarData.length === 0) {
		return {
			growingDegreeDays: 0,
			frostFreeDays: 0,
			optimalGrowingSeason: {
				start: '',
				end: '',
				duration: 0
			},
			solarGrowingConditions: 'Poor',
			recommendedCrops: []
		};
	}

	// Calculate Growing Degree Days (base 10°C)
	const baseTemp = 10;
	const currentYear = new Date().getFullYear();
	const currentYearTempData = temperatureData.filter(
		(d) => getYear(parseISO(d.date)) === currentYear
	);

	let growingDegreeDays: number;
	let frostFreeDays: number;

	if (currentYearTempData.length > 0) {
		// Use current year data if available
		growingDegreeDays = currentYearTempData.reduce((sum, day) => {
			const avgTemp = day.temperature;
			return sum + Math.max(0, avgTemp - baseTemp);
		}, 0);
		frostFreeDays = currentYearTempData.filter((day) => day.temperatureMin > 0).length;
	} else {
		// Calculate average per year from historical data
		const yearlyGroups = temperatureData.reduce(
			(acc, item) => {
				const year = getYear(parseISO(item.date));
				if (!acc[year]) acc[year] = [];
				acc[year].push(item);
				return acc;
			},
			{} as Record<number, TemperatureData[]>
		);

		const yearlyGrowingDegreeDays = Object.values(yearlyGroups).map((yearData) =>
			yearData.reduce((sum, day) => {
				const avgTemp = day.temperature;
				return sum + Math.max(0, avgTemp - baseTemp);
			}, 0)
		);

		const yearlyFrostFreeDays = Object.values(yearlyGroups).map(
			(yearData) => yearData.filter((day) => day.temperatureMin > 0).length
		);

		growingDegreeDays = Math.round(
			yearlyGrowingDegreeDays.reduce((sum, days) => sum + days, 0) / yearlyGrowingDegreeDays.length
		);

		frostFreeDays = Math.round(
			yearlyFrostFreeDays.reduce((sum, days) => sum + days, 0) / yearlyFrostFreeDays.length
		);
	}

	// Estimate growing season (last spring frost to first autumn frost)
	let growingSeasonStart = '';
	let growingSeasonEnd = '';
	let duration = 0;

	if (currentYearTempData.length > 0) {
		// Find last spring frost (temperature < 0°C before June)
		const springData = currentYearTempData.filter((d) => {
			const month = getMonth(parseISO(d.date));
			return month <= 5; // January to June
		});

		const lastSpringFrost = springData.reverse().find((d) => d.temperatureMin < 0);
		if (lastSpringFrost) {
			const lastFrostDate = parseISO(lastSpringFrost.date);
			lastFrostDate.setDate(lastFrostDate.getDate() + 7); // Add safety margin
			growingSeasonStart = format(lastFrostDate, 'yyyy-MM-dd');
		} else {
			growingSeasonStart = format(new Date(currentYear, 2, 15), 'yyyy-MM-dd'); // Default March 15
		}

		// Find first autumn frost (temperature < 0°C after August)
		const autumnData = currentYearTempData.filter((d) => {
			const month = getMonth(parseISO(d.date));
			return month >= 7; // August onwards
		});

		const firstAutumnFrost = autumnData.find((d) => d.temperatureMin < 0);
		if (firstAutumnFrost) {
			growingSeasonEnd = firstAutumnFrost.date;
		} else {
			growingSeasonEnd = format(new Date(currentYear, 9, 15), 'yyyy-MM-dd'); // Default October 15
		}

		// Calculate duration
		const startDate = parseISO(growingSeasonStart);
		const endDate = parseISO(growingSeasonEnd);
		duration = Math.max(
			0,
			Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
		);
	}

	// Assess solar growing conditions
	const avgSolarRadiation =
		solarData.reduce((sum, d) => sum + d.solarRadiation, 0) / solarData.length;
	let solarGrowingConditions: 'Poor' | 'Fair' | 'Good' | 'Excellent';

	if (avgSolarRadiation < 8) {
		solarGrowingConditions = 'Poor';
	} else if (avgSolarRadiation < 12) {
		solarGrowingConditions = 'Fair';
	} else if (avgSolarRadiation < 16) {
		solarGrowingConditions = 'Good';
	} else {
		solarGrowingConditions = 'Excellent';
	}

	// Recommend crops based on growing conditions
	const avgTemp =
		temperatureData.reduce((sum, d) => sum + d.temperature, 0) / temperatureData.length;
	let recommendedCrops: string[] = [];

	if (avgTemp >= 15 && avgSolarRadiation >= 12 && frostFreeDays >= 180) {
		recommendedCrops = ['Tomatoes', 'Peppers', 'Courgettes', 'Sweetcorn', 'Beans'];
	} else if (avgTemp >= 12 && avgSolarRadiation >= 10 && frostFreeDays >= 150) {
		recommendedCrops = ['Carrots', 'Beetroot', 'Lettuce', 'Spinach', 'Radishes'];
	} else if (avgTemp >= 8 && frostFreeDays >= 120) {
		recommendedCrops = ['Cabbage', 'Brussels sprouts', 'Leeks', 'Onions', 'Potatoes'];
	} else {
		recommendedCrops = ['Hardy herbs', 'Winter salads', 'Sprouting broccoli'];
	}

	return {
		growingDegreeDays: Math.round(growingDegreeDays),
		frostFreeDays,
		optimalGrowingSeason: {
			start: growingSeasonStart,
			end: growingSeasonEnd,
			duration
		},
		solarGrowingConditions,
		recommendedCrops
	};
}

/**
 * Calculate seasonal solar statistics
 */
export function calculateSeasonalSolarStats(
	data: SolarData[]
): Partial<Record<Season, SeasonalSolarStat[]>> {
	const seasonalGroups: Partial<Record<Season, Record<number, SolarData[]>>> = {};

	data.forEach((item) => {
		const date = parseISO(item.date);
		const year = getYear(date);
		const season = getSeason(date);

		if (!seasonalGroups[season]) seasonalGroups[season] = {};
		if (!seasonalGroups[season]![year]) seasonalGroups[season]![year] = [];
		seasonalGroups[season]![year].push(item);
	});

	const result: Partial<Record<Season, SeasonalSolarStat[]>> = {};

	for (const s in seasonalGroups) {
		const season = s as Season;
		result[season] = [];
		const yearlyDataForSeason = seasonalGroups[season]!;
		for (const y in yearlyDataForSeason) {
			const year = parseInt(y);
			const yearSeasonData = yearlyDataForSeason[year];

			if (yearSeasonData.length === 0) continue;

			const meanSolarRadiation =
				yearSeasonData.reduce((sum, day) => sum + day.solarRadiation, 0) / yearSeasonData.length;
			const maxSolarRadiation = Math.max(...yearSeasonData.map((d) => d.solarRadiation));
			const totalSolarRadiation = yearSeasonData.reduce((sum, day) => sum + day.solarRadiation, 0);
			const peakSolarDays = yearSeasonData.filter((d) => d.solarRadiation > 20).length;

			// Calculate energy potential for the season
			const panelEfficiency = 0.2;
			const systemEfficiency = 0.85;
			const energyPotential =
				meanSolarRadiation * 0.278 * panelEfficiency * systemEfficiency * yearSeasonData.length;

			result[season]!.push({
				year,
				season,
				meanSolarRadiation: Math.round(meanSolarRadiation * 10) / 10,
				maxSolarRadiation: Math.round(maxSolarRadiation * 10) / 10,
				totalSolarRadiation: Math.round(totalSolarRadiation * 10) / 10,
				peakSolarDays,
				avgUvIndex: 0,
				energyPotential: Math.round(energyPotential * 100) / 100
			});
		}
		result[season]!.sort((a, b) => a.year - b.year);
	}
	return result;
}
