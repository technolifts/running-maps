# Running Maps - Initial Prototype Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a working prototype that generates running routes with interesting waypoints and outputs a Google Maps URL.

**Architecture:** Vite + TypeScript frontend, Python serverless functions on Vercel, Google APIs for places/directions/maps.

**Tech Stack:** Vite, TypeScript, Tailwind CSS, Python 3.11, Google Maps APIs, Vercel

---

## Task 1: Project Setup - Package Configuration

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`

**Step 1: Create package.json**

```json
{
  "name": "running-maps",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@googlemaps/js-api-loader": "^1.16.6"
  },
  "devDependencies": {
    "@types/google.maps": "^3.55.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.3",
    "vite": "^5.0.11"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

**Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000
  }
})
```

**Step 4: Install dependencies**

Run: `npm install`
Expected: Dependencies installed successfully

**Step 5: Commit**

```bash
git add package.json tsconfig.json vite.config.ts
git commit -m "feat: add project configuration files"
```

---

## Task 2: Project Setup - Tailwind Configuration

**Files:**
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `src/styles.css`

**Step 1: Create tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Step 2: Create postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Step 3: Create src/styles.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 text-gray-900;
  }
}

@layer components {
  .btn-primary {
    @apply bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed;
  }

  .btn-secondary {
    @apply bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors;
  }

  .input-field {
    @apply w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent;
  }
}
```

**Step 4: Commit**

```bash
git add tailwind.config.js postcss.config.js src/styles.css
git commit -m "feat: configure Tailwind CSS"
```

---

## Task 3: Project Setup - HTML Entry Point

**Files:**
- Create: `index.html`

**Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Running Maps - Plan Your Perfect Run</title>
  <meta name="description" content="Generate optimized running routes through interesting places in any city">
</head>
<body>
  <div id="app">
    <!-- Hero Section -->
    <header class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 py-6">
        <h1 class="text-3xl font-bold text-gray-900">Running Maps</h1>
        <p class="text-gray-600 mt-1">Plan your perfect running route</p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Input Form -->
      <div id="input-section" class="bg-white rounded-lg shadow-md p-6 mb-8">
        <div class="space-y-4">
          <!-- Location Input -->
          <div>
            <label for="location-input" class="block text-sm font-medium text-gray-700 mb-2">
              Starting Location
            </label>
            <input
              type="text"
              id="location-input"
              class="input-field"
              placeholder="Enter a city or address"
            />
          </div>

          <!-- Distance Input -->
          <div>
            <label for="distance-input" class="block text-sm font-medium text-gray-700 mb-2">
              Distance
            </label>
            <div class="flex gap-2">
              <select id="distance-select" class="input-field flex-1">
                <option value="1">1 mile</option>
                <option value="2">2 miles</option>
                <option value="3">3 miles</option>
                <option value="5" selected>5 miles</option>
                <option value="7">7 miles</option>
                <option value="10">10 miles</option>
                <option value="13">13 miles</option>
                <option value="custom">Custom...</option>
              </select>
              <input
                type="number"
                id="distance-custom"
                class="input-field w-24 hidden"
                placeholder="Miles"
                min="0.5"
                max="50"
                step="0.1"
              />
            </div>
          </div>

          <!-- Preferences (Collapsible) -->
          <details class="border border-gray-200 rounded-lg">
            <summary class="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50">
              Customize preferences
            </summary>
            <div class="px-4 pb-4 pt-2 space-y-3">
              <label class="flex items-center gap-2">
                <input type="checkbox" id="pref-parks" class="rounded text-blue-600">
                <span class="text-sm text-gray-700">Prefer parks and nature</span>
              </label>
              <label class="flex items-center gap-2">
                <input type="checkbox" id="pref-water" class="rounded text-blue-600">
                <span class="text-sm text-gray-700">Include water stops</span>
              </label>
              <label class="flex items-center gap-2">
                <input type="checkbox" id="pref-urban" class="rounded text-blue-600">
                <span class="text-sm text-gray-700">Urban explorer (architecture, street art)</span>
              </label>
            </div>
          </details>

          <!-- Submit Button -->
          <button id="find-places-btn" class="btn-primary w-full" disabled>
            Find Places
          </button>
        </div>
      </div>

      <!-- Map Container -->
      <div id="map-section" class="hidden">
        <div id="map" class="w-full h-96 rounded-lg shadow-md mb-4"></div>

        <!-- Places List -->
        <div id="places-section" class="bg-white rounded-lg shadow-md p-6 mb-4">
          <h2 class="text-xl font-semibold mb-4">Select Places to Visit</h2>
          <p class="text-sm text-gray-600 mb-4">
            <span id="selection-count">3 places selected</span> -
            <span id="estimated-distance">~5.0 miles</span>
          </p>
          <div id="places-list" class="space-y-3"></div>
          <button id="generate-route-btn" class="btn-primary w-full mt-6">
            Generate Route
          </button>
        </div>
      </div>

      <!-- Route Output -->
      <div id="route-section" class="hidden bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold mb-4">Your Route is Ready!</h2>
        <div id="route-summary" class="mb-4"></div>
        <div class="flex gap-3">
          <a id="open-maps-btn" href="#" target="_blank" class="btn-primary flex-1 text-center">
            Open in Google Maps
          </a>
          <button id="copy-link-btn" class="btn-secondary">
            Copy Link
          </button>
          <button id="share-btn" class="btn-secondary">
            Share
          </button>
        </div>
        <button id="start-over-btn" class="btn-secondary w-full mt-4">
          Start Over
        </button>
      </div>

      <!-- Loading State -->
      <div id="loading" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div class="bg-white rounded-lg p-6">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p class="mt-4 text-gray-700">Loading...</p>
        </div>
      </div>

      <!-- Error Message -->
      <div id="error-message" class="hidden bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
        <p id="error-text"></p>
      </div>
    </main>
  </div>

  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

