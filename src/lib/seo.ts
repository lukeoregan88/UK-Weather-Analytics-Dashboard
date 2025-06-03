export interface SEOData {
	title?: string;
	description?: string;
	keywords?: string;
	canonical?: string;
	ogImage?: string;
	ogType?: string;
	twitterCard?: string;
	noindex?: boolean;
}

export const defaultSEO: SEOData = {
	title: 'UK Weather Analytics Dashboard | Comprehensive Weather Data & Climate Analysis',
	description:
		'Advanced UK weather analytics dashboard featuring rainfall, temperature, wind, and solar data analysis. Historical weather patterns, current conditions, and detailed meteorological insights for any UK location with interactive charts and real-time data.',
	keywords:
		'UK weather, weather analytics, rainfall analysis, temperature data, wind analysis, solar radiation, weather dashboard, climate data, historical weather, meteorological data, weather charts, UK weather patterns, weather intelligence, environmental data',
	canonical: 'https://your-domain.com',
	ogImage: 'https://your-domain.com/og-image.png',
	ogType: 'website',
	twitterCard: 'summary_large_image',
	noindex: false
};

export function generateSEOTags(seo: SEOData = {}): string {
	const mergedSEO = { ...defaultSEO, ...seo };

	const tags = [
		`<title>${mergedSEO.title}</title>`,
		`<meta name="description" content="${mergedSEO.description}" />`,
		`<meta name="keywords" content="${mergedSEO.keywords}" />`,
		mergedSEO.canonical ? `<link rel="canonical" href="${mergedSEO.canonical}" />` : '',
		mergedSEO.noindex
			? '<meta name="robots" content="noindex, nofollow" />'
			: '<meta name="robots" content="index, follow" />',

		// Open Graph
		`<meta property="og:title" content="${mergedSEO.title}" />`,
		`<meta property="og:description" content="${mergedSEO.description}" />`,
		`<meta property="og:type" content="${mergedSEO.ogType}" />`,
		mergedSEO.canonical ? `<meta property="og:url" content="${mergedSEO.canonical}" />` : '',
		mergedSEO.ogImage ? `<meta property="og:image" content="${mergedSEO.ogImage}" />` : '',

		// Twitter
		`<meta name="twitter:card" content="${mergedSEO.twitterCard}" />`,
		`<meta name="twitter:title" content="${mergedSEO.title}" />`,
		`<meta name="twitter:description" content="${mergedSEO.description}" />`,
		mergedSEO.ogImage ? `<meta name="twitter:image" content="${mergedSEO.ogImage}" />` : ''
	].filter(Boolean);

	return tags.join('\n\t');
}

export function generateStructuredData(data: {
	name: string;
	description: string;
	url: string;
	applicationCategory?: string;
	keywords?: string;
}): string {
	const structuredData = {
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: data.name,
		description: data.description,
		url: data.url,
		applicationCategory: data.applicationCategory || 'Weather',
		operatingSystem: 'Web Browser',
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'GBP'
		},
		creator: {
			'@type': 'Organization',
			name: data.name
		},
		keywords: data.keywords,
		inLanguage: 'en-GB',
		isAccessibleForFree: true,
		browserRequirements: 'Requires JavaScript. Requires HTML5.'
	};

	return `<script type="application/ld+json">${JSON.stringify(structuredData, null, 2)}</script>`;
}
