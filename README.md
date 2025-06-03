# UK Weather Analytics Dashboard

A comprehensive weather analytics platform built with SvelteKit and TypeScript that provides historical weather data and current conditions for any UK location. Analyse rainfall, temperature, wind patterns, and solar radiation with interactive charts and detailed insights.

## Features

### Core Weather Analytics

- **Multi-Parameter Analysis**: Comprehensive analysis of rainfall, temperature, wind, and solar radiation data
- **Postcode Lookup**: Enter any UK postcode to get location coordinates
- **Interactive Map**: Visual location display using Leaflet maps
- **Historical Data**: 10+ years of historical weather data across all parameters
- **Current Weather**: Real-time weather conditions including all meteorological parameters

### Rainfall Analysis

- **Precipitation Patterns**: Daily rainfall data with trend analysis
- **Drought Analysis**: Identify and analyse drought periods (7+ consecutive days with <1mm rainfall)
- **Yearly Comparisons**: Compare current year rainfall with historical averages
- **Statistical Analysis**: Rainfall percentiles and key statistics

### Temperature Analysis

- **Temperature Trends**: Daily min/max temperature analysis
- **Heat Waves & Cold Snaps**: Automatic detection of extreme temperature events
- **Seasonal Patterns**: Temperature comparison across years and months
- **Thermal Extremes**: Identification of record temperatures and significant events

### Wind Analysis

- **Wind Speed & Direction**: Comprehensive wind pattern analysis
- **Gust Tracking**: Peak wind gust identification and trends
- **Wind Rose Data**: Directional wind frequency analysis
- **Calm Period Detection**: Identification of low-wind periods

### Solar & Growing Analysis

- **Solar Radiation**: Daily solar radiation measurements and trends
- **Energy Potential**: Solar energy generation potential calculations
- **Growing Degree Days**: Agricultural insights based on temperature thresholds
- **Frost Risk Assessment**: Critical temperature monitoring for agriculture
- **Seasonal Solar Patterns**: Annual solar radiation cycle analysis

### Advanced Features

- **Interactive Charts**: Visual representation using Chart.js across all weather parameters
- **Data Caching**: Intelligent caching system for improved performance
- **Enhanced Statistics**: Cross-parameter correlations and insights
- **Mobile Responsive**: Optimised for all device sizes

## Data Sources