**Step 2: Test dev server**

Run: `npm run dev`
Expected: Server starts on localhost:3000, page displays with Tailwind styles

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add HTML structure and UI layout"
```

---

## Task 4: Backend Setup - Python Requirements

**Files:**
- Create: `requirements.txt`
- Create: `vercel.json`

**Step 1: Create requirements.txt**

```
googlemaps==4.10.0
```

**Step 2: Create vercel.json**

```json
{
  "functions": {
    "api/**/*.py": {
      "runtime": "python3.11"
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type" }
      ]
    }
  ]
}
```

**Step 3: Commit**

```bash
git add requirements.txt vercel.json
git commit -m "feat: add Python requirements and Vercel config"
```

---

## Task 5: Backend - Suggest Places API

**Files:**
- Create: `api/suggest-places.py`

**Step 1: Create api/suggest-places.py**

```python
import os
import json
import math
from http.server import BaseHTTPRequestHandler
import googlemaps

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Parse request body
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            lat = data.get('lat')
            lng = data.get('lng')
            distance_miles = data.get('distance_miles', 5)
            preferences = data.get('preferences', {})

            if lat is None or lng is None:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Missing lat/lng'}).encode())
                return

            # Initialize Google Maps client
            api_key = os.environ.get('GOOGLE_PLACES_API_KEY')
            if not api_key:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'API key not configured'}).encode())
                return

            gmaps = googlemaps.Client(key=api_key)

            # Calculate search radius (50% of run distance)
            radius_meters = int(distance_miles * 0.5 * 1609.34)

            # Query different place types
            place_types = [
                ['tourist_attraction', 'museum', 'park', 'landmark'],
                ['point_of_interest', 'natural_feature'],
            ]

            if preferences.get('water_stops'):
                place_types.append(['cafe', 'restaurant'])

            all_places = []
            seen_ids = set()

            for types in place_types:
                for place_type in types:
                    try:
                        results = gmaps.places_nearby(
                            location=(lat, lng),
                            radius=radius_meters,
                            type=place_type
                        ).get('results', [])

                        for place in results:
                            place_id = place.get('place_id')
                            if place_id and place_id not in seen_ids:
                                seen_ids.add(place_id)
                                all_places.append(place)
                    except Exception as e:
                        # Log error but continue with other types
                        print(f"Error querying {place_type}: {e}")

            # Score and rank places
            scored_places = []
            for place in all_places:
                score = calculate_score(place, preferences, lat, lng, radius_meters)
                scored_places.append((score, place))

            # Sort by score and take top 15
            scored_places.sort(reverse=True, key=lambda x: x[0])
            top_places = scored_places[:15]

            # Format response
            response_places = []
            for score, place in top_places:
                location = place.get('geometry', {}).get('location', {})
                photos = place.get('photos', [])
                photo_url = None
                if photos and api_key:
                    photo_ref = photos[0].get('photo_reference')
                    if photo_ref:
                        photo_url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference={photo_ref}&key={api_key}"

                response_places.append({
                    'id': place.get('place_id'),
                    'name': place.get('name'),
                    'types': place.get('types', []),
                    'location': {
                        'lat': location.get('lat'),
                        'lng': location.get('lng')
                    },
                    'rating': place.get('rating'),
                    'photo_url': photo_url,
                    'distance_from_start': calculate_distance(lat, lng, location.get('lat'), location.get('lng'))
                })

            # Send response
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'places': response_places}).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

