import os
import json
from http.server import BaseHTTPRequestHandler
import googlemaps

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Parse request body
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            start = data.get('start')
            selected_places = data.get('selected_places', [])
            preferences = data.get('preferences', {})

            if not start or not selected_places:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Missing start or selected_places'}).encode())
                return

            # Initialize Google Maps client
            api_key = os.environ.get('GOOGLE_DIRECTIONS_API_KEY')
            if not api_key:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'API key not configured'}).encode())
                return

            gmaps = googlemaps.Client(key=api_key)

            # Build origin and destination (loop back to start)
            origin = f"{start['lat']},{start['lng']}"
            destination = origin

            # Build waypoints
            waypoints = []
            for place in selected_places:
                loc = place.get('location', {})
                waypoints.append(f"{loc['lat']},{loc['lng']}")

            # Handle single place (out-and-back)
            if len(selected_places) == 1:
                # For out-and-back, just go to the place and return
                waypoints = []
                loc = selected_places[0].get('location', {})
                destination = f"{loc['lat']},{loc['lng']}"

            # Call Google Directions API
            directions_result = gmaps.directions(
                origin=origin,
                destination=destination,
                waypoints=waypoints if waypoints else None,
                optimize_waypoints=True if len(waypoints) > 1 else False,
                mode='walking',
                avoid='highways',
                units='imperial'
            )

            if not directions_result:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'No route found'}).encode())
                return

            route = directions_result[0]

            # Calculate total distance
            total_distance_meters = sum(
                leg['distance']['value'] for leg in route['legs']
            )
            distance_miles = round(total_distance_meters / 1609.34, 1)

            # Get optimized waypoint order
            waypoint_order = route.get('waypoint_order', list(range(len(selected_places))))

            # Build ordered places list
            if len(selected_places) == 1:
                ordered_places = selected_places
            else:
                ordered_places = [selected_places[i] for i in waypoint_order]

            # Build Google Maps URL
            if len(selected_places) == 1:
                # Out-and-back route
                maps_url = (
                    f"https://www.google.com/maps/dir/"
                    f"?api=1"
                    f"&origin={origin}"
                    f"&destination={origin}"
                    f"&waypoints={destination}"
                    f"&travelmode=walking"
                )
            else:
                # Loop route
                waypoint_str = '|'.join([f"{p['location']['lat']},{p['location']['lng']}" for p in ordered_places])
                maps_url = (
                    f"https://www.google.com/maps/dir/"
                    f"?api=1"
                    f"&origin={origin}"
                    f"&destination={origin}"
                    f"&waypoints={waypoint_str}"
                    f"&travelmode=walking"
                )

            # Calculate estimated time (15 min/mile)
            estimated_time_minutes = int(distance_miles * 15)

            # Build response
            response = {
                'distance_miles': distance_miles,
                'optimized_order': ordered_places,
                'google_maps_url': maps_url,
                'estimated_time_minutes': estimated_time_minutes
            }

            # Send response
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())
