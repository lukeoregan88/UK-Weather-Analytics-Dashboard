import type { RainfallData, MonthlyRainfall, YearlyComparison, DailyRainfall } from '../types.js';
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
	let currentDrought: { start: string; duration: number } | null = null;

	data.forEach((day, index) => {
		if (day.rainfall < droughtThreshold) {
			if (!currentDrought) {
				currentDrought = { start: day.date, duration: 1 };
			} else {
				currentDrought.duration++;
			}
		} else {
			if (currentDrought && currentDrought.duration >= 7) {
				// Only count droughts of 7+ days
				droughts.push({
					start: currentDrought.start,
					end: index > 0 ? data[index - 1].date : day.date,
					duration: currentDrought.duration
				});
			}
			currentDrought = null;
		}
	});

	// Handle ongoing drought
	if (
		currentDrought !== null &&
		(currentDrought as { start: string; duration: number }).duration >= 7
	) {
		const ongoingDrought = currentDrought as { start: string; duration: number };
		droughts.push({
			start: ongoingDrought.start,
			end: data[data.length - 1].date,
			duration: ongoingDrought.duration
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