def calculate_score(place, preferences, start_lat, start_lng, max_radius):
    """Calculate score for a place based on type and preferences"""
    rating = place.get('rating', 3.0)
    user_ratings_total = place.get('user_ratings_total', 1)
    types = place.get('types', [])

    # Base score from rating and popularity
    score = rating * (1 + math.log10(max(user_ratings_total, 1)) / 10)

    # Type bonuses
    if any(t in types for t in ['tourist_attraction', 'landmark', 'monument']):
        score *= 3.0
    if 'park' in types:
        score *= 1.2
    if any(t in types for t in ['natural_feature', 'scenic_point']):
        score *= 1.2
    if any(t in types for t in ['cafe', 'restaurant']):
        score *= 0.5

    # Apply user preferences
    if preferences.get('prefer_parks') and 'park' in types:
        score *= 1.5
    if preferences.get('urban_explorer') and any(t in types for t in ['museum', 'art_gallery', 'historical']):
        score *= 1.5

    # Distance penalty (prefer closer to start)
    location = place.get('geometry', {}).get('location', {})
    distance = calculate_distance(start_lat, start_lng, location.get('lat'), location.get('lng'))
    distance_meters = distance * 1609.34
    if max_radius > 0:
        distance_factor = 1 - (distance_meters / max_radius) * 0.3
        score *= max(distance_factor, 0.5)

    return score

def calculate_distance(lat1, lng1, lat2, lng2):
    """Calculate distance in miles between two coordinates"""
    if lat2 is None or lng2 is None:
        return 0

    # Haversine formula
    R = 3959  # Earth radius in miles
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)

    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    return R * c
```

**Step 2: Commit**

```bash
git add api/suggest-places.py
git commit -m "feat: implement suggest places API endpoint"
```

---

## Task 6: Backend - Generate Route API

**Files:**
- Create: `api/generate-route.py`

**Step 1: Create api/generate-route.py**

```python
import os
import json
from http.server import BaseHTTPRequestHandler
import googlemaps

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Parse request body
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            start = data.get('start')
            selected_places = data.get('selected_places', [])
            preferences = data.get('preferences', {})

            if not start or not selected_places:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Missing start or selected_places'}).encode())
                return

            # Initialize Google Maps client
            api_key = os.environ.get('GOOGLE_DIRECTIONS_API_KEY')
            if not api_key:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'API key not configured'}).encode())
                return

            gmaps = googlemaps.Client(key=api_key)

            # Build origin and destination (loop back to start)
            origin = f"{start['lat']},{start['lng']}"
            destination = origin

            # Build waypoints
            waypoints = []
            for place in selected_places:
                waypoints.append(f"{place['lat']},{place['lng']}")

            # Handle single place (out-and-back)
            if len(selected_places) == 1:
                # For out-and-back, just go to the place and return
                waypoints = []
                destination = f"{selected_places[0]['lat']},{selected_places[0]['lng']}"

            # Call Google Directions API
            directions_result = gmaps.directions(
                origin=origin,
                destination=destination,
                waypoints=waypoints if waypoints else None,
                optimize_waypoints=True if len(waypoints) > 1 else False,
                mode='walking',
                avoid='highways',
                units='imperial'
            )

            if not directions_result:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'No route found'}).encode())
                return

            route = directions_result[0]

            # Calculate total distance
            total_distance_meters = sum(
                leg['distance']['value'] for leg in route['legs']
            )
            distance_miles = round(total_distance_meters / 1609.34, 1)

            # Get optimized waypoint order
            waypoint_order = route.get('waypoint_order', list(range(len(selected_places))))

            # Build ordered places list
            if len(selected_places) == 1:
                ordered_places = selected_places
            else:
                ordered_places = [selected_places[i] for i in waypoint_order]

            # Build Google Maps URL
            if len(selected_places) == 1:
                # Out-and-back route
                maps_url = (
                    f"https://www.google.com/maps/dir/"
                    f"?api=1"
                    f"&origin={origin}"
                    f"&destination={origin}"
                    f"&waypoints={destination}"
                    f"&travelmode=walking"
                )
            else:
                # Loop route
                waypoint_str = '|'.join([f"{p['lat']},{p['lng']}" for p in ordered_places])
                maps_url = (
                    f"https://www.google.com/maps/dir/"
                    f"?api=1"
                    f"&origin={origin}"
                    f"&destination={origin}"
                    f"&waypoints={waypoint_str}"
                    f"&travelmode=walking"
                )

            # Calculate estimated time (15 min/mile)
            estimated_time_minutes = int(distance_miles * 15)

            # Build response
            response = {
                'distance_miles': distance_miles,
                'optimized_order': ordered_places,
                'google_maps_url': maps_url,
                'estimated_time_minutes': estimated_time_minutes
            }

            # Send response
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())
```

**Step 2: Commit**

```bash
git add api/generate-route.py
git commit -m "feat: implement generate route API endpoint"
```

---

## Task 7: Frontend - TypeScript Types

**Files:**
- Create: `src/types.ts`

**Step 1: Create src/types.ts**

```typescript
export interface Location {
  lat: number;
  lng: number;
}

export interface Place {
  id: string;
  name: string;
  types: string[];
  location: Location;
  rating?: number;
  photo_url?: string;
  distance_from_start: number;
}

export interface Preferences {
  prefer_parks?: boolean;
  avoid_hills?: boolean;
  water_stops?: boolean;
  urban_explorer?: boolean;
}

