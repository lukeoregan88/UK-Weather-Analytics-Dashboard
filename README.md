# UK Rainfall Analysis Dashboard

A comprehensive rainfall analysis tool built with SvelteKit and TypeScript that provides historical rainfall data and current weather conditions for any UK location.

## Features

- **Postcode Lookup**: Enter any UK postcode to get location coordinates
- **Interactive Map**: Visual location display using Leaflet maps
- **Historical Data**: 10 years of historical rainfall data
- **Current Weather**: Real-time weather conditions including temperature, humidity, and today's rainfall
- **Interactive Charts**: Visual representation of rainfall and temperature patterns using Chart.js
- **Yearly Comparisons**: Compare current year rainfall with historical averages
- **Drought Analysis**: Identify and analyse drought periods (7+ consecutive days with <1mm rainfall)
- **Statistical Analysis**: Rainfall percentiles and key statistics
- **Data Caching**: Intelligent caching system for improved performance

## Data Sources

- **Postcode Lookup**: [postcodes.io](https://postcodes.io/) - Free UK postcode API
- **Weather Data**: [Open-Meteo](https://open-meteo.com/) - Free weather API with historical data
- **Historical Archive**: Open-Meteo Archive API for 10+ years of historical data

## Technology Stack

- **Frontend**: SvelteKit 2.x with TypeScript 5.x
- **Styling**: Tailwind CSS 4.x
- **Charts**: Chart.js with date-fns adapter
- **Maps**: Leaflet with svelte-leafletjs
- **APIs**: RESTful APIs (no authentication required)
- **Testing**: Playwright for E2E testing

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd rainfall-app
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Usage

1. Enter a UK postcode (e.g., "SW1A 1AA", "M1 1AA", "EH1 1YZ")
2. Click "Analyse" to fetch weather data
3. Explore the dashboard sections:
   - **Location Map**: Interactive map showing the selected location
   - **Current Conditions**: Today's weather
   - **Key Statistics**: Summary metrics
   - **Charts**: Visual rainfall and temperature patterns
   - **10-Year Comparison**: Historical analysis table
   - **Drought Periods**: Notable dry spells

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── RainfallChart.svelte      # Rainfall chart component
│   │   ├── TemperatureChart.svelte   # Temperature chart component
│   │   ├── LocationMap.svelte        # Interactive map component
│   │   └── RainfallDashboard.svelte  # Main dashboard
│   ├── services/
│   │   ├── weatherApi.ts             # API service layer
│   │   └── cacheService.ts           # Data caching service
│   ├── utils/
│   │   └── dataProcessing.ts         # Data analysis utilities
│   ├── types.ts                      # TypeScript interfaces
│   └── index.ts                      # Library exports
├── routes/
│   ├── +page.svelte                  # Main page
│   └── +layout.svelte                # Layout component
├── app.html                          # HTML template
├── app.css                           # Global styles
└── app.d.ts                          # TypeScript declarations
```

## API Endpoints Used

### Postcode Lookup

- **URL**: `https://api.postcodes.io/postcodes/{postcode}`
- **Purpose**: Convert UK postcodes to latitude/longitude coordinates
- **Rate Limit**: 1000 requests per day (free tier)

### Historical Weather Data

- **URL**: `https://archive-api.open-meteo.com/v1/archive`
- **Purpose**: Historical daily rainfall data (up to 10+ years)
- **Parameters**:
  - `latitude`, `longitude`: Location coordinates
  - `start_date`, `end_date`: Date range
  - `daily`: `precipitation_sum,temperature_2m_mean,relative_humidity_2m`
  - `timezone`: `Europe/London`

### Current Weather

- **URL**: `https://api.open-meteo.com/v1/forecast`
- **Purpose**: Current weather conditions and today's forecast
- **Parameters**:
  - `current`: `temperature_2m,relative_humidity_2m,precipitation`
  - `daily`: `precipitation_sum`

## Key Features Explained

### Interactive Mapping

- Uses Leaflet for displaying location markers
- Provides visual context for the selected postcode
- Responsive map interface with zoom controls

### Data Caching

- Intelligent caching system to reduce API calls
- Improves performance and user experience
- Respects API rate limits

### Drought Analysis

- Identifies periods of 7+ consecutive days with <1mm rainfall
- Useful for understanding water stress periods
- Displays duration and date ranges of significant droughts

### Yearly Comparisons

- Compares each year's total rainfall against the 10-year average
- Shows percentage difference from average
- Includes wet days count (days with >0.1mm rainfall)

### Statistical Analysis

- Calculates rainfall percentiles (10th, 25th, 50th, 75th, 90th)
- Provides context for understanding "normal" vs "extreme" rainfall days
- Helps identify patterns and trends

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Run TypeScript checks
- `npm run check:watch` - Run TypeScript checks in watch mode
- `npm run lint` - Run ESLint and Prettier checks
- `npm run format` - Format code with Prettier
- `npm run test` - Run E2E tests
- `npm run test:e2e` - Run Playwright E2E tests

### Adding New Features

1. **New Chart Types**: Extend chart components in `src/lib/components/`
2. **Additional APIs**: Add new services in `src/lib/services/`
3. **Data Processing**: Extend utilities in `src/lib/utils/dataProcessing.ts`
4. **UI Components**: Create new components in `src/lib/components/`
5. **Caching**: Extend the cache service for new data types

### Dependencies

#### Production Dependencies

- `chart.js` - Charting library
- `chartjs-adapter-date-fns` - Date adapter for Chart.js
- `date-fns` - Date utility library
- `leaflet` - Interactive maps
- `svelte-leafletjs` - Svelte wrapper for Leaflet

#### Development Dependencies

- `@sveltejs/kit` - SvelteKit framework
- `tailwindcss` - Utility-first CSS framework
- `typescript` - TypeScript support
- `@playwright/test` - E2E testing framework
- `eslint` & `prettier` - Code linting and formatting

## Limitations

- **Geographic Scope**: UK postcodes only (due to postcodes.io API)
- **Historical Data**: Limited to Open-Meteo's archive (typically 10+ years)
- **API Rate Limits**: Free tier limitations may apply for heavy usage
- **Real-time Data**: Current weather updates every hour

## Future Enhancements

- [ ] Add monthly/seasonal rainfall patterns
- [ ] Include temperature correlation analysis
- [ ] Add export functionality for data
- [ ] Implement location favourites/bookmarks
- [ ] Add rainfall intensity classifications
- [ ] Include flood risk indicators
- [ ] Add mobile-responsive improvements
- [ ] Implement offline mode with service workers
- [ ] Add more detailed weather parameters
- [ ] Include weather alerts and warnings

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Open-Meteo](https://open-meteo.com/) for providing free weather data
- [postcodes.io](https://postcodes.io/) for UK postcode lookup service
- [Chart.js](https://www.chartjs.org/) for excellent charting capabilities
- [Leaflet](https://leafletjs.com/) for interactive mapping
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- [SvelteKit](https://kit.svelte.dev/) for the excellent framework
