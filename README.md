# Running Maps

Transform running into effortless urban exploration. Generate optimized running routes through the most interesting parts of any city in 60 seconds.

## Overview

Running Maps is a simple web tool that helps runners create interesting routes based on their preferences. Input your starting location and desired distance, get AI-curated suggestions for interesting places to visit (landmarks, parks, scenic spots), select which places appeal to you, and instantly receive a shareable Google Maps link with a complete running route.

### Key Features

- **Smart Place Suggestions**: AI-powered algorithm recommends landmarks, parks, and points of interest based on your location and distance
- **Optimized Routes**: Automatically calculates the most efficient order to visit your selected places
- **One-Click Navigation**: Generates a Google Maps URL ready to use for turn-by-turn navigation
- **No Login Required**: Friction-free experience - no account creation needed
- **Mobile-First Design**: Optimized for use while traveling
- **Customizable Preferences**: Filter for parks, avoid hills, include water stops, or explore urban architecture

### Target Users

- Travelers exploring new cities who want to run and sightsee simultaneously
- Local runners looking to discover new areas of their city
- Anyone who wants variety in their running routes

## Setup

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Google Cloud Platform account with billing enabled
- Vercel account (for deployment)

### Google Cloud Setup

1. **Create a Google Cloud Project**
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Create new project: "running-maps"
   - Enable billing (required even for free tier)

2. **Enable Required APIs**
   - Maps JavaScript API (for frontend map display)
   - Places API (for finding points of interest)
   - Directions API (for route generation)

3. **Create API Keys**

   **Client-side key** (for Maps JavaScript API):
   - Create an API key in Google Cloud Console
   - Restrict to HTTP referrers: `*.vercel.app/*`, `yourdomain.com/*`
   - Only enable Maps JavaScript API

   **Server-side key** (for Places & Directions):
   - Create a second API key
   - No referrer restrictions (used in backend)
   - Enable Places API and Directions API

4. **Set Quotas (Cost Control)**
   - Places API: 1,000 requests/day (enough for ~500 users)
   - Directions API: 1,000 requests/day
   - Set billing alerts at $10, $25, $50

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd running-maps
   ```

2. **Install dependencies**
   ```bash
   npm install
   pip install -r requirements.txt
   ```

3. **Configure environment variables**

   Copy `.env.example` to `.env` and fill in your API keys:
   ```bash
   cp .env.example .env
   ```

   Edit `.env`:
   ```env
   # Client-side key (exposed to browser)
   VITE_GOOGLE_MAPS_API_KEY=your_client_side_api_key_here

   # Server-side keys (kept secure)
   GOOGLE_PLACES_API_KEY=your_server_side_api_key_here
   GOOGLE_DIRECTIONS_API_KEY=your_server_side_api_key_here
   ```

## Development

### Running Locally

```bash
# Option 1: Using Vercel CLI (recommended - runs serverless functions)
npm i -g vercel
vercel dev