export interface SuggestPlacesRequest {
  lat: number;
  lng: number;
  distance_miles: number;
  preferences: Preferences;
}

export interface SuggestPlacesResponse {
  places: Place[];
}

export interface RouteRequest {
  start: Location;
  selected_places: Array<{
    lat: number;
    lng: number;
    name: string;
  }>;
  preferences: Preferences;
}

export interface RouteResponse {
  distance_miles: number;
  optimized_order: Array<{
    lat: number;
    lng: number;
    name: string;
  }>;
  google_maps_url: string;
  estimated_time_minutes: number;
}

export interface AppState {
  location: Location | null;
  distance: number;
  preferences: Preferences;
  suggestedPlaces: Place[];
  selectedPlaceIds: Set<string>;
  generatedRoute: RouteResponse | null;
}
```

**Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add TypeScript type definitions"
```

---

## Task 8: Frontend - API Client

**Files:**
- Create: `src/api.ts`

**Step 1: Create src/api.ts**

```typescript
import type {
  SuggestPlacesRequest,
  SuggestPlacesResponse,
  RouteRequest,
  RouteResponse
} from './types';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : '';

export async function suggestPlaces(
  params: SuggestPlacesRequest
): Promise<SuggestPlacesResponse> {
  const response = await fetch(`${API_BASE}/api/suggest-places`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to fetch places');
  }

  return response.json();
}

export async function generateRoute(
  params: RouteRequest
): Promise<RouteResponse> {
  const response = await fetch(`${API_BASE}/api/generate-route`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to generate route');
  }

  return response.json();
}
```

**Step 2: Commit**

```bash
git add src/api.ts
git commit -m "feat: add API client functions"
```

---

## Task 9: Frontend - Google Maps Integration

**Files:**
- Create: `src/map.ts`

**Step 1: Create src/map.ts**

```typescript
import { Loader } from '@googlemaps/js-api-loader';
import type { Place, Location } from './types';

export class RouteMap {
  private map: google.maps.Map | null = null;
  private markers: google.maps.Marker[] = [];
  private directionsRenderer: google.maps.DirectionsRenderer | null = null;
  private loader: Loader;

  constructor(apiKey: string) {
    this.loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places'],
    });
  }

  async init(elementId: string, center: Location): Promise<void> {
    await this.loader.load();

    const mapElement = document.getElementById(elementId);
    if (!mapElement) {
      throw new Error(`Map element #${elementId} not found`);
    }

    this.map = new google.maps.Map(mapElement, {
      center: { lat: center.lat, lng: center.lng },
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
  }

  clearMarkers(): void {
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];
  }

  showPlaces(
    places: Place[],
    preselectedIds: string[],
    onMarkerClick: (placeId: string) => void
  ): void {
    this.clearMarkers();

    if (!this.map) return;

    const bounds = new google.maps.LatLngBounds();

    places.forEach(place => {
      const marker = new google.maps.Marker({
        position: { lat: place.location.lat, lng: place.location.lng },
        map: this.map!,
        title: place.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: preselectedIds.includes(place.id) ? '#2563eb' : '#9ca3af',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        onMarkerClick(place.id);
      });

      this.markers.push(marker);
      bounds.extend({ lat: place.location.lat, lng: place.location.lng });
    });

    if (places.length > 0) {
      this.map.fitBounds(bounds);
    }
  }

  updateMarkerStyle(placeId: string, selected: boolean): void {
    const marker = this.markers.find(m => m.getTitle() === placeId);
    if (marker) {
      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: selected ? '#2563eb' : '#9ca3af',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      });
    }
  }

  async showRoute(origin: Location, waypoints: Location[]): Promise<void> {
    if (!this.map) return;

    this.clearMarkers();

    if (!this.directionsRenderer) {
      this.directionsRenderer = new google.maps.DirectionsRenderer({
        map: this.map,
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#2563eb',
          strokeWeight: 4,
        },
      });
    }

    const directionsService = new google.maps.DirectionsService();

    const waypointObjects = waypoints.map(wp => ({
      location: { lat: wp.lat, lng: wp.lng },
      stopover: true,
    }));

    const request: google.maps.DirectionsRequest = {
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: origin.lat, lng: origin.lng },
      waypoints: waypointObjects,
      optimizeWaypoints: false, // Already optimized by backend
      travelMode: google.maps.TravelMode.WALKING,
    };

    const result = await directionsService.route(request);
    this.directionsRenderer.setDirections(result);
  }

  getAutocomplete(inputElement: HTMLInputElement): google.maps.places.Autocomplete {
    return new google.maps.places.Autocomplete(inputElement, {
      types: ['geocode'],
    });
  }
}
```

**Step 2: Commit**

```bash
git add src/map.ts
git commit -m "feat: add Google Maps integration class"
```

---

## Task 10: Frontend - Main Application Logic

**Files:**
- Create: `src/main.ts`

**Step 1: Create src/main.ts (Part 1: Setup and State)**

```typescript
import './styles.css';
import { RouteMap } from './map';
import { suggestPlaces, generateRoute } from './api';
import type { AppState, Place, Location, Preferences } from './types';

