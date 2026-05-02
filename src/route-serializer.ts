import type { Location, Place, Preferences } from './types';

export interface RouteState {
  location: Location;
  distanceMiles: number;
  preferences: Preferences;
  selectedPlaceIds: string[];
  places: Place[];
}

export function encodeRoute(state: RouteState): string {
  const compact = {
    l: state.location,
    d: state.distanceMiles,
    p: state.preferences,
    s: state.selectedPlaceIds,
    pl: state.places.map(p => ({
      i: p.id,
      n: p.name,
      t: p.types,
      lo: p.location,
      r: p.rating,
      ds: p.distance_from_start,
    })),
  };
  return btoa(encodeURIComponent(JSON.stringify(compact)));
}

export function decodeRoute(param: string): RouteState | null {
  try {
    const json = decodeURIComponent(atob(param));
    const compact = JSON.parse(json);
    return {
      location: compact.l,
      distanceMiles: compact.d,
      preferences: compact.p || {},
      selectedPlaceIds: compact.s || [],
      places: (compact.pl || []).map((p: any) => ({
        id: p.i,
        name: p.n,
        types: p.t,
        location: p.lo,
        rating: p.r,
        distance_from_start: p.ds,
        photo_url: undefined,
      })),
    };
  } catch {
    return null;
  }
}
