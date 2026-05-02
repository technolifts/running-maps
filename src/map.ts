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

  private getCategoryForPlace(place: Place): { label: string; color: string; shape: google.maps.SymbolPath; scale: number } {
    const primaryType = place.types[0] || 'place';
    const typeLabel = primaryType.replace(/_/g, ' ');

    const typeConfig: Record<string, { color: string; shape: google.maps.SymbolPath; scale: number }> = {
      park: { color: '#009E73', shape: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 6 },
      hiking_area: { color: '#009E73', shape: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 6 },
      nature_preserve: { color: '#009E73', shape: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 6 },
      museum: { color: '#CC79A7', shape: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW, scale: 6 },
      art_gallery: { color: '#CC79A7', shape: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW, scale: 6 },
      restaurant: { color: '#F0E442', shape: google.maps.SymbolPath.CIRCLE, scale: 7 },
      cafe: { color: '#F0E442', shape: google.maps.SymbolPath.CIRCLE, scale: 7 },
      tourist_attraction: { color: '#E69F00', shape: google.maps.SymbolPath.CIRCLE, scale: 8 },
    };

    const config = typeConfig[primaryType] || { color: '#E69F00', shape: google.maps.SymbolPath.CIRCLE, scale: 8 };
    return { label: typeLabel, ...config };
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
          path: isSelected ? google.maps.SymbolPath.CIRCLE : category.shape,
          scale: isSelected ? 10 : category.scale,
          fillColor: isSelected ? '#0066CC' : category.color,
          fillOpacity: isSelected ? 1 : 0.85,
          strokeColor: '#FFFFFF',
          strokeWeight: isSelected ? 3 : 2,
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
          path: isSelected ? google.maps.SymbolPath.CIRCLE : category.shape,
          scale: isSelected ? 12 : category.scale + 2,
          fillColor: isSelected ? '#0066CC' : category.color,
          fillOpacity: isSelected ? 1 : 0.85,
          strokeColor: '#FFFFFF',
          strokeWeight: isSelected ? 3 : 2,
        });
      });

      marker.addListener('mouseout', () => {
        infoWindow.close();
        marker.setIcon({
          path: isSelected ? google.maps.SymbolPath.CIRCLE : category.shape,
          scale: isSelected ? 10 : category.scale,
          fillColor: isSelected ? '#0066CC' : category.color,
          fillOpacity: isSelected ? 1 : 0.85,
          strokeColor: '#FFFFFF',
          strokeWeight: isSelected ? 3 : 2,
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
              fillColor: '#0066CC',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 3,
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

  createPlaceAutocomplete(
    inputContainer: HTMLElement,
    onPlaceSelected?: (location: Location) => void
  ): void {
    inputContainer.innerHTML = '';

    const placeAutocomplete = new google.maps.places.PlaceAutocompleteElement({
      types: ['geocode', 'establishment'],
    } as any);

    (placeAutocomplete as HTMLElement).style.width = '100%';
    inputContainer.appendChild(placeAutocomplete as unknown as HTMLElement);

    if (onPlaceSelected) {
      placeAutocomplete.addEventListener('gmp-placeselect', async (event: Event) => {
        const place = (event as any).place as google.maps.places.Place;
        await place.fetchFields({ fields: ['location', 'displayName'] });

        if (place.location) {
          onPlaceSelected({
            lat: place.location.lat(),
            lng: place.location.lng(),
          });
        }
      });
    }
  }
}