// Initialize state
const state: AppState = {
  location: null,
  distance: 5,
  preferences: {},
  suggestedPlaces: [],
  selectedPlaceIds: new Set(),
  generatedRoute: null,
};

// Get API key from environment
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Initialize map
const routeMap = new RouteMap(GOOGLE_MAPS_API_KEY);

// DOM Elements
const locationInput = document.getElementById('location-input') as HTMLInputElement;
const distanceSelect = document.getElementById('distance-select') as HTMLSelectElement;
const distanceCustom = document.getElementById('distance-custom') as HTMLInputElement;
const prefParks = document.getElementById('pref-parks') as HTMLInputElement;
const prefWater = document.getElementById('pref-water') as HTMLInputElement;
const prefUrban = document.getElementById('pref-urban') as HTMLInputElement;
const findPlacesBtn = document.getElementById('find-places-btn') as HTMLButtonElement;
const mapSection = document.getElementById('map-section') as HTMLDivElement;
const placesSection = document.getElementById('places-section') as HTMLDivElement;
const placesList = document.getElementById('places-list') as HTMLDivElement;
const selectionCount = document.getElementById('selection-count') as HTMLSpanElement;
const estimatedDistance = document.getElementById('estimated-distance') as HTMLSpanElement;
const generateRouteBtn = document.getElementById('generate-route-btn') as HTMLButtonElement;
const routeSection = document.getElementById('route-section') as HTMLDivElement;
const routeSummary = document.getElementById('route-summary') as HTMLDivElement;
const openMapsBtn = document.getElementById('open-maps-btn') as HTMLAnchorElement;
const copyLinkBtn = document.getElementById('copy-link-btn') as HTMLButtonElement;
const shareBtn = document.getElementById('share-btn') as HTMLButtonElement;
const startOverBtn = document.getElementById('start-over-btn') as HTMLButtonElement;
const loading = document.getElementById('loading') as HTMLDivElement;
const errorMessage = document.getElementById('error-message') as HTMLDivElement;
const errorText = document.getElementById('error-text') as HTMLParagraphElement;

// Helper functions
function showLoading(): void {
  loading.classList.remove('hidden');
}

function hideLoading(): void {
  loading.classList.add('hidden');
}

function showError(message: string): void {
  errorText.textContent = message;
  errorMessage.classList.remove('hidden');
  setTimeout(() => {
    errorMessage.classList.add('hidden');
  }, 5000);
}

function getPreferences(): Preferences {
  return {
    prefer_parks: prefParks.checked,
    water_stops: prefWater.checked,
    urban_explorer: prefUrban.checked,
  };
}

function getCurrentDistance(): number {
  if (distanceSelect.value === 'custom') {
    return parseFloat(distanceCustom.value) || 5;
  }
  return parseFloat(distanceSelect.value);
}
```

**Step 2: Create src/main.ts (Part 2: Event Handlers)**

```typescript
// Continue in src/main.ts

// Setup autocomplete
let autocomplete: google.maps.places.Autocomplete;

async function initAutocomplete(): Promise<void> {
  try {
    await routeMap.init('map', { lat: 40.7829, lng: -73.9654 });
    autocomplete = routeMap.getAutocomplete(locationInput);

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        state.location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        findPlacesBtn.disabled = false;
      }
    });
  } catch (error) {
    showError('Failed to initialize map. Please check your API key.');
    console.error(error);
  }
}

// Distance select handler
distanceSelect.addEventListener('change', () => {
  if (distanceSelect.value === 'custom') {
    distanceCustom.classList.remove('hidden');
  } else {
    distanceCustom.classList.add('hidden');
    state.distance = parseFloat(distanceSelect.value);
  }
});

distanceCustom.addEventListener('input', () => {
  state.distance = parseFloat(distanceCustom.value) || 5;
});

// Find places handler
findPlacesBtn.addEventListener('click', async () => {
  if (!state.location) {
    showError('Please select a location');
    return;
  }

  showLoading();

  try {
    const preferences = getPreferences();
    const distance = getCurrentDistance();

    const response = await suggestPlaces({
      lat: state.location.lat,
      lng: state.location.lng,
      distance_miles: distance,
      preferences,
    });

    state.suggestedPlaces = response.places;
    state.preferences = preferences;
    state.distance = distance;

    // Pre-select top 3-5 places based on distance
    const numToPreselect = Math.min(
      distance <= 3 ? 3 : distance <= 7 ? 4 : 5,
      response.places.length
    );
    state.selectedPlaceIds = new Set(
      response.places.slice(0, numToPreselect).map(p => p.id)
    );

    displayPlaces();
    mapSection.classList.remove('hidden');
    routeSection.classList.add('hidden');

  } catch (error) {
    showError(error instanceof Error ? error.message : 'Failed to fetch places');
  } finally {
    hideLoading();
  }
});

