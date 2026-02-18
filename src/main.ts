import './styles.css';
import { RouteMap } from './map';
import { suggestPlaces, generateRoute } from './api';
import { loadGoogleMapsAPI } from './google-maps-loader';
import type { AppState, Place, Preferences } from './types';

// Analytics tracking
function track(event: string, properties?: Record<string, any>): void {
  if (typeof window !== 'undefined' && (window as any).va) {
    (window as any).va('track', event, properties);
  }
}

// Initialize state
const state: AppState = {
  location: null,
  distance: 5,
  preferences: {},
  suggestedPlaces: [],
  selectedPlaceIds: new Set(),
  generatedRoute: null,
};

// Initialize map
const routeMap = new RouteMap();

// DOM Elements
const distanceSelect = document.getElementById('distance-select') as HTMLSelectElement;
const distanceCustom = document.getElementById('distance-custom') as HTMLInputElement;
const prefParks = document.getElementById('pref-parks') as HTMLInputElement;
const prefWater = document.getElementById('pref-water') as HTMLInputElement;
const prefUrban = document.getElementById('pref-urban') as HTMLInputElement;
const prefTrail = document.getElementById('pref-trail') as HTMLInputElement;
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
const editSelectionsBtn = document.getElementById('edit-selections-btn') as HTMLButtonElement;
const startOverBtn = document.getElementById('start-over-btn') as HTMLButtonElement;
const toggleMapSizeBtn = document.getElementById('toggle-map-size') as HTMLButtonElement;
const loading = document.getElementById('loading') as HTMLDivElement;
const initLoader = document.getElementById('init-loader') as HTMLDivElement;
const errorMessage = document.getElementById('error-message') as HTMLDivElement;
const progressNav = document.getElementById('progress-nav') as HTMLElement;

// Helper functions
function showLoading(): void {
  loading.classList.remove('hidden');
}

function hideLoading(): void {
  loading.classList.add('hidden');
}

interface ErrorConfig {
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  action?: { label: string; handler: () => void };
}

function showEnhancedError(config: ErrorConfig): void {
  const colors = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const icons = {
    error: '⚠️',
    warning: '⚠️',
    info: 'ℹ️',
  };

  errorMessage.className = `border-2 px-4 py-3 rounded-lg ${colors[config.type]} mb-4`;
  errorMessage.innerHTML = `
    <div class="flex items-start gap-3">
      <span class="text-xl">${icons[config.type]}</span>
      <div class="flex-1">
        <p class="font-semibold">${config.title}</p>
        <p class="text-sm mt-1">${config.message}</p>
        ${config.action ? `
          <button class="mt-2 text-sm font-medium underline hover:no-underline" id="error-action-btn">
            ${config.action.label}
          </button>
        ` : ''}
      </div>
      <button onclick="this.closest('.border-2').classList.add('hidden')"
              class="text-gray-400 hover:text-gray-600">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  `;
  errorMessage.classList.remove('hidden');

  if (config.action) {
    const actionBtn = document.getElementById('error-action-btn');
    if (actionBtn) {
      actionBtn.addEventListener('click', config.action.handler);
    }
  }

  setTimeout(() => {
    errorMessage.classList.add('hidden');
  }, 8000);
}

function showError(message: string): void {
  showEnhancedError({
    title: 'Error',
    message,
    type: 'error'
  });
}

function getPreferences(): Preferences {
  return {
    prefer_parks: prefParks.checked,
    water_stops: prefWater.checked,
    urban_explorer: prefUrban.checked,
    trail_runner: prefTrail.checked,
  };
}

function getCurrentDistance(): number {
  if (distanceSelect.value === 'custom') {
    return parseFloat(distanceCustom.value) || 5;
  }
  return parseFloat(distanceSelect.value);
}

