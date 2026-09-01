/**
 * Google Maps API Loader - Singleton pattern
 * Ensures Google Maps script is loaded only once across the application
 *
 * CONSOLE WARNINGS - INTENTIONAL AND EXPECTED:
 *
 * 1. "Google Maps JavaScript API has been loaded directly without loading=async"
 *    - Adding &loading=async to the URL causes "Places library not available" errors
 *    - The async parameter breaks our loading detection mechanism
 *    - This is a performance suggestion, not a critical error
 *    - Accepting this warning to maintain functionality
 *
 * 2. "google.maps.places.Autocomplete is deprecated"
 *    - The old API continues to receive bug fixes for major regressions
 *    - At least 12 months notice before discontinuation (as of March 2025)
 *    - New PlaceAutocompleteElement API has unclear documentation
 *    - Previous migration attempts resulted in loading failures
 *    - This is a stable, production-ready implementation
 *
 * Migration Strategy:
 * - Continue using this stable implementation
 * - Monitor Google's migration documentation
 * - Plan migration when new API is proven stable in production
 * - Both warnings are acceptable trade-offs for reliability
 */

// Type declarations for Google Maps
declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          Autocomplete: any;
          PlacesService: any;
        };
        event?: {
          clearInstanceListeners: (instance: any) => void;
        };
      };
    };
  }
}

let googleMapsPromise: Promise<void> | null = null;
let isLoaded = false;

/**
 * Loads the Google Maps JavaScript API
 * Uses singleton pattern to ensure script is only loaded once
 * @returns Promise that resolves when Google Maps is ready
 */
export async function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve();
  }

  // Check if already loaded
  if (isLoaded && window.google?.maps?.places) {
    return Promise.resolve();
  }

  // Return existing promise if already loading
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    // Double check if already loaded (race condition protection)
    if (window.google?.maps?.places) {
      isLoaded = true;
      resolve();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Script exists, wait for it to load
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places) {
          isLoaded = true;
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (window.google?.maps?.places) {
          isLoaded = true;
          resolve();
        } else {
          reject(new Error('Google Maps failed to load within timeout'));
        }
      }, 10000);
      return;
    }

    // Load the Google Maps script - SIMPLE AND STABLE
    const script = document.createElement('script');
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      reject(new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set. Please add it to your environment variables.'));
      return;
    }
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      // Simple check - if places is available, we're good
      if (window.google?.maps?.places) {
        isLoaded = true;
        resolve();
      } else {
        reject(new Error('Google Maps loaded but places library not available'));
      }
    };

    script.onerror = () => {
      reject(new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

/**
 * Checks if Google Maps API is already loaded
 * @returns boolean indicating if Google Maps is ready to use
 */
export function isGoogleMapsLoaded(): boolean {
  return typeof window !== 'undefined' && isLoaded && !!window.google?.maps?.places;
}

/**
 * Resets the loader state (useful for testing)
 */
export function resetGoogleMapsLoader(): void {
  googleMapsPromise = null;
  isLoaded = false;
}
