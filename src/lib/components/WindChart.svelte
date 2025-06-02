<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import 'chartjs-adapter-date-fns';
	import type { WindData } from '../types.js';

	export let data: WindData[] = [];
	export let title: string = 'Wind Data';
	export let type: 'line' | 'bar' | 'polar' = 'line';
	export let height: number = 400;
	export let showDirection: boolean = true;
	export let showGusts: boolean = true;

	let canvas: HTMLCanvasElement;
	let chart: any = null;

	Chart.register(...registerables);

	onMount(() => {
		createChart();
		return () => {
			if (chart) {
				chart.destroy();
			}
		};
	});

	$: if (chart && data) {
		updateChart();
	}

	function getWindDirectionLabel(degrees: number): string {
		const directions = [
			'N',
			'NNE',
			'NE',
			'ENE',
			'E',
			'ESE',
			'SE',
			'SSE',
			'S',
			'SSW',
			'SW',
			'WSW',
			'W',
			'WNW',
			'NW',
			'NNW'
		];
		const index = Math.round(degrees / 22.5) % 16;
		return directions[index];
	}

	function getWindDirectionData() {
		// Create wind direction distribution for polar chart
		const directionCounts = new Array(16).fill(0);
		const directionLabels = [
			'N',
			'NNE',
			'NE',
			'ENE',
			'E',
			'ESE',
			'SE',
			'SSE',
			'S',
			'SSW',
			'SW',
			'WSW',
			'W',
			'WNW',
			'NW',
			'NNW'
		];

		data.forEach((d) => {
			const index = Math.round(d.windDirection / 22.5) % 16;
			directionCounts[index]++;
		});

		return {
			labels: directionLabels,
			datasets: [
				{
					label: 'Wind Direction Frequency',
					data: directionCounts,
					backgroundColor: 'rgba(59, 130, 246, 0.6)',
					borderColor: 'rgb(59, 130, 246)',
					borderWidth: 2
				}
			]
		};
	}

	function createChart() {
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		if (type === 'polar') {
			// Create polar chart for wind direction
			chart = new Chart(ctx, {
				type: 'polarArea',
				data: getWindDirectionData(),
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						title: {
							display: true,
							text: title,
							font: {
								size: 16,
								weight: 'bold'
							}
						},
						legend: {
							display: false
						}
					},
					scales: {
						r: {
							beginAtZero: true
						}
					}
				}
			});
			return;
		}

		// Create line/bar chart for wind speed and gusts
		const datasets = [
			{
				label: 'Wind Speed (km/h)',
				data: data.map((d) => ({
					x: d.date,
					y: d.windSpeed
				})),
				borderColor: 'rgb(59, 130, 246)',
				backgroundColor: 'rgba(59, 130, 246, 0.1)',
				fill: false,
				tension: 0.1,
				pointRadius: type === 'line' ? 2 : 0,
				yAxisID: 'y'
			}
		];

		if (showGusts) {
			datasets.push({
				label: 'Wind Gusts (km/h)',
				data: data.map((d) => ({
					x: d.date,
					y: d.windGusts
				})),
				borderColor: 'rgb(239, 68, 68)',
				backgroundColor: 'rgba(239, 68, 68, 0.1)',
				fill: false,
				tension: 0.1,
				pointRadius: type === 'line' ? 1 : 0,
				yAxisID: 'y'
			});
		}

		if (showDirection) {
			datasets.push({
				label: 'Wind Direction (°)',
				data: data.map((d) => ({
					x: d.date,
					y: d.windDirection
				})),
				borderColor: 'rgb(34, 197, 94)',
				backgroundColor: 'rgba(34, 197, 94, 0.1)',
				fill: false,
				tension: 0.1,
				pointRadius: type === 'line' ? 1 : 0,
				yAxisID: 'y1'
			});
		}

		chart = new Chart(ctx, {
			type: type,
			data: { datasets },
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					title: {
						display: true,
						text: title,
						font: {
							size: 16,
							weight: 'bold'
						}
					},
					legend: {
						display: true,
						position: 'top'
					},
					tooltip: {
						callbacks: {
							afterLabel: (context) => {
								if (context.dataset.label?.includes('Direction')) {
									const degrees = context.parsed.y;
									return `Direction: ${getWindDirectionLabel(degrees)}`;
								}
								return '';
							}
						}
					}
				},
				scales: {
					x: {
						type: 'time',
						time: {
							unit: 'day',
							displayFormats: {
								day: 'MMM dd'
							}
						},
						title: {
							display: true,
							text: 'Date'
						}
					},
					y: {
						type: 'linear',
						display: true,
						position: 'left',
						title: {
							display: true,
							text: 'Wind Speed (km/h)'
						},
						min: 0
					},
					...(showDirection && {
						y1: {
							type: 'linear',
							display: true,
							position: 'right',
							title: {
								display: true,
								text: 'Direction (°)'
							},
							min: 0,
							max: 360,
							grid: {
								drawOnChartArea: false
							}
						}
					})
				},
				interaction: {
					intersect: false,
					mode: 'index'
				}
			}
		});
	}

	function updateChart() {
		if (!chart) return;

		if (type === 'polar') {
			chart.data = getWindDirectionData();
			chart.update();
			return;
		}

		chart.data.datasets[0].data = data.map((d) => ({
			x: d.date,
			y: d.windSpeed
		}));

		if (showGusts && chart.data.datasets.length > 1) {
			const gustIndex = showDirection ? 1 : 1;
			chart.data.datasets[gustIndex].data = data.map((d) => ({
				x: d.date,
				y: d.windGusts
			}));
		}

		if (showDirection && chart.data.datasets.length > (showGusts ? 2 : 1)) {
			const directionIndex = showGusts ? 2 : 1;
			chart.data.datasets[directionIndex].data = data.map((d) => ({
				x: d.date,
				y: d.windDirection
			}));
		}

		chart.update();
	}
</script>

<div class="chart-container" style="height: {height}px;">
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.chart-container {
		position: relative;
		width: 100%;
	}
</style>