// Display places on map and in list
function displayPlaces(): void {
  if (!state.location) return;

  routeMap.showPlaces(
    state.suggestedPlaces,
    Array.from(state.selectedPlaceIds),
    togglePlaceSelection
  );

  placesList.innerHTML = '';
  state.suggestedPlaces.forEach(place => {
    const isSelected = state.selectedPlaceIds.has(place.id);
    const placeCard = createPlaceCard(place, isSelected);
    placesList.appendChild(placeCard);
  });

  updateSelectionInfo();
}

function createPlaceCard(place: Place, selected: boolean): HTMLElement {
  const card = document.createElement('label');
  card.className = 'flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50';

  const typeLabel = place.types[0]?.replace(/_/g, ' ') || 'place';

  card.innerHTML = `
    <input
      type="checkbox"
      ${selected ? 'checked' : ''}
      data-place-id="${place.id}"
      class="mt-1 rounded text-blue-600"
    />
    <div class="flex-1">
      <div class="font-medium text-gray-900">${place.name}</div>
      <div class="text-sm text-gray-600 capitalize">${typeLabel}</div>
      <div class="text-sm text-gray-500">${place.distance_from_start.toFixed(1)} miles away</div>
      ${place.rating ? `<div class="text-sm text-gray-600">★ ${place.rating}</div>` : ''}
    </div>
    ${place.photo_url ? `<img src="${place.photo_url}" alt="${place.name}" class="w-16 h-16 rounded object-cover" />` : ''}
  `;

  const checkbox = card.querySelector('input') as HTMLInputElement;
  checkbox.addEventListener('change', () => {
    togglePlaceSelection(place.id);
  });

  return card;
}

function togglePlaceSelection(placeId: string): void {
  if (state.selectedPlaceIds.has(placeId)) {
    state.selectedPlaceIds.delete(placeId);
  } else {
    state.selectedPlaceIds.add(placeId);
  }

  // Update checkbox state
  const checkbox = document.querySelector(`input[data-place-id="${placeId}"]`) as HTMLInputElement;
  if (checkbox) {
    checkbox.checked = state.selectedPlaceIds.has(placeId);
  }

  // Update marker style
  routeMap.updateMarkerStyle(placeId, state.selectedPlaceIds.has(placeId));

  updateSelectionInfo();
}

function updateSelectionInfo(): void {
  const count = state.selectedPlaceIds.size;
  selectionCount.textContent = `${count} place${count !== 1 ? 's' : ''} selected`;

  // Rough estimate: (number of places * average spacing) + connections
  const estimatedMiles = state.distance;
  estimatedDistance.textContent = `~${estimatedMiles.toFixed(1)} miles`;

  generateRouteBtn.disabled = count === 0;
}

// Generate route handler
generateRouteBtn.addEventListener('click', async () => {
  if (!state.location || state.selectedPlaceIds.size === 0) {
    showError('Please select at least one place');
    return;
  }

  showLoading();

  try {
    const selectedPlaces = state.suggestedPlaces
      .filter(p => state.selectedPlaceIds.has(p.id))
      .map(p => ({
        lat: p.location.lat,
        lng: p.location.lng,
        name: p.name,
      }));

    const response = await generateRoute({
      start: state.location,
      selected_places: selectedPlaces,
      preferences: state.preferences,
    });

    state.generatedRoute = response;

    // Show route on map
    await routeMap.showRoute(
      state.location,
      response.optimized_order.map(p => ({ lat: p.lat, lng: p.lng }))
    );

    // Display route summary
    displayRouteSummary();

    routeSection.classList.remove('hidden');
    placesSection.classList.add('hidden');

  } catch (error) {
    showError(error instanceof Error ? error.message : 'Failed to generate route');
  } finally {
    hideLoading();
  }
});