function getCategoryColor(type: string): string {
  const colors: Record<string, string> = {
    park: 'bg-green-50 text-green-700 border-green-200',
    hiking_area: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    nature_preserve: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    museum: 'bg-purple-50 text-purple-700 border-purple-200',
    restaurant: 'bg-amber-50 text-amber-700 border-amber-200',
    cafe: 'bg-amber-50 text-amber-700 border-amber-200',
    tourist_attraction: 'bg-blue-50 text-blue-700 border-blue-200',
    art_gallery: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return colors[type] || 'bg-gray-50 text-gray-700 border-gray-200';
}

function getCategoryIcon(type: string): string {
  const icons: Record<string, string> = {
    park: '🌳',
    hiking_area: '🥾',
    nature_preserve: '🌿',
    museum: '🏛️',
    restaurant: '🍽️',
    cafe: '☕',
    tourist_attraction: '🗿',
    art_gallery: '🎨',
  };
  return icons[type] || '📍';
}

function getPreferenceMatch(place: Place, prefs: Preferences): string {
  const matches: string[] = [];
  if (prefs.prefer_parks && place.types.some(t => t === 'park')) {
    matches.push('Parks & Nature');
  }
  if (prefs.water_stops && place.types.some(t => t === 'restaurant' || t === 'cafe')) {
    matches.push('Water Stops');
  }
  if (prefs.urban_explorer &&
      place.types.some(t => t === 'museum' || t === 'art_gallery' || t === 'tourist_attraction')) {
    matches.push('Urban Explorer');
  }
  if (prefs.trail_runner &&
      place.types.some(t => ['hiking_area', 'nature_preserve', 'park', 'natural_feature'].includes(t))) {
    matches.push('Trail Runner');
  }

  if (matches.length > 0) {
    return `
      <div class="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5
                  bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
        ✨ Matches: ${matches.join(', ')}
      </div>
    `;
  }
  return '';
}

// Setup autocomplete with new PlaceAutocompleteElement
async function initAutocomplete(): Promise<void> {
  try {
    // Load Google Maps API first
    await loadGoogleMapsAPI();

    // Initialize the map (google.maps is available)
    routeMap.init('map', { lat: 40.7829, lng: -73.9654 });

    // Get the autocomplete container
    const autocompleteContainer = document.getElementById('location-autocomplete-container')!;

    // Create the new PlaceAutocompleteElement
    routeMap.createPlaceAutocomplete(
      autocompleteContainer,
      (location) => {
        state.location = location;
        findPlacesBtn.disabled = false;
        updateProgress('location');
      }
    );

    // Hide initial loader
    if (initLoader) {
      initLoader.classList.add('hidden');
    }
  } catch (error) {
    showEnhancedError({
      title: 'Map initialization failed',
      message: 'Please refresh the page or check your internet connection.',
      type: 'error',
      action: {
        label: 'Refresh page',
        handler: () => window.location.reload()
      }
    });
    console.error('Map initialization error:', error);
    if (initLoader) {
      initLoader.classList.add('hidden');
    }
  }
}

function updateProgress(step: 'location' | 'places' | 'route'): void {
  if (!progressNav) return;

  progressNav.classList.remove('hidden');

  const steps = progressNav.querySelectorAll('.progress-step');
  steps.forEach(stepEl => {
    const stepData = stepEl.getAttribute('data-step');
    stepEl.classList.remove('active', 'completed');

    if (stepData === step) {
      stepEl.classList.add('active');
    } else if (
      (step === 'places' && stepData === 'location') ||
      (step === 'route' && (stepData === 'location' || stepData === 'places'))
    ) {
      stepEl.classList.add('completed');
    }
  });
}

// Preference chip handlers
document.querySelectorAll('.preference-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    chip.classList.toggle('active');
    const pref = (chip as HTMLElement).dataset.pref;

    if (pref === 'parks') prefParks.checked = chip.classList.contains('active');
    if (pref === 'water') prefWater.checked = chip.classList.contains('active');
    if (pref === 'urban') prefUrban.checked = chip.classList.contains('active');
    if (pref === 'trail') prefTrail.checked = chip.classList.contains('active');
  });
});

