# Running Maps - Design Document

**Date:** 2026-01-18
**Status:** Approved
**Version:** 1.0

---

## 1. Overview & Core Concept

### Problem Statement
Runners who travel or explore new cities struggle to create interesting running routes. The current process requires manually finding points of interest, adding them to Google Maps, and figuring out an efficient order - a tedious workflow that limits spontaneous exploration.

### Solution
A simple web tool that generates optimized running routes based on user preferences. Users input their starting location and desired distance, receive AI-curated suggestions for interesting places to visit (landmarks, parks, scenic spots), select which places appeal to them, and instantly get a shareable Google Maps link with a complete running route.

### Target Users
- Travelers exploring new cities who want to run and sightsee simultaneously
- Local runners looking to discover new areas of their city
- People who want variety in their running routes

### Core Value Proposition
Transform running into effortless urban exploration. In 60 seconds, go from "I want to run 5 miles" to a curated route through the most interesting parts of any city, ready to navigate in Google Maps.

### Key Constraints
- No user accounts or login (friction-free)
- Mobile-first design (used while traveling)
- Simple prototype to validate concept before scaling

---

## 2. User Experience & Flow

### Interface Design
Single-page application with three progressive states:

#### State 1 - Input (Landing)
- Clean hero section: "Plan Your Perfect Running Route"
- Location input with autocomplete + "Use my location" button
- Distance selector: Dropdown with common distances (1, 2, 3, 5, 7, 10, 13 miles) + manual input option
- Collapsible "Customize preferences" section:
  - Prefer parks/nature (slight weighting)
  - Avoid hills
  - Include water stops
  - Urban explorer mode (architecture, street art)
- "Find Places" CTA button

#### State 2 - Place Selection
- Interactive map showing start point + 12-15 suggested places as markers
- **By default: Top 3-5 places are pre-selected** (based on score and appropriate for the distance)
- Sidebar/bottom sheet with place cards:
  - Thumbnail photo, name, type badge (landmark/park/cafe), Google rating
  - Checkboxes (pre-selected ones are checked by default)
  - Distance from start
- Live-updating selection counter showing estimated distance
- Helper text: "Select 1-6 places for your route"
- Warning if selections exceed distance (e.g., "These 5 places create an 8-mile route, not 5")
- "Generate Route" button (enabled immediately with pre-selected defaults)

**User Flow Options:**
- **Quick path:** Just click "Generate Route" with defaults
- **Custom path:** Adjust selections then generate

#### State 3 - Route Output
- Map displays full route with numbered waypoints in optimized order
- Summary card: "5.2-mile loop visiting Central Park, The Met, Bethesda Fountain"
- Estimated time
- Primary CTA: "Open in Google Maps" button (launches URL)
- Secondary actions: "Copy Link" and "Share" buttons
- "Start Over" link

### Mobile Optimization
- Map fills 50% of viewport height
- Inputs/controls scroll below map
- Touch-friendly tap targets (min 44px)
- Place cards swipe horizontally on small screens

---

## 3. Technical Architecture

### Stack
- **Frontend:** Vite + TypeScript, vanilla JS/Lit (lightweight), Tailwind CSS
- **Backend:** Python serverless functions on Vercel
- **APIs:** Google Maps JavaScript API, Google Places API, Google Directions API
- **Analytics:** Vercel Analytics with custom events
- **Hosting:** Vercel (auto-deploy from GitHub)

### System Architecture
```
User Browser
    ↓ (location, distance, prefs)
Frontend (Vite + TS)
    ↓ POST /api/suggest-places
Python Serverless Function
    ↓ queries
Google Places API
    ↓ returns POIs
Scoring Algorithm (Python)
    ↓ ranked results
Frontend displays map + suggestions
    ↓ (selected places)
    ↓ POST /api/generate-route
Python Serverless Function
    ↓ queries
Google Directions API
    ↓ optimized route
Build Google Maps URL
    ↓ return URL + metadata
Frontend → User clicks → Google Maps
```

### Data Flow
1. User inputs trigger `/api/suggest-places` call
2. Backend queries multiple Google Places types, scores results
3. Frontend renders map with top 15, pre-selects best 3-5
4. User adjusts selections (or keeps defaults)
5. Frontend calls `/api/generate-route` with selections
6. Backend optimizes waypoint order via Google Directions
7. Returns Google Maps URL with complete route
8. User opens in Google Maps for navigation

