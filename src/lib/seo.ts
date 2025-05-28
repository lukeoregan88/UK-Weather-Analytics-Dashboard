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
	title: 'UK Rainfall Analysis Dashboard | Historical Weather Data & Current Conditions',
	description:
		'Comprehensive UK rainfall analysis dashboard featuring historical weather patterns, current conditions, and detailed precipitation data for any UK location. Interactive maps and charts powered by real-time meteorological data.',
	keywords:
		'UK rainfall, weather analysis, precipitation data, historical weather, UK weather dashboard, rainfall patterns, meteorological data, weather charts, UK climate data',
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
