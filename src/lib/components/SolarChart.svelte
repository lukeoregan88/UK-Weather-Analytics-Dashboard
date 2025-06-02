<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import 'chartjs-adapter-date-fns';
	import type { SolarData } from '../types.js';

	export let data: SolarData[] = [];
	export let title: string = 'Solar Radiation Data';
	export let type: 'line' | 'bar' = 'line';
	export let height: number = 400;
	export let showEnergy: boolean = false; // Show energy potential instead of raw radiation

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

		const datasets = [];

		if (showEnergy) {
			// Convert MJ/m²/day to kWh/m²/day and apply panel efficiency
			const panelEfficiency = 0.2; // 20%
			const systemEfficiency = 0.85; // 85%
			datasets.push({
				label: 'Daily Energy Potential (kWh/m²)',
				data: data.map((d) => ({
					x: d.date,
					y: d.solarRadiation * 0.278 * panelEfficiency * systemEfficiency
				})),
				borderColor: 'rgb(34, 197, 94)',
				backgroundColor: 'rgba(34, 197, 94, 0.1)',
				fill: type === 'bar',
				tension: 0.1,
				pointRadius: type === 'line' ? 2 : 0,
				yAxisID: 'y'
			});
		} else {
			datasets.push({
				label: 'Solar Radiation (MJ/m²/day)',
				data: data.map((d) => ({
					x: d.date,
					y: d.solarRadiation
				})),
				borderColor: 'rgb(255, 193, 7)',
				backgroundColor: 'rgba(255, 193, 7, 0.1)',
				fill: type === 'bar',
				tension: 0.1,
				pointRadius: type === 'line' ? 2 : 0,
				yAxisID: 'y'
			});
		}

		const scales: any = {
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
					text: showEnergy ? 'Energy Potential (kWh/m²/day)' : 'Solar Radiation (MJ/m²/day)'
				},
				beginAtZero: true,
				grid: {
					color: 'rgba(0, 0, 0, 0.1)'
				}
			}
		};

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
				scales,
				interaction: {
					intersect: false,
					mode: 'index'
				}
			}
		});
	}

	function updateChart() {
		if (!chart) return;

		if (showEnergy) {
			const panelEfficiency = 0.2;
			const systemEfficiency = 0.85;
			chart.data.datasets[0].data = data.map((d) => ({
				x: d.date,
				y: d.solarRadiation * 0.278 * panelEfficiency * systemEfficiency
			}));
		} else {
			chart.data.datasets[0].data = data.map((d) => ({
				x: d.date,
				y: d.solarRadiation
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