### Security
- API keys stored in Vercel environment variables
- Server-side keys never exposed to browser
- Client-side key restricted to domain referrers
- Rate limiting via Google Cloud quotas

---

## 4. Backend Implementation

### Function 1: `/api/suggest-places`

**Inputs:**
- Location (lat/lng)
- Distance in miles
- Preference flags (prefer_parks, avoid_hills, water_stops, urban_explorer)

**Algorithm:**
```python
def suggest_places(lat, lng, distance_miles, preferences):
    # Calculate search radius (50% of run distance)
    radius_meters = (distance_miles * 0.5) * 1609.34

    # Query Google Places API for multiple types
    place_types = [
        ['tourist_attraction', 'museum', 'park', 'landmark'],
        ['point_of_interest', 'natural_feature'],
        ['cafe', 'restaurant'] if preferences.water_stops else []
    ]

    all_places = []
    for types in place_types:
        results = google_places_nearby_search(
            location=(lat, lng),
            radius=radius_meters,
            types=types
        )
        all_places.extend(results)

    # Deduplicate by place_id
    unique_places = deduplicate(all_places)

    # Score each place
    scored = []
    for place in unique_places:
        score = calculate_score(place, preferences)
        scored.append((score, place))

    # Return top 15
    return sorted(scored, reverse=True)[:15]
```

**Scoring Function:**
```python
def calculate_score(place, preferences):
    # Base score from Google rating and popularity
    score = place.rating * (1 + log(place.user_ratings_total) / 10)

    # Type bonuses (priority: landmarks > scenic > practical)
    if 'tourist_attraction' in place.types:
        score *= 3.0
    if 'park' in place.types:
        score *= 1.2
    if 'natural_feature' in place.types:
        score *= 1.2
    if 'cafe' in place.types:
        score *= 0.5

    # Apply user preferences
    if preferences.prefer_parks and 'park' in place.types:
        score *= 1.5
    if preferences.urban_explorer and 'architecture' in place.types:
        score *= 1.5

    # Distance penalty (prefer closer to start)
    distance_factor = 1 - (place.distance_from_start / max_radius) * 0.3
    score *= distance_factor

    return score
```

**Response Format:**
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

### Function 2: `/api/generate-route`

**Inputs:**
- Start location (lat/lng)
- Selected places (array of lat/lng + names)
- Loop preference (always true for v1)
- Preferences (avoid_hills)

**Implementation:**
```python
def generate_route(start, selected_places, preferences):
    # Build waypoints for Google Directions API
    waypoints = [
        f"{place['lat']},{place['lng']}"
        for place in selected_places
    ]

    # Call Google Directions API
    result = google_directions(
        origin=f"{start['lat']},{start['lng']}",
        destination=f"{start['lat']},{start['lng']}",  # Loop back
        waypoints=waypoints,
        optimize_waypoints=True,  # Let Google optimize order
        mode='walking',
        avoid='highways',
        units='imperial'
    )

    # Extract optimized order
    optimized_order = result['routes'][0]['waypoint_order']
    ordered_places = [selected_places[i] for i in optimized_order]

    # Get total distance
    total_distance = sum(leg['distance']['value']
                        for leg in result['routes'][0]['legs'])
    distance_miles = total_distance / 1609.34

    # Build Google Maps URL
    waypoint_str = '|'.join(
        f"{p['lat']},{p['lng']}" for p in ordered_places
    )
    maps_url = (
        f"https://www.google.com/maps/dir/"
        f"?api=1"
        f"&origin={start['lat']},{start['lng']}"
        f"&destination={start['lat']},{start['lng']}"
        f"&waypoints={waypoint_str}"
        f"&travelmode=walking"
    )

    return {
        'distance_miles': round(distance_miles, 1),
        'optimized_order': ordered_places,
        'google_maps_url': maps_url,
        'estimated_time_minutes': int(distance_miles * 15)  # ~15 min/mile
    }
```

**Special Handling for Out-and-Back (1 place):**
```python
if len(selected_places) == 1:
    # Don't use waypoint optimization, just straight there and back
    # Calculate: start → place is half the desired distance
    # Google will give walking directions there, user retraces
```

