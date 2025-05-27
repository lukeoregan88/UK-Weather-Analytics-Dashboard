<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import 'chartjs-adapter-date-fns';
	import type { TemperatureData } from '../types.js';

	export let data: TemperatureData[] = [];
	export let title: string = 'Temperature Data';
	export let type: 'line' | 'bar' = 'line';
	export let height: number = 400;
	export let showMinMax: boolean = true;

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

	function createChart() {
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const datasets = [
			{
				label: 'Mean Temperature (°C)',
				data: data.map((d) => ({
					x: d.date,
					y: d.temperature
				})),
				borderColor: 'rgb(59, 130, 246)',
				backgroundColor: 'rgba(59, 130, 246, 0.1)',
				fill: false,
				tension: 0.1,
				pointRadius: type === 'line' ? 2 : 0
			}
		];

		if (showMinMax) {
			datasets.push(
				{
					label: 'Max Temperature (°C)',
					data: data.map((d) => ({
						x: d.date,
						y: d.temperatureMax
					})),
					borderColor: 'rgb(239, 68, 68)',
					backgroundColor: 'rgba(239, 68, 68, 0.1)',
					fill: false,
					tension: 0.1,
					pointRadius: type === 'line' ? 1 : 0
				},
				{
					label: 'Min Temperature (°C)',
					data: data.map((d) => ({
						x: d.date,
						y: d.temperatureMin
					})),
					borderColor: 'rgb(34, 197, 94)',
					backgroundColor: 'rgba(34, 197, 94, 0.1)',
					fill: false,
					tension: 0.1,
					pointRadius: type === 'line' ? 1 : 0
				}
			);
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
						title: {
							display: true,
							text: 'Temperature (°C)'
						},
						grid: {
							color: (context) => {
								if (context.tick.value === 0) {
									return 'rgba(0, 0, 0, 0.3)';
								}
								return 'rgba(0, 0, 0, 0.1)';
							}
						}
					}
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

		chart.data.datasets[0].data = data.map((d) => ({
			x: d.date,
			y: d.temperature
		}));

		if (showMinMax && chart.data.datasets.length > 1) {
			chart.data.datasets[1].data = data.map((d) => ({
				x: d.date,
				y: d.temperatureMax
			}));
			chart.data.datasets[2].data = data.map((d) => ({
				x: d.date,
				y: d.temperatureMin
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
