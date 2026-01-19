// Core data structures for the Running Maps application

export interface Location {
  lat: number;
  lng: number;
}

export interface Place {
  id: string;
  name: string;
  types: string[];
  location: Location;
  rating: number;
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
  location: Location;
  distance_miles: number;
  preferences?: Preferences;
}

export interface SuggestPlacesResponse {
  places: Place[];
}

export interface RouteRequest {
  start: Location;
  selected_places: Place[];
  preferences?: Preferences;
}

export interface RouteResponse {
  distance_miles: number;
  optimized_order: Place[];
  google_maps_url: string;
  estimated_time_minutes: number;
}

export interface AppState {
  location: Location | null;
  distance: number;
  preferences: Preferences;
  suggestedPlaces: Place[];
  selectedPlaceIds: string[];
  generatedRoute: RouteResponse | null;
}