- **Postcode Lookup**: [postcodes.io](https://postcodes.io/) - Free UK postcode API
- **Weather Data**: [Open-Meteo](https://open-meteo.com/) - Free weather API with comprehensive meteorological data
- **Historical Archive**: Open-Meteo Archive API for 10+ years of historical weather data including:
  - Precipitation data (rainfall measurements)
  - Temperature data (daily min/max temperatures)
  - Wind data (speed, direction, and gusts)
  - Solar radiation data (global horizontal irradiance)
- **Current Conditions**: Real-time weather observations across all parameters

## Technology Stack

- **Frontend**: SvelteKit 2.x with TypeScript 5.x
- **Styling**: Tailwind CSS 4.x
- **Charts**: Chart.js with date-fns adapter for multi-parameter visualisation
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
2. Click "Analyse" to fetch comprehensive weather data
3. Explore the dashboard sections:
   - **Location Map**: Interactive map showing the selected location
   - **Current Conditions**: Real-time weather across all parameters
   - **Data View Toggle**: Switch between Rainfall, Temperature, Wind, and Solar analysis modes
   - **Key Statistics**: Summary metrics for the selected weather parameter
   - **Interactive Charts**: Visual patterns and trends
   - **Multi-Year Comparisons**: Historical analysis tables
   - **Weather Extremes**: Notable events (droughts, heat waves, strong winds, etc.)
   - **Enhanced Statistics**: Cross-parameter correlations and insights
   - **Growing Insights**: Agricultural and solar energy insights

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── RainfallChart.svelte      # Rainfall chart component
│   │   ├── TemperatureChart.svelte   # Temperature chart component
│   │   ├── WindChart.svelte          # Wind analysis charts
│   │   ├── SolarChart.svelte         # Solar radiation charts
│   │   ├── LocationMap.svelte        # Interactive map component
│   │   ├── FootNote.svelte           # Data source attribution
│   │   ├── panels/                   # Analytical dashboard panels
│   │   │   ├── CurrentWeatherPanel.svelte
│   │   │   ├── KeyStatisticsPanel.svelte
│   │   │   ├── YearlyComparisonPanel.svelte
│   │   │   ├── WeatherExtremesPanel.svelte
│   │   │   ├── EnhancedStatisticsPanel.svelte
│   │   │   └── GrowingInsightsPanel.svelte
│   │   └── RainfallDashboard.svelte  # Main dashboard
│   ├── services/
│   │   ├── weatherApi.ts             # API service layer
│   │   └── cacheService.ts           # Data caching service
│   ├── utils/
│   │   └── dataProcessing.ts         # Data analysis utilities
│   ├── types.ts                      # TypeScript interfaces
│   ├── seo.ts                        # SEO metadata
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
- **Purpose**: Historical daily weather data (up to 10+ years)
- **Parameters**:
  - `latitude`, `longitude`: Location coordinates
  - `start_date`, `end_date`: Date range
  - `daily`: `precipitation_sum,temperature_2m_mean,temperature_2m_min,temperature_2m_max,windspeed_10m_max,winddirection_10m_dominant,shortwave_radiation_sum`
  - `timezone`: `Europe/London`

### Current Weather

- **URL**: `https://api.open-meteo.com/v1/forecast`
- **Purpose**: Current weather conditions and forecasts
- **Parameters**:
  - `current`: `temperature_2m,relative_humidity_2m,precipitation,windspeed_10m,winddirection_10m`
  - `daily`: `precipitation_sum,temperature_2m_max,temperature_2m_min,windspeed_10m_max,shortwave_radiation_sum`

## Key Features Explained

### Multi-Parameter Analytics

- Comprehensive analysis across rainfall, temperature, wind, and solar data
- Cross-parameter correlations and insights
- Unified dashboard with seamless switching between analysis modes

### Interactive Mapping

- Uses Leaflet for displaying location markers
- Provides visual context for the selected postcode
- Responsive map interface with zoom controls

### Advanced Weather Analysis

- **Temperature Extremes**: Automatic detection of heat waves, cold snaps, and record temperatures
- **Wind Patterns**: Direction analysis, gust tracking, and calm period identification
- **Solar Energy**: Radiation measurements and energy potential calculations
- **Growing Insights**: Agricultural metrics including growing degree days and frost risk

### Enhanced Data Processing

- Intelligent caching system to reduce API calls
- Cross-parameter statistical analysis
- Seasonal and yearly trend identification
- Extreme weather event detection

### Drought & Extreme Event Analysis

- Identifies periods of 7+ consecutive days with <1mm rainfall
- Heat wave detection based on temperature thresholds
- Strong wind event identification
- Low solar radiation period analysis

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
2. **Additional Weather Parameters**: Add new data processing in `src/lib/utils/dataProcessing.ts`
3. **New Analysis Panels**: Create components in `src/lib/components/panels/`
4. **Enhanced APIs**: Add new services in `src/lib/services/`
5. **Cross-Parameter Analysis**: Extend correlation functions in data processing utilities

### Dependencies

#### Production Dependencies

- `chart.js` - Charting library for all weather parameter visualisations
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
- **Solar Data**: Dependent on Open-Meteo's solar radiation measurements

## Future Enhancements

- [ ] Add weather pattern correlations (e.g., rainfall vs temperature)
- [ ] Include seasonal weather summaries
- [ ] Add export functionality for all weather data
- [ ] Implement location favourites/bookmarks
- [ ] Add weather intensity classifications
- [ ] Include climate change trend analysis
- [ ] Add weather alerts and warnings integration
- [ ] Implement offline mode with service workers
- [ ] Add agricultural calendar integration
- [ ] Include renewable energy potential assessments

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Open-Meteo](https://open-meteo.com/) for providing comprehensive free weather data
- [postcodes.io](https://postcodes.io/) for UK postcode lookup service
- [Chart.js](https://www.chartjs.org/) for excellent multi-parameter charting capabilities
- [Leaflet](https://leafletjs.com/) for interactive mapping
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- [SvelteKit](https://kit.svelte.dev/) for the excellent framework