# Option 2: Using Vite only (frontend only)
npm run dev
```

Access the application at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Deployment

### Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Framework preset: Vite
   - Root directory: `.`

3. **Add Environment Variables**

   In the Vercel dashboard, go to Settings → Environment Variables and add:
   - `VITE_GOOGLE_MAPS_API_KEY` (client-side key)
   - `GOOGLE_PLACES_API_KEY` (server-side key)
   - `GOOGLE_DIRECTIONS_API_KEY` (server-side key)

4. **Deploy**
   - Vercel automatically deploys on every push to main
   - Preview deployments are created for pull requests
   - Your app will be available at `your-project.vercel.app`

### Custom Domain

To use a custom domain:
1. Go to Vercel dashboard → Settings → Domains
2. Add your domain
3. Update DNS records as instructed
4. Update API key restrictions in Google Cloud Console to include your domain

## Tech Stack

### Frontend
- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Google Maps JavaScript API** - Interactive map display
- **Vanilla JS** - No heavy framework, keeps bundle size small (~50kb)

### Backend
- **Python 3.11** - Serverless functions
- **Vercel Serverless Functions** - Auto-scaling backend
- **Google Places API** - Finding points of interest
- **Google Directions API** - Route optimization

### Hosting & Infrastructure
- **Vercel** - Hosting, serverless functions, auto-deployment
- **GitHub** - Source control and CI/CD trigger

## Project Structure

```
running-maps/
├── api/                          # Python serverless functions
│   ├── suggest-places.py        # Finds and ranks POIs
│   └── generate-route.py        # Creates optimized route
├── src/                          # Frontend source code
│   ├── main.ts                  # Application entry point
│   ├── map.ts                   # Google Maps integration
│   ├── api.ts                   # API client
│   ├── types.ts                 # TypeScript type definitions
│   └── styles.css               # Global styles
├── public/                       # Static assets
├── dist/                         # Built files (generated)
├── index.html                    # HTML entry point
├── package.json                  # Node.js dependencies
├── requirements.txt              # Python dependencies
├── vercel.json                   # Vercel configuration
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── vite.config.ts               # Vite build configuration
└── .env.example                 # Environment variable template
```

## API Documentation

### POST /api/suggest-places

Finds and ranks points of interest near a location.

**Request Body:**
```json
{
  "lat": 40.7589,
  "lng": -73.9851,
  "distance_miles": 5,
  "preferences": {
    "prefer_parks": true,
    "avoid_hills": false,
    "water_stops": true,
    "urban_explorer": false
  }
}
```

**Parameters:**
- `lat` (number, required): Latitude of starting location
- `lng` (number, required): Longitude of starting location
- `distance_miles` (number, required): Desired running distance in miles
- `preferences` (object, optional): User preferences for route customization
  - `prefer_parks` (boolean): Weight parks and natural features higher
  - `avoid_hills` (boolean): Avoid hilly routes (not yet implemented)
  - `water_stops` (boolean): Include cafes and restaurants as waypoints
  - `urban_explorer` (boolean): Prefer architecture and street art

**Response:**
```json
{
  "places": [
    {
      "id": "ChIJOwg_06VPwokRYv534QaPC8g",
      "name": "Central Park",
      "types": ["park", "tourist_attraction", "point_of_interest"],
      "location": {
        "lat": 40.7829,
        "lng": -73.9654
      },
      "rating": 4.8,
      "user_ratings_total": 175432,
      "photo_url": "https://maps.googleapis.com/maps/api/place/photo?...",
      "distance_from_start": 0.3,
      "score": 24.5
    }
  ],
  "preselected": ["ChIJOwg_06VPwokRYv534QaPC8g", "ChIJ..."]
}
```

**Response Fields:**
- `places` (array): List of up to 15 suggested places, ordered by score
- `preselected` (array): Place IDs that should be selected by default (3-5 places)

**Status Codes:**
- `200`: Success
- `400`: Invalid request parameters
- `500`: Server error (e.g., API key not configured)

**Algorithm:**
The endpoint searches for places within a radius of 50% of the running distance, queries multiple place types (landmarks, parks, museums, etc.), deduplicates results, and scores each place based on:
- Google rating and popularity (user_ratings_total)
- Place type bonuses (landmarks weighted higher than cafes)
- User preferences (parks boosted if prefer_parks is true)
- Distance from start (closer places weighted slightly higher)

### POST /api/generate-route

Generates an optimized running route through selected places.

**Request Body:**
```json
{
  "start": {
    "lat": 40.7589,
    "lng": -73.9851,
    "name": "Times Square"
  },
  "selected_places": [
    {
      "id": "ChIJOwg_06VPwokRYv534QaPC8g",
      "name": "Central Park",
      "lat": 40.7829,
      "lng": -73.9654
    },
    {
      "id": "ChIJKxDbe_lYwokRVf__s8CPn-o",
      "name": "The Metropolitan Museum of Art",
      "lat": 40.7794,
      "lng": -73.9632
    }
  ],
  "preferences": {
    "avoid_hills": false
  }
}
```

**Parameters:**
- `start` (object, required): Starting location
  - `lat` (number): Latitude
  - `lng` (number): Longitude
  - `name` (string, optional): Location name
- `selected_places` (array, required): Places to visit (minimum 1)
  - `id` (string): Place ID
  - `name` (string): Place name
  - `lat` (number): Latitude
  - `lng` (number): Longitude
- `preferences` (object, optional): Route preferences
  - `avoid_hills` (boolean): Avoid hilly routes (not yet implemented)

**Response:**
```json
{
  "distance_miles": 5.2,
  "distance_km": 8.4,
  "duration_minutes": 78,
  "optimized_order": [
    {
      "id": "ChIJOwg_06VPwokRYv534QaPC8g",
      "name": "Central Park",
      "lat": 40.7829,
      "lng": -73.9654
    },
    {
      "id": "ChIJKxDbe_lYwokRVf__s8CPn-o",
      "name": "The Metropolitan Museum of Art",
      "lat": 40.7794,
      "lng": -73.9632
    }
  ],
  "google_maps_url": "https://www.google.com/maps/dir/?api=1&origin=40.7589,-73.9851&destination=40.7589,-73.9851&waypoints=40.7829,-73.9654|40.7794,-73.9632&travelmode=walking",
  "estimated_time_minutes": 78
}
```

**Response Fields:**
- `distance_miles` (number): Total route distance in miles
- `distance_km` (number): Total route distance in kilometers
- `duration_minutes` (number): Estimated time based on Google Directions API
- `optimized_order` (array): Places in optimized visiting order
- `google_maps_url` (string): Direct link to open route in Google Maps
- `estimated_time_minutes` (number): Estimated completion time (assumes 15 min/mile pace)

**Status Codes:**
- `200`: Success
- `400`: Invalid request (missing start or places)
- `500`: Server error (e.g., API key not configured, Google API failure)

**Special Cases:**
- **Single place**: Creates an out-and-back route (start → place → start)
- **Multiple places**: Creates a loop route with waypoints optimized by Google Directions API

## Cost Estimates

### Free Tier Usage
- Vercel hosting: Free (Hobby tier)
- Google Cloud Platform: $200/month free credit

### API Costs (after free tier)
- Google Places API: ~$17 per 1,000 requests
- Google Directions API: ~$5 per 1,000 requests
- Typical user session: 1 places search + 1 route generation = ~$0.022

### Estimated Monthly Costs
- 500 users/month: ~$10
- 1,000 users/month: ~$22
- 5,000 users/month: ~$110

### Cost Controls
- Set daily quotas in Google Cloud Console
- Configure billing alerts at $10, $25, $50
- Monitor usage in Vercel Analytics dashboard

## Analytics

The app uses Vercel Analytics for privacy-friendly, GDPR-compliant tracking:

### Automatic Metrics
- Page views and unique visitors
- Geographic distribution
- Device types (mobile vs desktop)
- Web vitals (performance)

### Custom Events
- `places_searched`: When user searches for places
- `places_displayed`: When suggestions are shown
- `route_generated`: When route is created
- `maps_opened`: When user opens Google Maps
- `error_occurred`: When errors happen

## Contributing

This is a prototype project for concept validation. Contributions welcome after initial validation phase.

## License

MIT License - See LICENSE file for details

## Support

For issues or questions, please open an issue on GitHub.

---

Built with TypeScript, Python, and Google Maps APIs. Deployed on Vercel.
