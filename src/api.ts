// API client functions for communicating with backend serverless functions

import type {
  SuggestPlacesRequest,
  SuggestPlacesResponse,
  RouteRequest,
  RouteResponse,
} from './types';

export async function suggestPlaces(
  params: SuggestPlacesRequest
): Promise<SuggestPlacesResponse> {
  const response = await fetch('/api/suggest-places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch places');
  }

  return response.json();
}

export async function generateRoute(
  params: RouteRequest
): Promise<RouteResponse> {
  const response = await fetch('/api/generate-route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Failed to generate route');
  }

  return response.json();
}
