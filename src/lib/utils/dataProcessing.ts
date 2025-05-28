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
	Trend,
	EnhancedStatistics
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

	return Object.entries(yearlyGroups)
		.map(([year, yearData]) => {
			// Filter data for the target month (0-based, so January = 0)
			const monthData = yearData.filter((day) => {
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
		.filter((yearData) => yearData.totalRainfall > 0 || yearData.wetDays > 0) // Only include years with data for this month
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

	const results = Object.entries(yearlyGroups)
		.map(([year, yearData]) => {
			// Filter data for the target month
			const monthData = yearData.filter((day) => {
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
		.filter((item): item is TemperatureComparison => item !== null);

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
	yearlyRainfallComparison: YearlyComparison[],
	yearlyTemperatureComparison: TemperatureComparison[]
): EnhancedStatistics {
	const seasonalRainfall = calculateSeasonalRainfallStats(historicalRainfall);
	const seasonalTemperature = calculateSeasonalTemperatureStats(historicalTemperature);

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

	const rainfallTrend = calculateRainfallTrend(yearlyRainfallComparison);
	const temperatureTrend = calculateTemperatureTrend(yearlyTemperatureComparison);

	return {
		seasonalRainfall,
		seasonalTemperature,
		topWettestDays,
		topDryestDays,
		topWettestMonths,
		topDryestMonths,
		topHottestDays,
		topColdestDays,
		rainfallTrend,
		temperatureTrend
	};
}
