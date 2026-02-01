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

  private getCategoryForPlace(place: Place): { label: string; color: string } {
    const primaryType = place.types[0] || 'place';
    const typeLabel = primaryType.replace(/_/g, ' ');

    const categoryColors: Record<string, string> = {
      park: '#10B981',
      museum: '#8B5CF6',
      restaurant: '#F59E0B',
      cafe: '#F59E0B',
      tourist_attraction: '#06B6D4',
      art_gallery: '#8B5CF6',
    };

    return {
      label: typeLabel,
      color: categoryColors[primaryType] || '#9CA3AF',
    };
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
      const category = this.getCategoryForPlace(place);

      const marker = new google.maps.Marker({
        position: place.location,
        map: this.map!,
        title: place.id,
        animation: google.maps.Animation.DROP,
        cursor: 'pointer',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 10 : 8,
          fillColor: isSelected ? '#3B82F6' : category.color,
          fillOpacity: isSelected ? 1 : 0.8,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });

      // Info window on hover
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-2">
            <p class="font-semibold text-gray-900">${place.name}</p>
            <p class="text-sm text-gray-600 capitalize">${category.label}</p>
            <p class="text-xs text-gray-500">${place.distance_from_start.toFixed(1)} mi away</p>
          </div>
        `
      });

      marker.addListener('mouseover', () => {
        infoWindow.open(this.map, marker);
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 12 : 10,
          fillColor: isSelected ? '#3B82F6' : category.color,
          fillOpacity: isSelected ? 1 : 0.8,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        });
      });

      marker.addListener('mouseout', () => {
        infoWindow.close();
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 10 : 8,
          fillColor: isSelected ? '#3B82F6' : category.color,
          fillOpacity: isSelected ? 1 : 0.8,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        });
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
    input.placeholder = 'Search for a city or address...';
    input.className = 'w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200';

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