---

## 5. Frontend Implementation

### Technology
- **Vite** for dev server and bundling
- **TypeScript** for type safety
- **Google Maps JavaScript API** for map rendering
- **Tailwind CSS** for styling
- **No framework** - vanilla TS keeps bundle small (~50kb)

### Key Components

#### 1. Map Component (`map.ts`)
```typescript
class RouteMap {
  private map: google.maps.Map;
  private markers: google.maps.Marker[] = [];

  initMap(center: {lat: number, lng: number}) {
    this.map = new google.maps.Map(element, {
      center,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false
    });
  }

  showPlaces(places: Place[], preselected: string[]) {
    places.forEach(place => {
      const marker = new google.maps.Marker({
        position: {lat: place.lat, lng: place.lng},
        map: this.map,
        title: place.name,
        icon: preselected.includes(place.id)
          ? selectedIcon
          : defaultIcon
      });

      marker.addListener('click', () => {
        togglePlaceSelection(place.id);
      });

      this.markers.push(marker);
    });
  }

  showRoute(route: google.maps.DirectionsResult) {
    const renderer = new google.maps.DirectionsRenderer({
      map: this.map,
      suppressMarkers: false
    });
    renderer.setDirections(route);
  }
}
```

#### 2. API Client (`api.ts`)
```typescript
async function suggestPlaces(params: SuggestParams): Promise<Place[]> {
  const response = await fetch('/api/suggest-places', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    throw new Error('Failed to fetch places');
  }

  return response.json();
}

async function generateRoute(params: RouteParams): Promise<RouteResult> {
  const response = await fetch('/api/generate-route', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    throw new Error('Failed to generate route');
  }

  return response.json();
}
```

#### 3. State Management
Simple state object, no complex state library needed:
```typescript
const state = {
  location: null,
  distance: 5,
  preferences: {},
  suggestedPlaces: [],
  selectedPlaceIds: [],
  generatedRoute: null
};
```

#### 4. UI States
- Loading states during API calls (skeleton loaders)
- Error messages for API failures
- Empty states ("No places found - try increasing distance")
- Success confirmation (route generated)

---

## 6. Error Handling & Edge Cases

### API Error Handling

**Google API Failures:**
- **Rate limit exceeded:** "High traffic right now. Please try again in a moment."
- **Invalid API key:** Log server-side, show generic "Service unavailable"
- **Timeout (>10s):** Retry once, then show "Request timed out. Please try again."
- **Invalid response format:** Log error, show "Something went wrong"

### User Input Validation
- **No location selected:** Disable "Find Places" button until location entered
- **Distance too small (<0.5 miles):** Show minimum distance message
- **Distance too large (>26 miles):** Allow but warn "This is marathon distance!"
- **Location autocomplete fails:** Fallback to manual lat/lng entry (advanced users)

### Place Selection Edge Cases

**No places found:**
- Remote area with few POIs
- Response: "We couldn't find enough interesting places nearby. Try increasing your distance or choosing a different location."
- Show distance slider with suggested higher value

**Distance mismatch warning:**
- User's selections create 8-mile route when they requested 5
- Before generating: Show alert "⚠️ Your selections create an 8.2-mile route (requested: 5 miles). Continue anyway?"
- Options: "Generate Anyway" or "Adjust Selections"

**Single place selected:**
- Generate out-and-back route
- Show info: "Creating an out-and-back route to [Place Name]"
- Total distance splits evenly (2.5 miles each direction for 5-mile run)

**Too many places (>10):**
- Google Directions supports max 25 waypoints, but for running, >10 is excessive
- Soft limit: Show warning "10+ stops may create a fragmented run. Consider fewer places."
- Hard limit: Cap at 15 waypoints

### Network Failures
- Offline detection: "You appear to be offline. Please check your connection."
- Slow connection: Show loading state with timeout after 15 seconds

### Mobile-Specific
- "Use my location" permission denied → Fall back to autocomplete search
- Low accuracy location (>100m) → Show accuracy warning

---

## 7. Analytics & Metrics

### Tool: Vercel Analytics
- Free tier included with Vercel hosting
- Privacy-friendly (no cookies, GDPR compliant)
- One-click setup in Vercel dashboard

