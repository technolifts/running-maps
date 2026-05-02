import type { RouteResponse, Location, Preferences } from './types';

export interface SavedRoute {
  id: string;
  locationName: string;
  location: Location;
  distanceMiles: number;
  preferences: Preferences;
  route: RouteResponse;
  savedAt: string; // ISO date string
  note?: string;
}

const STORAGE_KEY = 'running_maps_saved_routes';

export function getSavedRoutes(): SavedRoute[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRoute(entry: Omit<SavedRoute, 'id' | 'savedAt'>): SavedRoute {
  const routes = getSavedRoutes();
  const saved: SavedRoute = {
    ...entry,
    id: `route_${Date.now()}`,
    savedAt: new Date().toISOString(),
  };
  routes.unshift(saved);
  // Keep max 20 saved routes
  localStorage.setItem(STORAGE_KEY, JSON.stringify(routes.slice(0, 20)));
  return saved;
}

export function deleteRoute(id: string): void {
  const routes = getSavedRoutes().filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
}
