<div class="mt-8 border-t border-gray-200 bg-gray-200 pt-6 pb-12">
	<div class="mx-auto max-w-7xl px-4">
		<div class="rounded-lg bg-gray-200 p-4">
			<h4 class="mb-2 text-sm font-semibold text-gray-700">Data Sources</h4>
			<div class="space-y-1 text-xs text-gray-600">
				<p>
					<strong>Weather Data:</strong> Historical and current weather data provided by
					<a
						href="https://open-meteo.com/"
						target="_blank"
						rel="noopener noreferrer"
						class="text-blue-600 underline hover:text-blue-800"
					>
						Open-Meteo API
					</a>
					- Open-source weather API with historical data from 1940-present
				</p>
				<p>
					<strong>Rate Limiting:</strong> Rate limiting implemented to respect Open-Meteo's API
					limits - <strong>100 calls/minute</strong>
				</p>
				<p>
					<strong>Location Data:</strong> UK postcode geocoding provided by
					<a
						href="https://postcodes.io/"
						target="_blank"
						rel="noopener noreferrer"
						class="text-blue-600 underline hover:text-blue-800"
					>
						Postcodes.io
					</a>
					- Free UK postcode lookup API
				</p>
				<p>
					<strong>Data Coverage:</strong> Rainfall and temperature data spans up to 10 years of historical
					records. Current weather conditions are updated hourly. All data is cached locally to minimise
					API requests.
				</p>
				<p class="mt-2 text-gray-500">
					<a
						href="https://github.com/lukeoregan88/UK-Weather-Analytics-Dashboard"
						target="_blank"
						rel="noopener noreferrer"
						class="text-blue-600 underline hover:text-blue-800">View source code on GitHub</a
					>
					-
					<em
						>Last updated: {new Date().toLocaleDateString('en-GB', {
							year: 'numeric',
							month: 'long',
							day: 'numeric',
							hour: '2-digit',
							minute: '2-digit'
						})}</em
					>
				</p>
				<h4 class="mt-4 mb-2 text-sm font-semibold text-gray-700">Support My Project</h4>
				<p class="text-xs text-gray-600">
					<a href="https://buymeacoffee.com/lukeoregan" target="_blank" rel="noopener noreferrer"
						><strong>Buy me a coffee</strong> - buymeacoffee.com/lukeoregan</a
					>
				</p>
				<p class="text-xs text-gray-600">
					<i class="fa-brands fa-bitcoin"></i> <strong>Bitcoin:</strong>
					<a
						href="https://www.blockchain.com/btc/address/bc1qmpl0fpn35ya78z2evj794kc7uu8sd4x8n69640"
						target="_blank"
						rel="noopener noreferrer"
					>
						bc1qmpl0fpn35ya78z2evj794kc7uu8sd4x8n69640
					</a>
				</p>
				<p class="text-xs text-gray-600">
					<i class="fa-brands fa-ethereum"></i> <strong>Ethereum:</strong>
					<a
						href="https://etherscan.io/address/0xF63794858A90629f7366e4d2e5817e024c2Ae365"
						target="_blank"
						rel="noopener noreferrer"
					>
						0xF63794858A90629f7366e4d2e5817e024c2Ae365
					</a>
				</p>
				<p class="text-xs text-gray-600">
					<i class="fa-kit fa-solana"></i> <strong>Solana:</strong>
					<a
						href="https://explorer.solana.com/address/2zgoiSUhb8yo3eu35te9BcSQoa6wdVTmpi8AEHd49Jdj"
						target="_blank"
						rel="noopener noreferrer"
					>
						2zgoiSUhb8yo3eu35te9BcSQoa6wdVTmpi8AEHd49Jdj
					</a>
				</p>
			</div>
		</div>
	</div>
</div>
