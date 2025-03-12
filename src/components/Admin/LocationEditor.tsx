import React, { useState, useEffect } from 'react';
import { getLocationById, updateLocation } from '../../utils/firebase-service';
import { Location, ActivityType } from '../../types/location';

interface LocationEditorProps {
  locationId: string;
  onClose: () => void;
  onSaved: () => void;
}

const activityTypes: { value: ActivityType; label: string }[] = [
  { value: 'indoor-play', label: 'Indoor Play' },
  { value: 'outdoor-play', label: 'Outdoor Play' },
  { value: 'sports', label: 'Sports' },
  { value: 'arts', label: 'Arts' },
  { value: 'music', label: 'Music' },
  { value: 'education', label: 'Education' },
  { value: 'entertainment', label: 'Entertainment' }
];

const LocationEditor: React.FC<LocationEditorProps> = ({ locationId, onClose, onSaved }) => {
  const [location, setLocation] = useState<Location | null>(null);
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
        
        setLocation(locationData);
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    if (!location) return;

    const { name, value } = e.target;
    
    // Handle nested properties
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      
      // Type-safe approach to handle nested properties
      const parentKey = parent as keyof Location;
      const parentValue = location[parentKey];
      
      // Ensure the parent property exists and is an object before spreading
      if (parentValue && typeof parentValue === 'object' && !Array.isArray(parentValue)) {
        setLocation({
          ...location,
          [parent]: {
            ...parentValue,
            [child]: value
          }
        });
      }
    } else {
      setLocation({
        ...location,
        [name]: value
      });
    }
  };

  const handleAgeRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!location) return;
    
    const { name, value } = e.target;
    const ageValue = parseInt(value, 10) || 0;
    
    setLocation({
      ...location,
      ageRange: {
        ...location.ageRange,
        [name === 'minAge' ? 'min' : 'max']: ageValue
      }
    });
  };

  const handlePrimaryTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!location) return;
    
    const newPrimaryType = e.target.value as ActivityType;
    
    setLocation({
      ...location,
      primaryType: newPrimaryType,
      types: [newPrimaryType]
    });
  };

  const handleSave = async () => {
    if (!location) return;

    try {
      setIsSaving(true);
      setError(null);
      
      await updateLocation(location.id, location);
      
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
      
      <div className="space-y-4">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              name="name"
              value={location.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Activity Type
            </label>
            <select
              value={location.primaryType}
              onChange={handlePrimaryTypeChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              {activityTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <input
            type="text"
            name="address"
            value={location.address}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        {/* Age Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Age
            </label>
            <input
              type="number"
              name="minAge"
              value={location.ageRange.min}
              onChange={handleAgeRangeChange}
              min="0"
              max="18"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maximum Age
            </label>
            <input
              type="number"
              name="maxAge"
              value={location.ageRange.max}
              onChange={handleAgeRangeChange}
              min="0"
              max="18"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        
        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={location.description}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price Range
          </label>
          <input
            type="text"
            name="priceRange"
            value={location.priceRange}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g. $, $$, $$$"
          />
        </div>
        
        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="text"
              name="contact.phone"
              value={location.contact.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="contact.email"
              value={location.contact.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <input
              type="url"
              name="contact.website"
              value={location.contact.website || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>
      
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