<script>
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>Page Not Found - Rainfall App</title>
</svelte:head>

<div class="error-container">
	<div class="error-content">
		<h1 class="error-code">{$page.status || 404}</h1>
		<h2 class="error-message">
			{#if $page.status === 404}
				Page Not Found
			{:else}
				{$page.error?.message || 'Something went wrong'}
			{/if}
		</h2>
		<p class="error-description">
			{#if $page.status === 404}
				The page you're looking for doesn't exist or has been moved.
			{:else}
				We're sorry, but something unexpected happened.
			{/if}
		</p>
		<a href="/" class="home-link">← Back to Home</a>
	</div>
</div>

<style>
	.error-container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: 2rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		text-align: center;
	}

	.error-content {
		max-width: 500px;
	}

	.error-code {
		font-size: 6rem;
		font-weight: bold;
		margin: 0;
		opacity: 0.8;
	}

	.error-message {
		font-size: 2rem;
		margin: 1rem 0;
		font-weight: 300;
	}

	.error-description {
		font-size: 1.1rem;
		margin: 1.5rem 0 2rem;
		opacity: 0.9;
		line-height: 1.6;
	}

	.home-link {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		background: rgba(255, 255, 255, 0.2);
		color: white;
		text-decoration: none;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.3);
		transition: all 0.3s ease;
		font-weight: 500;
	}

	.home-link:hover {
		background: rgba(255, 255, 255, 0.3);
		transform: translateY(-2px);
	}
</style>