### Core Metrics (Automatic)
- Page views
- Unique visitors
- Geographic distribution
- Device types (mobile vs desktop)
- Web vitals (performance)

### Custom Events to Track

```typescript
// After user searches for places
track('places_searched', {
  distance_miles: 5,
  has_preferences: true,
  preference_count: 2,
  location_type: 'autocomplete' // or 'geolocation'
});

// When places are displayed
track('places_displayed', {
  num_places: 15,
  num_preselected: 4
});

// When user modifies selections
track('places_modified', {
  action: 'added' // or 'removed',
  total_selected: 5
});

// When route is generated
track('route_generated', {
  num_places: 3,
  distance_requested: 5,
  distance_actual: 5.2,
  used_defaults: false, // did they use preselected places?
  time_to_generate_seconds: 1.2
});

// When user opens Google Maps
track('maps_opened');

// When user copies/shares link
track('link_copied');
track('link_shared');

// Errors
track('error_occurred', {
  error_type: 'api_failure',
  endpoint: '/api/suggest-places'
});
```

### Key Questions Analytics Will Answer
1. **Completion rate:** What % of users who search actually generate a route?
2. **Customization:** Do users modify the pre-selected places or trust defaults?
3. **Popular distances:** What run lengths are most requested?
4. **Preference usage:** Which preference toggles are most used?
5. **Drop-off points:** Where do users abandon the flow?
6. **Mobile vs desktop:** Is this primarily mobile usage?
7. **Geographic patterns:** Which cities/regions use this most?

### Privacy Principles
- No personal identifiable information collected
- No cross-site tracking
- No IP address storage
- Aggregate data only

### Success Metrics for Validation
- 100+ unique users in first month = interest exists
- >50% completion rate (search → generate) = flow works
- >70% mobile usage = validates mobile-first design
- Low error rates (<5%) = technical implementation solid

---

## 8. Deployment & Setup

### Google Cloud Setup

**1. Create Google Cloud Project:**
- Go to console.cloud.google.com
- Create new project: "running-maps"
- Enable billing (required even for free tier)

**2. Enable Required APIs:**
- Maps JavaScript API (for frontend map)
- Places API (for finding POIs)
- Directions API (for route generation)

**3. Create API Keys:**
- **Client-side key** (for Maps JavaScript API):
  - Restrict to HTTP referrers: `*.vercel.app/*`, `yourdomain.com/*`
  - Only enable Maps JavaScript API
- **Server-side key** (for Places & Directions):
  - No referrer restrictions (used in backend)
  - Enable Places API and Directions API

**4. Set Quotas (Cost Control):**
- Places API: 1000 requests/day (enough for ~500 users)
- Directions API: 1000 requests/day
- Set billing alerts at $10, $25, $50

### Vercel Deployment

**1. Initial Setup:**
```bash
# Push code to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo>
git push -u origin main
```

**2. Import to Vercel:**
- Go to vercel.com
- "Import Project" → Select GitHub repo
- Framework preset: Vite
- Root directory: `.`

**3. Environment Variables (in Vercel dashboard):**
```
GOOGLE_PLACES_API_KEY=<server-side-key>
GOOGLE_DIRECTIONS_API_KEY=<server-side-key>
GOOGLE_MAPS_JS_API_KEY=<client-side-key>
```

**4. Deploy:**
- Vercel auto-deploys on every push to main
- Preview deployments for branches
- Get URL: `running-maps.vercel.app`

### Local Development

```bash
# Install Vercel CLI
npm i -g vercel

# Install dependencies
npm install
pip install -r requirements.txt

# Run locally (starts dev server + functions)
vercel dev

# Access at http://localhost:3000
```

### Project Structure
```
running-maps/
├── api/
│   ├── suggest-places.py
│   └── generate-route.py
├── public/
│   └── assets/
├── src/
│   ├── main.ts
│   ├── map.ts
│   ├── api.ts
│   └── styles.css
├── index.html
├── vercel.json
├── requirements.txt
├── package.json
├── tsconfig.json
└── tailwind.config.js
```

### Cost Estimates
- Vercel hosting: Free (hobby tier)
- Google APIs: ~$0.02/user session
- 500 users/month = ~$10
- Domain (optional): ~$12/year

---

## 9. Testing Strategy

