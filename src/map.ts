// Google Maps integration wrapper class

import type { Location, Place } from './types';

export class RouteMap {
  private map: google.maps.Map | null = null;
  private markers: google.maps.Marker[] = [];
  private directionsRenderer: google.maps.DirectionsRenderer | null = null;

  /**
   * Initialize the Google Map instance
   */
  init(element: string | HTMLElement, center: Location): void {
    const mapElement = typeof element === 'string'
      ? document.getElementById(element)!
      : element;

    this.map = new google.maps.Map(mapElement, {
      center,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
    });
  }

  /**
   * Clear all markers from the map
   */
  clearMarkers(): void {
    this.markers.forEach((marker) => marker.setMap(null));
    this.markers = [];
  }

  /**
   * Display place markers on the map
   */
  showPlaces(
    places: Place[],
    preselected: string[],
    onMarkerClick?: (placeId: string) => void
  ): void {
    if (!this.map) {
      throw new Error('Map not initialized');
    }

    this.clearMarkers();

    places.forEach((place) => {
      const isSelected = preselected.includes(place.id);

      const marker = new google.maps.Marker({
        position: place.location,
        map: this.map!,
        title: place.id,
        icon: isSelected
          ? {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#3B82F6',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
            }
          : {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#9CA3AF',
              fillOpacity: 0.8,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
            },
      });

      if (onMarkerClick) {
        marker.addListener('click', () => {
          onMarkerClick(place.id);
        });
      }

      this.markers.push(marker);
    });

    // Fit map bounds to show all markers
    if (places.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      places.forEach((place) => bounds.extend(place.location));
      this.map!.fitBounds(bounds);
    }
  }

  /**
   * Update marker style for a specific place (selected/unselected)
   */
  updateMarkerStyle(placeId: string, isSelected: boolean): void {
    // Find the marker by comparing the place ID stored in the marker's title
    const marker = this.markers.find((m) => {
      const title = m.getTitle();
      return title && title === placeId;
    });

    if (marker) {
      marker.setIcon(
        isSelected
          ? {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#3B82F6',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
            }
          : {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#9CA3AF',
              fillOpacity: 0.8,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
            }
      );
    }
  }

  /**
   * Display the generated route on the map
   */
  async showRoute(start: Location, waypoints: Location[]): Promise<void> {
    if (!this.map) {
      throw new Error('Map not initialized');
    }

    // Clear existing route if any
    if (this.directionsRenderer) {
      this.directionsRenderer.setMap(null);
    }

    // Create new renderer
    this.directionsRenderer = new google.maps.DirectionsRenderer({
      map: this.map,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#3B82F6',
        strokeWeight: 4,
        strokeOpacity: 0.8,
      },
    });

    // Build the route through the Directions API
    const directionsService = new google.maps.DirectionsService();

    // Convert waypoints to DirectionsWaypoint format
    const googleWaypoints = waypoints.slice(0, -1).map(wp => ({
      location: wp,
      stopover: true,
    }));

    const request: google.maps.DirectionsRequest = {
      origin: start,
      destination: waypoints[waypoints.length - 1] || start,
      waypoints: googleWaypoints,
      travelMode: google.maps.TravelMode.WALKING,
    };

    try {
      const result = await directionsService.route(request);
      this.directionsRenderer.setDirections(result);

      // Clear place markers as route has its own markers
      this.clearMarkers();
    } catch (error) {
      throw new Error('Failed to generate route directions');
    }
  }

  /**
   * Create classic Autocomplete widget for an input element
   * Uses the legacy Places API which works with HTTP referrer restrictions
   */
  createPlaceAutocomplete(
    inputContainer: HTMLElement,
    onPlaceSelected?: (location: Location) => void
  ): google.maps.places.Autocomplete {
    // Create an input element
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter a location';
    input.className = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500';

    // Clear the container and add the input
    inputContainer.innerHTML = '';
    inputContainer.appendChild(input);

    // Create the autocomplete widget
    const autocomplete = new google.maps.places.Autocomplete(input, {
      fields: ['geometry', 'name'],
      types: ['geocode', 'establishment'],
    });

    // Listen for place selection
    if (onPlaceSelected) {
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();

        if (place.geometry && place.geometry.location) {
          const location: Location = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };
          onPlaceSelected(location);
        }
      });
    }

    return autocomplete;
  }
}
