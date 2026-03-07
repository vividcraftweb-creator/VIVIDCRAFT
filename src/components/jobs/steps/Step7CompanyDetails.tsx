'use client';

import { useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Building2, Globe, MapPin } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from '@react-google-maps/api';
import type { JobFormData } from '../CreateJobWizard';

const libraries: ("places")[] = ["places"];

interface Props {
  formData: JobFormData;
  updateFormData: (data: Partial<JobFormData>) => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '12px',
};

const defaultCenter = {
  lat: 40.7128,
  lng: -74.0060,
};

export default function Step7CompanyDetails({ formData, updateFormData }: Props) {
  const [mapCenter, setMapCenter] = useState(
    formData.company_lat && formData.company_lng
      ? { lat: formData.company_lat, lng: formData.company_lng }
      : defaultCenter
  );
  const [markerPosition, setMarkerPosition] = useState(
    formData.company_lat && formData.company_lng
      ? { lat: formData.company_lat, lng: formData.company_lng }
      : null
  );
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: libraries,
  });

  const onMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setMarkerPosition({ lat, lng });
        updateFormData({
          company_lat: lat,
          company_lng: lng,
        });

        // Reverse geocode to get address
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            updateFormData({ company_location: results[0].formatted_address });
          }
        });
      }
    },
    [updateFormData]
  );

  const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setMapCenter({ lat, lng });
        setMarkerPosition({ lat, lng });
        updateFormData({
          company_location: place.formatted_address || '',
          company_lat: lat,
          company_lng: lng,
        });
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Company Details</h2>
        <p className="text-muted-foreground">
          Add your business information to build trust with freelancers
        </p>
      </div>

      {/* Company Name */}
      <div className="space-y-2">
        <Label htmlFor="companyName" className="text-base font-medium flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Company Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="companyName"
          value={formData.company_name}
          onChange={(e) => updateFormData({ company_name: e.target.value })}
          placeholder="JobHorizons"
          className="glass-card"
        />
      </div>

      {/* Company Website */}
      <div className="space-y-2">
        <Label htmlFor="companyWebsite" className="text-base font-medium flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Company Website (Optional)
        </Label>
        <Input
          id="companyWebsite"
          type="url"
          value={formData.company_website || ''}
          onChange={(e) => updateFormData({ company_website: e.target.value })}
          placeholder="https://www.example.com"
          className="glass-card"
        />
      </div>

      {/* Location Search with Autocomplete */}
      <div className="space-y-2">
        <Label htmlFor="companyLocation" className="text-base font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Company Location <span className="text-destructive">*</span>
        </Label>
        {isLoaded ? (
          <Autocomplete
            onLoad={onLoad}
            onPlaceChanged={onPlaceChanged}
          >
            <Input
              id="companyLocation"
              value={formData.company_location}
              onChange={(e) => updateFormData({ company_location: e.target.value })}
              placeholder="Start typing an address..."
              className="glass-card"
            />
          </Autocomplete>
        ) : (
          <Input
            id="companyLocation"
            value={formData.company_location}
            onChange={(e) => updateFormData({ company_location: e.target.value })}
            placeholder="Loading autocomplete..."
            className="glass-card"
            disabled
          />
        )}
        <p className="text-xs text-muted-foreground">
          Start typing to see address suggestions, or click on the map to pin your exact location
        </p>
      </div>

      {/* Google Map */}
      {isLoaded && (
        <div className="space-y-2">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={12}
            onClick={onMapClick}
            options={{
              styles: [
                {
                  featureType: 'all',
                  elementType: 'geometry',
                  stylers: [{ color: '#1a1a2e' }],
                },
                {
                  featureType: 'all',
                  elementType: 'labels.text.fill',
                  stylers: [{ color: '#8b92ab' }],
                },
                {
                  featureType: 'all',
                  elementType: 'labels.text.stroke',
                  stylers: [{ color: '#1a1a2e' }],
                },
                {
                  featureType: 'road',
                  elementType: 'geometry',
                  stylers: [{ color: '#2a2a40' }],
                },
                {
                  featureType: 'water',
                  elementType: 'geometry',
                  stylers: [{ color: '#0f1419' }],
                },
              ],
            }}
          >
            {markerPosition && <Marker position={markerPosition} />}
          </GoogleMap>
        </div>
      )}

      {!isLoaded && (
        <div className="glass-card p-8 rounded-xl text-center">
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      )}
    </div>
  );
}
