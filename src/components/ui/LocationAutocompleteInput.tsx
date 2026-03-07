'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { loadGoogleMaps, isGoogleMapsLoaded } from '@/lib/google-maps';
import { cn } from '@/lib/utils';

export interface LocationData {
  address: string;
  lat?: number;
  lng?: number;
}

interface LocationAutocompleteInputProps extends Omit<React.ComponentProps<'input'>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected?: (place: LocationData) => void;
  types?: string[]; // e.g., ['(cities)'], ['(regions)'], ['address']
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function LocationAutocompleteInput({
  value,
  onChange,
  onPlaceSelected,
  types = ['(cities)'],
  placeholder = 'Enter location',
  className,
  disabled = false,
  ...props
}: LocationAutocompleteInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const autocompleteRef = React.useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(false);

  // Load Google Maps API
  React.useEffect(() => {
    if (isGoogleMapsLoaded()) {
      setIsLoading(false);
      return;
    }

    loadGoogleMaps()
      .then(() => {
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load Google Maps:', error);
        setLoadError(true);
        setIsLoading(false);
      });
  }, []);

  // Initialize autocomplete when Google Maps is loaded
  React.useEffect(() => {
    if (isLoading || loadError || !inputRef.current || disabled) {
      return;
    }

    if (!window.google?.maps?.places?.Autocomplete) {
      return;
    }

    try {
      // Create autocomplete instance
      const autocompleteInstance = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types,
          fields: ['formatted_address', 'geometry', 'name'],
        }
      );

      autocompleteRef.current = autocompleteInstance;

      // Listen for place selection
      autocompleteInstance.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();

        if (place?.formatted_address) {
          const locationData: LocationData = {
            address: place.formatted_address,
            lat: place.geometry?.location?.lat(),
            lng: place.geometry?.location?.lng(),
          };

          // Update value
          onChange(place.formatted_address);

          // Notify parent component if callback provided
          if (onPlaceSelected) {
            onPlaceSelected(locationData);
          }
        }
      });
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
      setLoadError(true);
    }

    // Cleanup on unmount
    return () => {
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
      autocompleteRef.current = null;
    };
  }, [isLoading, loadError, disabled, types, onChange, onPlaceSelected]);

  // Handle manual input changes (typing)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      value={value}
      onChange={handleInputChange}
      placeholder={isLoading ? 'Loading...' : placeholder}
      className={cn(className)}
      disabled={disabled || isLoading}
      {...props}
    />
  );
}

export default LocationAutocompleteInput;
