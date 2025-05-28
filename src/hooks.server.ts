import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event, {
		transformPageChunk: ({ html }) => {
			// Add any server-side SEO transformations here
			// For example, you could inject dynamic meta tags based on the route
			return html;
		}
	});

	// Add security headers that also help with SEO
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-XSS-Protection', '1; mode=block');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	// Add cache headers for static assets (helps with page speed)
	if (
		event.url.pathname.startsWith('/favicon') ||
		event.url.pathname.endsWith('.png') ||
		event.url.pathname.endsWith('.ico')
	) {
		response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
	}

	return response;
};
