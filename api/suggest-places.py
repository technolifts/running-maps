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
            lat = float(params.get('lat'))
            lng = float(params.get('lng'))
            distance_miles = float(params.get('distance_miles', 3))
            preferences = params.get('preferences', {})

            # Initialize Google Maps client
            api_key = os.environ.get('GOOGLE_MAPS_API_KEY')
            if not api_key:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'error': 'Google Maps API key not configured'
                }).encode())
                return

            gmaps = googlemaps.Client(key=api_key)

            # Convert miles to meters for Google Places API
            radius_meters = int(distance_miles * 1609.34)

            # Define place types to search for
            place_types = [
                'tourist_attraction',
                'park',
                'museum',
                'art_gallery',
                'cafe',
                'restaurant',
                'point_of_interest'
            ]

            # Collect all places
            all_places = []
            seen_place_ids = set()

            for place_type in place_types:
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
                score = calculate_score(place, preferences)

                # Calculate distance from start point
                place_lat = place['geometry']['location']['lat']
                place_lng = place['geometry']['location']['lng']
                distance = calculate_distance(lat, lng, place_lat, place_lng)

                scored_places.append({
                    'place_id': place.get('place_id'),
                    'name': place.get('name'),
                    'types': place.get('types', []),
                    'rating': place.get('rating'),
                    'user_ratings_total': place.get('user_ratings_total', 0),
                    'vicinity': place.get('vicinity'),
                    'location': {
                        'lat': place_lat,
                        'lng': place_lng
                    },
                    'distance_miles': round(distance, 2),
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

def calculate_score(place, preferences):
    """Calculate a score for a place based on ratings and preferences"""
    score = 0

    # Base score from rating
    rating = place.get('rating', 0)
    user_ratings_total = place.get('user_ratings_total', 0)

    if rating and user_ratings_total:
        # Weight by number of ratings (more ratings = more reliable)
        rating_weight = min(user_ratings_total / 100, 1.0)
        score += rating * rating_weight * 20

    # Bonus points for specific types
    types = place.get('types', [])
    type_bonuses = {
        'tourist_attraction': 15,
        'museum': 12,
        'art_gallery': 12,
        'park': 10,
        'point_of_interest': 5,
        'cafe': 8,
        'restaurant': 6
    }

    for place_type in types:
        if place_type in type_bonuses:
            score += type_bonuses[place_type]

    # Apply user preferences
    if preferences:
        if preferences.get('scenic') and any(t in types for t in ['park', 'natural_feature', 'tourist_attraction']):
            score *= 1.3
        if preferences.get('cultural') and any(t in types for t in ['museum', 'art_gallery', 'library']):
            score *= 1.3
        if preferences.get('food') and any(t in types for t in ['cafe', 'restaurant', 'bakery']):
            score *= 1.3

    return round(score, 2)

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
