import React, { useState, useEffect } from 'react';
import { getLocationById, updateLocation, getLocations } from '../../utils/firebase-service';
import LocationForm, { LocationFormData } from './LocationForm';

interface LocationEditorProps {
  locationId: string;
  onClose: () => void;
  onSaved: () => void;
}

const LocationEditor: React.FC<LocationEditorProps> = ({ locationId, onClose, onSaved }) => {
  const [location, setLocation] = useState<LocationFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocation = async () => {
      if (!locationId) {
        setError('No location ID provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const locationData = await getLocationById(locationId);
        
        if (!locationData) {
          throw new Error(`Location with ID ${locationId} not found`);
        }
        
        // Convert the fetched location into form-friendly format
        const formData: LocationFormData = {
          id: locationData.id,
          name: locationData.name,
          coordinates: locationData.coordinates,
          types: locationData.types || [],
          primaryType: locationData.primaryType || 'entertainment',
          description: locationData.description,
          address: locationData.address,
          ageRange: locationData.ageRange,
          priceRange: locationData.priceRange || '',
          openingHours: locationData.openingHours || {},
          contact: {
            phone: locationData.contact?.phone || '',
            email: locationData.contact?.email || '',
            website: locationData.contact?.website || ''
          },
          proTips: locationData.proTips || ''
        };
        
        setLocation(formData);
        setError(null);
      } catch (err) {
        console.error('Error fetching location:', err);
        setError('Failed to load location details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocation();
  }, [locationId]);

  const handleFormChange = (updatedData: LocationFormData) => {
    setLocation(updatedData);
  };

  const handleSave = async () => {
    if (!location) return;

    try {
      setIsSaving(true);
      setError(null);
      
      // Deep clean function to handle complex nested objects
      const deepCleanUndefined = (obj: any): any => {
        // Return non-objects as is (includes null, which is valid for Firestore)
        if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
          return obj;
        }
        
        // Clean each property in the object
        const result: Record<string, any> = {};
        Object.entries(obj).forEach(([key, value]) => {
          // Skip undefined values completely
          if (value === undefined) return;
          
          // Recursively clean objects
          if (value !== null && typeof value === 'object') {
            const cleanedValue = deepCleanUndefined(value);
            // Only add non-empty objects
            if (Array.isArray(cleanedValue) || Object.keys(cleanedValue).length > 0) {
              result[key] = cleanedValue;
            }
          } else {
            // Add primitive values directly
            result[key] = value;
          }
        });
        
        return result;
      };
      
      // Create a cleaned version of the location for saving
      const locationToSave = deepCleanUndefined(location);
      
      await updateLocation(location.id, locationToSave);
      
      // Force a refresh to ensure we get updated data
      await getLocations(true);
      
      onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving location:', err);
      setError(err instanceof Error ? err.message : 'Failed to save location');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="ml-2">Loading location details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
          {error}
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          Close
        </button>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Location not found.</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 max-h-[80vh] overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">Edit Location: {location.name}</h2>
      
      <LocationForm
        formData={location}
        onChange={handleFormChange}
        isProcessing={isSaving}
      />
      
      <div className="flex justify-end mt-6 space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default LocationEditor;