### Testing Approach (Manual for Prototype)

**Functional Testing:**

1. **Location Input:**
   - Autocomplete works for major cities
   - "Use my location" button requests permission correctly
   - Invalid locations show error

2. **Place Suggestions:**
   - Different cities return appropriate landmarks
   - Distance affects search radius (larger distance = more spread)
   - Preferences affect results (parks weighted higher when enabled)
   - Pre-selection defaults to 3-5 reasonable places

3. **Place Selection:**
   - Click to add/remove places works
   - Counter updates correctly
   - Warning shows when selections exceed distance by 50%+

4. **Route Generation:**
   - Google Maps URL opens correctly with full route
   - Waypoints appear in optimized order
   - Loop returns to start
   - Single place creates out-and-back
   - Copy/share buttons work

5. **Mobile Testing:**
   - Responsive layout on iOS Safari, Android Chrome
   - Touch interactions work (tap markers, scroll lists)
   - "Use my location" on mobile devices
   - Google Maps app opens (not just browser)

### Test Scenarios

| Scenario | Location | Distance | Expected Result |
|----------|----------|----------|-----------------|
| Tourist run | Paris, France | 3 miles | Eiffel Tower, Louvre, Arc de Triomphe |
| Park run | Central Park, NYC | 5 miles | Multiple park loops + nearby landmarks |
| Small town | Smallville, USA | 5 miles | Limited POIs, graceful handling |
| Long run | Boston | 10 miles | More spread out, waterfront suggested |
| Single place | Any city | 3 miles | Out-and-back route |

### API Error Simulation
- Disconnect network → Offline error
- Invalid API key → Service unavailable
- Rate limit → Try again message

### Performance Testing
- Page load < 2 seconds
- API responses < 3 seconds
- Map renders smoothly (no lag on mobile)

**No Automated Tests for V1** - premature for validation phase. Add later if concept proves successful.

---

## 10. Next Steps

### Implementation Timeline

**1. Environment Setup** (~1 hour)
- Create Google Cloud project
- Enable APIs and create keys
- Set up local development environment

**2. Backend Implementation** (~3 hours)
- Build `/api/suggest-places` function
- Build `/api/generate-route` function
- Test API integrations

**3. Frontend Implementation** (~4 hours)
- Build UI components
- Integrate Google Maps
- Connect to backend APIs
- Style with Tailwind

**4. Integration & Testing** (~2 hours)
- End-to-end testing
- Mobile device testing
- Fix bugs

**5. Deploy** (~30 minutes)
- Push to GitHub
- Deploy to Vercel
- Add analytics
- Test production

**6. Validation Phase** (~2-4 weeks)
- Share with friends/running communities
- Monitor analytics
- Gather feedback
- Decide: iterate or pivot

**Total Estimated Time: 10-12 hours of development**

### Success Criteria
- Working prototype deployed to production
- Can generate routes in 10+ major cities
- Mobile experience is smooth and usable
- Analytics tracking all key events
- Initial user feedback gathered

### Future Enhancements (Post-Validation)
- Save favorite routes (requires auth)
- Community route sharing
- Elevation profiles
- Weather integration
- Running club discovery
- Mobile app (native or PWA)

---

## Appendix

### API Rate Limits & Costs

**Google Places API (Nearby Search):**
- Cost: $17 per 1000 requests
- Free tier: $200 monthly credit
- Our usage: 1 request per search
- Break-even: ~11,764 searches/month

**Google Directions API:**
- Cost: $5 per 1000 requests
- Free tier: Included in $200 credit
- Our usage: 1 request per route generation
- Break-even: ~40,000 routes/month

**Typical User Session:**
- 1 places search + 1 route generation = $0.022
- 500 users = $11
- 1000 users = $22

### Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Google API costs spike | High | Set strict quotas, billing alerts |
| "Scenic" routes not actually scenic | Medium | Iterate on scoring algorithm based on feedback |
| Mobile UX issues | High | Test on real devices early, mobile-first design |
| Limited POIs in small towns | Medium | Clear messaging, suggest increasing radius |
| API rate limits during peak usage | Medium | Caching, request throttling, upgrade quota |

### References
- [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service)
- [Google Directions API Documentation](https://developers.google.com/maps/documentation/directions)
- [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
