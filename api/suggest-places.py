from http.server import BaseHTTPRequestHandler
import json
import os
import googlemaps
import math
from urllib.parse import parse_qs

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Parse request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            params = json.loads(post_data.decode('utf-8'))

            # Extract parameters
            location = params.get('location', {})
            lat = float(location.get('lat'))
            lng = float(location.get('lng'))
            distance_miles = float(params.get('distance_miles', 3))
            preferences = params.get('preferences', {})

            # Initialize Google Maps client
            api_key = os.environ.get('GOOGLE_PLACES_API_KEY')
            if not api_key:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'error': 'Google Places API key not configured'
                }).encode())
                return

            gmaps = googlemaps.Client(key=api_key)

            # Convert miles to meters for Google Places API
            radius_meters = int(distance_miles * 0.5 * 1609.34)

            # Define place types to search for
            place_types = [
                ['tourist_attraction', 'museum', 'park', 'landmark'],
                ['point_of_interest', 'natural_feature'],
            ]

            if preferences.get('water_stops'):
                place_types.append(['cafe', 'restaurant'])

            # Collect all places
            all_places = []
            seen_place_ids = set()

            for type_group in place_types:
                for place_type in type_group:
                    try:
                        results = gmaps.places_nearby(
                            location=(lat, lng),
                            radius=radius_meters,
                            type=place_type
                        )

                        for place in results.get('results', []):
                            place_id = place.get('place_id')
                            if place_id and place_id not in seen_place_ids:
                                seen_place_ids.add(place_id)
                                all_places.append(place)
                    except Exception as e:
                        # Continue even if one type fails
                        print(f"Error fetching {place_type}: {str(e)}")
                        continue

            # Score and rank places
            scored_places = []
            for place in all_places:
                score = calculate_score(place, preferences, lat, lng, radius_meters)

                # Calculate distance from start point
                place_lat = place['geometry']['location']['lat']
                place_lng = place['geometry']['location']['lng']
                distance = calculate_distance(lat, lng, place_lat, place_lng)

                scored_places.append({
                    'id': place.get('place_id'),
                    'name': place.get('name'),
                    'types': place.get('types', []),
                    'rating': place.get('rating'),
                    'user_ratings_total': place.get('user_ratings_total', 0),
                    'vicinity': place.get('vicinity'),
                    'location': {
                        'lat': place_lat,
                        'lng': place_lng
                    },
                    'distance_from_start': round(distance, 2),
                    'score': score,
                    'photo_reference': place.get('photos', [{}])[0].get('photo_reference') if place.get('photos') else None
                })

            # Sort by score (descending) and return top 15
            scored_places.sort(key=lambda x: x['score'], reverse=True)
            top_places = scored_places[:15]

            # Build photo URLs for places with photos
            for place in top_places:
                if place['photo_reference']:
                    place['photo_url'] = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference={place['photo_reference']}&key={api_key}"
                else:
                    place['photo_url'] = None

            # Send response
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            self.wfile.write(json.dumps({
                'places': top_places,
                'total_found': len(all_places)
            }).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': str(e)
            }).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def calculate_score(place, preferences, start_lat, start_lng, max_radius):
    """Calculate score for a place based on type and preferences"""
    rating = place.get('rating', 3.0)
    user_ratings_total = place.get('user_ratings_total', 1)
    types = place.get('types', [])

    # Determine popularity tier based on review count
    if user_ratings_total >= 10000:
        popularity_multiplier = 5.0      # Mega-popular (Central Park, Times Square)
    elif user_ratings_total >= 2000:
        popularity_multiplier = 3.0      # Very popular
    elif user_ratings_total >= 500:
        popularity_multiplier = 2.0      # Popular
    elif user_ratings_total >= 100:
        popularity_multiplier = 1.3      # Moderate
    else:
        popularity_multiplier = 1.0      # Niche

    # Base score from rating and popularity
    score = rating * popularity_multiplier

    # Type bonuses (MULTIPLICATIVE)
    if any(t in types for t in ['tourist_attraction', 'landmark', 'monument']):
        score *= 3.0
    if 'park' in types:
        score *= 1.2
    if any(t in types for t in ['natural_feature', 'scenic_point']):
        score *= 1.2
    if any(t in types for t in ['cafe', 'restaurant']):
        score *= 0.5

    # Apply user preferences
    if preferences.get('prefer_parks') and 'park' in types:
        score *= 1.5
    if preferences.get('urban_explorer') and any(t in types for t in ['museum', 'art_gallery', 'historical']):
        score *= 1.5

    # Distance penalty (prefer closer to start)
    location = place.get('geometry', {}).get('location', {})
    distance = calculate_distance(start_lat, start_lng, location.get('lat'), location.get('lng'))
    distance_meters = distance * 1609.34
    if max_radius > 0:
        distance_factor = 1 - (distance_meters / max_radius) * 0.3
        score *= max(distance_factor, 0.5)

    return score

def calculate_distance(lat1, lng1, lat2, lng2):
    """Calculate distance between two points using Haversine formula (in miles)"""
    R = 3959  # Earth's radius in miles

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)

    a = math.sin(delta_lat / 2) ** 2 + \
        math.cos(lat1_rad) * math.cos(lat2_rad) * \
        math.sin(delta_lng / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))

    return R * c