function displayRouteSummary(): void {
  if (!state.generatedRoute) return;

  const { distance_miles, optimized_order, estimated_time_minutes, google_maps_url } = state.generatedRoute;

  const placeNames = optimized_order.map(p => p.name).join(', ');
  const hours = Math.floor(estimated_time_minutes / 60);
  const minutes = estimated_time_minutes % 60;
  const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} minutes`;

  routeSummary.innerHTML = `
    <p class="text-lg mb-2">
      <strong>${distance_miles} mile${distance_miles !== 1 ? 's' : ''}</strong>
      visiting ${optimized_order.length} place${optimized_order.length !== 1 ? 's' : ''}
    </p>
    <p class="text-gray-600 mb-2">${placeNames}</p>
    <p class="text-sm text-gray-500">Estimated time: ${timeStr}</p>
  `;

  openMapsBtn.href = google_maps_url;
}

// Route action handlers
copyLinkBtn.addEventListener('click', async () => {
  if (!state.generatedRoute) return;

  try {
    await navigator.clipboard.writeText(state.generatedRoute.google_maps_url);
    copyLinkBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyLinkBtn.textContent = 'Copy Link';
    }, 2000);
  } catch (error) {
    showError('Failed to copy link');
  }
});

shareBtn.addEventListener('click', async () => {
  if (!state.generatedRoute) return;

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'My Running Route',
        text: `Check out this ${state.generatedRoute.distance_miles} mile running route!`,
        url: state.generatedRoute.google_maps_url,
      });
    } catch (error) {
      // User cancelled or share failed
      console.log('Share cancelled');
    }
  } else {
    showError('Sharing not supported on this device');
  }
});

startOverBtn.addEventListener('click', () => {
  routeSection.classList.add('hidden');
  mapSection.classList.add('hidden');
  locationInput.value = '';
  distanceSelect.value = '5';
  distanceCustom.classList.add('hidden');
  prefParks.checked = false;
  prefWater.checked = false;
  prefUrban.checked = false;

  state.location = null;
  state.distance = 5;
  state.preferences = {};
  state.suggestedPlaces = [];
  state.selectedPlaceIds.clear();
  state.generatedRoute = null;

  findPlacesBtn.disabled = true;
});

// Initialize
initAutocomplete();
```

**Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat: implement main application logic"
```

---

## Task 11: Environment Configuration

**Files:**
- Create: `.env.example`
- Create: `.env` (local only, not committed)

**Step 1: Create .env.example**

```
# Google Maps API Keys
VITE_GOOGLE_MAPS_API_KEY=your_client_side_api_key_here
GOOGLE_PLACES_API_KEY=your_server_side_api_key_here
GOOGLE_DIRECTIONS_API_KEY=your_server_side_api_key_here
```

**Step 2: Create .env**

Note: Copy .env.example to .env and add your actual API keys (not committed to git)

**Step 3: Update .gitignore to ensure .env is ignored**

Run: `grep -q "^\.env$" .gitignore || echo ".env" >> .gitignore`

**Step 4: Commit**

```bash
git add .env.example
git commit -m "docs: add environment configuration example"
```

---

## Task 12: Vercel Analytics Integration

**Files:**
- Modify: `index.html`
- Modify: `src/main.ts`

**Step 1: Add Vercel Analytics script to index.html**

Add before closing `</body>` tag:

```html
<script>
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
</script>
<script defer src="/_vercel/insights/script.js"></script>
```

**Step 2: Add tracking function to main.ts**

Add at the top after imports:

```typescript
// Analytics tracking
function track(event: string, properties?: Record<string, any>): void {
  if (typeof window !== 'undefined' && (window as any).va) {
    (window as any).va('track', event, properties);
  }
}
```

**Step 3: Add track calls throughout main.ts**

In `findPlacesBtn.addEventListener('click', ...)` after successful response:

```typescript
track('places_searched', {
  distance_miles: distance,
  has_preferences: Object.values(preferences).some(Boolean),
  num_places: response.places.length,
  num_preselected: state.selectedPlaceIds.size,
});
```

In `togglePlaceSelection`:

```typescript
track('places_modified', {
  action: state.selectedPlaceIds.has(placeId) ? 'removed' : 'added',
  total_selected: state.selectedPlaceIds.size,
});
```

In `generateRouteBtn.addEventListener('click', ...)` after successful response:

```typescript
track('route_generated', {
  num_places: selectedPlaces.length,
  distance_requested: state.distance,
  distance_actual: response.distance_miles,
});
```

In `openMapsBtn` add click handler:

```typescript
openMapsBtn.addEventListener('click', () => {
  track('maps_opened');
});
```

In `copyLinkBtn.addEventListener('click', ...)` after successful copy:

```typescript
track('link_copied');
```

In `shareBtn.addEventListener('click', ...)` after successful share:

```typescript
track('link_shared');
```

**Step 4: Commit**

```bash
git add index.html src/main.ts
git commit -m "feat: integrate Vercel Analytics tracking"
```

---

## Task 13: Testing & Verification

**Step 1: Test local development server**

Run: `npm run dev`
Expected: Server starts on localhost:3000
Verify: Page loads with proper styling

**Step 2: Test build process**

Run: `npm run build`
Expected: Build completes successfully, dist/ folder created

**Step 3: Manual testing checklist**

Test the following (with mock data if APIs not configured yet):
- [ ] Location autocomplete works
- [ ] Distance selector updates state
- [ ] Custom distance input appears/hides
- [ ] Preference checkboxes toggle
- [ ] Find Places button enabled when location selected
- [ ] Loading state appears during API calls
- [ ] Error messages display correctly
- [ ] Map renders properly
- [ ] Place cards display with checkboxes
- [ ] Selection count updates
- [ ] Generate route button enables/disables
- [ ] Route displays on map
- [ ] Google Maps link works
- [ ] Copy link button works
- [ ] Start over resets state

**Step 4: Commit any fixes**

```bash
git add .
git commit -m "fix: address issues found in manual testing"
```

---

## Task 14: Documentation

**Files:**
- Create: `README.md`

**Step 1: Create README.md**

```markdown
# Running Maps

