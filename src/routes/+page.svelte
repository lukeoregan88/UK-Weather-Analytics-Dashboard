<script lang="ts">
	import RainfallDashboard from '$lib/components/RainfallDashboard.svelte';
</script>

<svelte:head>
	<title>UK Rainfall Analysis Dashboard | Historical Weather Data & Current Conditions</title>
	<meta
		name="description"
		content="Comprehensive UK rainfall analysis dashboard featuring historical weather patterns, current conditions, and detailed precipitation data for any UK location. Interactive maps and charts powered by real-time meteorological data."
	/>
	<meta
		name="keywords"
		content="UK rainfall, weather analysis, precipitation data, historical weather, UK weather dashboard, rainfall patterns, meteorological data, weather charts, UK climate data"
	/>

	<!-- Open Graph / Facebook -->
	<meta property="og:url" content="https://your-domain.com" />
	<meta
		property="og:title"
		content="UK Rainfall Analysis Dashboard | Historical Weather Data & Current Conditions"
	/>
	<meta
		property="og:description"
		content="Comprehensive UK rainfall analysis dashboard featuring historical weather patterns, current conditions, and detailed precipitation data for any UK location."
	/>
	<meta property="og:image" content="https://your-domain.com/og-image.png" />

	<!-- Twitter Card -->
	<meta name="twitter:url" content="https://your-domain.com" />
	<meta
		name="twitter:title"
		content="UK Rainfall Analysis Dashboard | Historical Weather Data & Current Conditions"
	/>
	<meta
		name="twitter:description"
		content="Comprehensive UK rainfall analysis dashboard featuring historical weather patterns, current conditions, and detailed precipitation data for any UK location."
	/>
	<meta name="twitter:image" content="https://your-domain.com/og-image.png" />

	<!-- Structured Data (JSON-LD) -->
	{@html `<script type="application/ld+json">
	{
		"@context": "https://schema.org",
		"@type": "WebApplication",
		"name": "UK Rainfall Analysis Dashboard",
		"description": "Comprehensive UK rainfall analysis dashboard featuring historical weather patterns, current conditions, and detailed precipitation data for any UK location.",
		"url": "https://your-domain.com",
		"applicationCategory": "Weather",
		"operatingSystem": "Web Browser",
		"offers": {
			"@type": "Offer",
			"price": "0",
			"priceCurrency": "GBP"
		},
		"creator": {
			"@type": "Organization",
			"name": "UK Rainfall Analysis Dashboard"
		},
		"keywords": "UK rainfall, weather analysis, precipitation data, historical weather, meteorological data",
		"inLanguage": "en-GB",
		"isAccessibleForFree": true,
		"browserRequirements": "Requires JavaScript. Requires HTML5."
	}
	</script>`}
</svelte:head>

<RainfallDashboard />
