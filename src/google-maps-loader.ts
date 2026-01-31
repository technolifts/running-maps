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

    // Create a unique callback name
    const callbackName = `initGoogleMaps_${Date.now()}`;

    // Set up the callback
    (window as any)[callbackName] = () => {
      delete (window as any)[callbackName];
      resolve();
    };

    // Create script element with callback
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;

    // Handle errors
    script.onerror = () => {
      delete (window as any)[callbackName];
      reject(new Error('Failed to load Google Maps API'));
    };

    // Add to document
    document.head.appendChild(script);
  });
}