Generate optimized running routes through interesting places in any city.

## Features

- Search for running routes by location and distance
- AI-curated suggestions for landmarks, parks, and scenic spots
- Customizable preferences (parks, water stops, urban exploration)
- Optimized route generation with Google Directions
- One-click export to Google Maps for navigation
- Mobile-friendly responsive design

## Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- Google Cloud account with Maps, Places, and Directions APIs enabled

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   pip install -r requirements.txt
   ```

3. Create `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

4. Add your Google API keys to `.env`:
   - `VITE_GOOGLE_MAPS_API_KEY` - Client-side key (restricted to your domain)
   - `GOOGLE_PLACES_API_KEY` - Server-side key
   - `GOOGLE_DIRECTIONS_API_KEY` - Server-side key

### Development

Run the development server:

```bash
npm run dev
```

For local testing with serverless functions, use Vercel CLI:

```bash
vercel dev
```

### Building

Build for production:

```bash
npm run build
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push to main

### Environment Variables

Set these in your Vercel project settings:

- `GOOGLE_PLACES_API_KEY`
- `GOOGLE_DIRECTIONS_API_KEY`

The `VITE_GOOGLE_MAPS_API_KEY` is built into the client bundle during build time.

## Tech Stack

- **Frontend:** Vite, TypeScript, Tailwind CSS
- **Backend:** Python serverless functions
- **APIs:** Google Maps, Places, Directions
- **Hosting:** Vercel
- **Analytics:** Vercel Analytics

## Project Structure

```
running-maps/
├── api/                      # Serverless functions
│   ├── suggest-places.py     # Find interesting places
│   └── generate-route.py     # Generate optimized routes
├── src/                      # Frontend source
│   ├── main.ts              # Main application logic
│   ├── map.ts               # Google Maps integration
│   ├── api.ts               # API client
│   ├── types.ts             # TypeScript types
│   └── styles.css           # Tailwind styles
├── docs/plans/              # Design and implementation docs
├── index.html               # HTML entry point
├── package.json             # Node dependencies
├── requirements.txt         # Python dependencies
└── vercel.json             # Vercel configuration
```

## API Endpoints

### POST /api/suggest-places

Find interesting places near a location.

**Request:**
```json
{
  "lat": 40.7829,
  "lng": -73.9654,
  "distance_miles": 5,
  "preferences": {
    "prefer_parks": true,
    "water_stops": false,
    "urban_explorer": false
  }
}
```

**Response:**
```json
{
  "places": [
    {
      "id": "ChIJ...",
      "name": "Central Park",
      "types": ["park", "tourist_attraction"],
      "location": {"lat": 40.785, "lng": -73.968},
      "rating": 4.8,
      "photo_url": "https://...",
      "distance_from_start": 0.3
    }
  ]
}
```

### POST /api/generate-route

Generate an optimized running route.

**Request:**
```json
{
  "start": {"lat": 40.7829, "lng": -73.9654},
  "selected_places": [
    {"lat": 40.785, "lng": -73.968, "name": "Central Park"}
  ],
  "preferences": {}
}
```

**Response:**
```json
{
  "distance_miles": 5.2,
  "optimized_order": [...],
  "google_maps_url": "https://www.google.com/maps/dir/...",
  "estimated_time_minutes": 78
}
```

## License

MIT
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add comprehensive README"
```

---

## Task 15: Final Review & Merge Preparation

**Step 1: Review all changes**

Run: `git log --oneline`
Expected: See all commits from this implementation

**Step 2: Run final build test**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Create summary of work**

Review completed features:
- ✅ Project setup with Vite, TypeScript, Tailwind
- ✅ Backend API endpoints (suggest-places, generate-route)
- ✅ Frontend UI with responsive design
- ✅ Google Maps integration
- ✅ Place selection with pre-selected defaults
- ✅ Route generation and optimization
- ✅ Google Maps URL export
- ✅ Copy/share functionality
- ✅ Vercel Analytics integration
- ✅ Comprehensive documentation

**Step 4: Ready for testing with real API keys**

Next steps for deployment:
1. Set up Google Cloud project
2. Enable required APIs
3. Create and configure API keys
4. Test locally with real APIs
5. Deploy to Vercel
6. Add environment variables in Vercel
7. Test production deployment

---

## Completion

This plan is complete! The prototype is ready for:

1. **Local testing** with Google API keys
2. **Deployment** to Vercel
3. **User validation** to gather feedback
4. **Iteration** based on analytics and user feedback

**Estimated total time:** 10-12 hours

**Next:** Choose execution approach (subagent-driven or parallel session)
