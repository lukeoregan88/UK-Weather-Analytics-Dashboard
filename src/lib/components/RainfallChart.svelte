<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import 'chartjs-adapter-date-fns';
	import type { RainfallData } from '../types.js';

	export let data: RainfallData[] = [];
	export let title: string = 'Rainfall Data';
	export let type: 'line' | 'bar' = 'line';
	export let height: number = 400;

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

		chart = new Chart(ctx, {
			type: type,
			data: {
				datasets: [
					{
						label: 'Rainfall (mm)',
						data: data.map((d) => ({
							x: d.date,
							y: d.rainfall
						})),
						borderColor: 'rgb(59, 130, 246)',
						backgroundColor: 'rgba(59, 130, 246, 0.1)',
						fill: type === 'line',
						tension: 0.1
					}
				]
			},
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
						beginAtZero: true,
						title: {
							display: true,
							text: 'Rainfall (mm)'
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
			y: d.rainfall
		}));

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
