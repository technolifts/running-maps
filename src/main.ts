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

// Setup autocomplete with new PlaceAutocompleteElement
async function initAutocomplete(): Promise<void> {
  try {
    // Load Google Maps API first
    await loadGoogleMapsAPI();

    // Initialize the map (google.maps is available)
    routeMap.init('map', { lat: 40.7829, lng: -73.9654 });

    // Create a wrapper div for the PlaceAutocompleteElement
    const inputParent = locationInput.parentElement!;
    const autocompleteContainer = document.createElement('div');
    autocompleteContainer.style.width = '100%';

    // Replace the input with the container
    inputParent.replaceChild(autocompleteContainer, locationInput);

    // Create the new PlaceAutocompleteElement
    routeMap.createPlaceAutocomplete(
      autocompleteContainer,
      (location) => {
        state.location = location;
        findPlacesBtn.disabled = false;
      }
    );
  } catch (error) {
    showError('Failed to initialize map. Please refresh the page or check your connection.');
    console.error('Map initialization error:', error);
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
