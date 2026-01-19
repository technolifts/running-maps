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
   * Get autocomplete instance for location input
   */
  getAutocomplete(
    input: HTMLInputElement,
    onPlaceChanged?: (location: Location) => void
  ): google.maps.places.Autocomplete {
    const autocomplete = new google.maps.places.Autocomplete(input, {
      types: ['geocode'],
      fields: ['geometry', 'name'],
    });

    if (onPlaceChanged) {
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location) {
          const location = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };
          onPlaceChanged(location);
        }
      });
    }

    return autocomplete;
  }
}