// Map size toggle handler
if (toggleMapSizeBtn) {
  toggleMapSizeBtn.addEventListener('click', () => {
    const mapEl = document.getElementById('map');
    if (mapEl) {
      mapEl.classList.toggle('fullscreen');
    }
  });
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
      location: state.location,
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

    track('places_searched', {
      distance_miles: distance,
      has_preferences: Object.values(preferences).some(Boolean),
      num_places: response.places.length,
      num_preselected: state.selectedPlaceIds.size,
    });

    displayPlaces();
    mapSection.classList.remove('hidden');
    routeSection.classList.add('hidden');
    updateProgress('places');

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to fetch places';
    if (errorMsg.includes('No places found')) {
      showEnhancedError({
        title: 'No places found',
        message: 'Try increasing your distance or adjusting your preferences.',
        type: 'warning',
        action: {
          label: 'Adjust settings',
          handler: () => window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      });
    } else if (errorMsg.toLowerCase().includes('network') || errorMsg.toLowerCase().includes('connection')) {
      showEnhancedError({
        title: 'Connection error',
        message: 'Please check your internet connection and try again.',
        type: 'error',
        action: {
          label: 'Retry',
          handler: () => findPlacesBtn.click()
        }
      });
    } else {
      showEnhancedError({
        title: 'Something went wrong',
        message: errorMsg || 'Please try again or contact support.',
        type: 'error',
      });
    }
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
  const card = document.createElement('div');
  card.className = 'place-card group bg-white rounded-lg border-2 border-gray-200 p-4 hover:border-blue-300 hover:shadow-lg transition-all duration-300 cursor-pointer';

  const primaryType = place.types[0] || 'place';
  const typeLabel = primaryType.replace(/_/g, ' ');
  const categoryColor = getCategoryColor(primaryType);
  const categoryIcon = getCategoryIcon(primaryType);
  const preferenceMatch = getPreferenceMatch(place, state.preferences);

  card.innerHTML = `
    <div class="flex gap-4">
      <div class="relative flex-shrink-0">
        ${place.photo_url ? `
          <img src="${place.photo_url}"
               alt="${place.name}"
               class="w-32 h-32 rounded-lg object-cover group-hover:scale-105 transition-transform duration-300" />
          <span class="absolute top-2 right-2 px-2 py-1 rounded-full text-xs
                       bg-white/90 backdrop-blur-sm font-medium border
                       ${categoryColor}">
            ${categoryIcon} ${typeLabel}
          </span>
        ` : `
          <div class="w-32 h-32 rounded-lg bg-gray-100 flex items-center justify-center text-4xl">
            ${categoryIcon}
          </div>
        `}
      </div>

      <div class="flex-1">
        <h3 class="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
          ${place.name}
        </h3>

        <div class="flex items-center gap-3 mt-2 text-sm text-gray-600">
          ${place.rating ? `
            <span class="flex items-center gap-1">
              <span class="text-amber-400">★</span>
              <span class="font-medium">${place.rating}</span>
            </span>
          ` : ''}
          <span class="flex items-center gap-1">
            📍 ${place.distance_from_start.toFixed(1)} mi
          </span>
        </div>

        ${preferenceMatch}
      </div>

      <input type="checkbox" ${selected ? 'checked' : ''}
             data-place-id="${place.id}"
             class="w-5 h-5 text-blue-600 rounded self-start" />
    </div>
  `;

  const checkbox = card.querySelector('input') as HTMLInputElement;
  checkbox.addEventListener('change', (e) => {
    e.stopPropagation();
    togglePlaceSelection(place.id);
  });

  card.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).tagName !== 'INPUT') {
      checkbox.checked = !checkbox.checked;
      togglePlaceSelection(place.id);
    }
  });

  return card;
}

function togglePlaceSelection(placeId: string): void {
  const wasSelected = state.selectedPlaceIds.has(placeId);

  if (wasSelected) {
    state.selectedPlaceIds.delete(placeId);
  } else {
    state.selectedPlaceIds.add(placeId);
  }

  track('places_modified', {
    action: wasSelected ? 'removed' : 'added',
    total_selected: state.selectedPlaceIds.size,
  });

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
      .filter(p => state.selectedPlaceIds.has(p.id));

    const response = await generateRoute({
      start: state.location,
      selected_places: selectedPlaces,
      preferences: state.preferences,
    });

    state.generatedRoute = response;

    track('route_generated', {
      num_places: selectedPlaces.length,
      distance_requested: state.distance,
      distance_actual: response.distance_miles,
    });

    // Show route on map
    await routeMap.showRoute(
      state.location,
      response.optimized_order.map(p => p.location)
    );

    // Display route summary
    displayRouteSummary();

    routeSection.classList.remove('hidden');
    placesSection.classList.add('hidden');
    updateProgress('route');

  } catch (error) {
    showEnhancedError({
      title: 'Failed to generate route',
      message: error instanceof Error ? error.message : 'Please try again.',
      type: 'error',
      action: {
        label: 'Retry',
        handler: () => generateRouteBtn.click()
      }
    });
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
openMapsBtn.addEventListener('click', () => {
  track('maps_opened');
});
copyLinkBtn.addEventListener('click', async () => {
  if (!state.generatedRoute) return;

  try {
    await navigator.clipboard.writeText(state.generatedRoute.google_maps_url);
    track('link_copied');
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
      track('link_shared');
    } catch (error) {
      // User cancelled or share failed
      console.log('Share cancelled');
    }
  } else {
    showEnhancedError({
      title: 'Sharing not available',
      message: 'Use the Copy Link button to share this route.',
      type: 'info'
    });
  }
});

editSelectionsBtn.addEventListener('click', () => {
  routeSection.classList.add('hidden');
  placesSection.classList.remove('hidden');
  updateProgress('places');

  // Scroll to places section
  placesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

startOverBtn.addEventListener('click', () => {
  routeSection.classList.add('hidden');
  mapSection.classList.add('hidden');
  progressNav.classList.add('hidden');

  // Reset preference chips
  document.querySelectorAll('.preference-chip').forEach(chip => {
    chip.classList.remove('active');
  });

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

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Initialize
initAutocomplete();
