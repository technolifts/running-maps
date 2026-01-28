/**
 * Dynamically load the Google Maps JavaScript API with async loading pattern
 * @returns Promise that resolves when the API is ready
 */
export function loadGoogleMapsAPI(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof google !== 'undefined' && google.maps) {
      resolve();
      return;
    }

    // Get API key from environment
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not defined'));
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    // Handle successful load
    script.onload = () => {
      resolve();
    };

    // Handle errors
    script.onerror = () => {
      reject(new Error('Failed to load Google Maps API'));
    };

    // Add to document
    document.head.appendChild(script);
  });
}
