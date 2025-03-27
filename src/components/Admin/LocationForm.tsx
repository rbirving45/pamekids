import React from 'react';
import { ActivityType } from '../../types/location';
import { ACTIVITY_CATEGORIES } from '../../utils/metadata';

// Activity type options for dropdowns - using central metadata.ts as source of truth
const activityTypes: { value: ActivityType; label: string }[] = Object.entries(ACTIVITY_CATEGORIES).map(
  ([value, data]) => ({
    value: value as ActivityType,
    label: data.name
  })
);

// Form field interface
export interface LocationFormData {
  id: string;
  name: string;
  primaryType: ActivityType;
  types: ActivityType[];
  coordinates: {
    lat: number;
    lng: number;
  };
  address: string;
  ageRange: {
    min: number;
    max: number;
  };
  description: string;
  proTips?: string;
  priceRange?: string;
  contact: {
    phone?: string;
    email?: string;
    website?: string;
  };
  openingHours: Record<string, string>;
  placeData?: any; // Using any to avoid strict typing issues across components
}

// Define props for the shared component
interface LocationFormProps {
  formData: LocationFormData;
  onChange: (data: LocationFormData) => void;
  isProcessing: boolean;
}

const LocationForm: React.FC<LocationFormProps> = ({
  formData,
  onChange,
  isProcessing
}) => {
  
  // Helper function to handle form field changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    // Handle nested properties
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      
      // Handle contact fields
      if (parent === 'contact') {
        onChange({
          ...formData,
          contact: {
            ...formData.contact,
            [child]: value
          }
        });
      }
      // Handle other nested properties as needed
    } else {
      // Handle regular properties
      onChange({
        ...formData,
        [name]: value
      });
    }
  };

  // Handle age range changes
  const handleAgeRangeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const ageValue = parseInt(value, 10) || 0;
    
    onChange({
      ...formData,
      ageRange: {
        ...formData.ageRange,
        [name === 'minAge' ? 'min' : 'max']: ageValue
      }
    });
  };

  // Handle primary type change
  const handlePrimaryTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPrimaryType = e.target.value as ActivityType;
    
    // Ensure the primary type is included in the types array
    let newTypes = [...formData.types];
    if (!newTypes.includes(newPrimaryType)) {
      newTypes.push(newPrimaryType);
    }
    
    onChange({
      ...formData,
      primaryType: newPrimaryType,
      types: newTypes
    });
  };

  // Handle additional types changes
  const handleTypeCheckboxChange = (type: ActivityType, checked: boolean) => {
    let newTypes = [...formData.types];
    
    if (checked) {
      // Add the type if not already included
      if (!newTypes.includes(type)) {
        newTypes.push(type);
      }
    } else {
      // Don't allow removing the primary type
      if (type !== formData.primaryType) {
        newTypes = newTypes.filter(t => t !== type);
      }
    }
    
    onChange({
      ...formData,
      types: newTypes
    });
  };

  // Days of the week for opening hours
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Handle opening hours changes
  const handleOpeningHoursChange = (day: string, value: string) => {
    onChange({
      ...formData,
      openingHours: {
        ...formData.openingHours,
        [day]: value
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Google Places Data Summary - Read-only confirmation */}
      {formData.placeData && (
        <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Google Places Data Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-blue-600 font-medium">Coordinates</p>
              <p className="text-gray-700">
                {formData.coordinates.lat.toFixed(6)}, {formData.coordinates.lng.toFixed(6)}
              </p>
            </div>
            
            <div>
              <p className="text-blue-600 font-medium">Photos</p>
              <p className="text-gray-700">
                {formData.placeData?.photoUrls?.length || 0} available
              </p>
            </div>
            
            <div>
              <p className="text-blue-600 font-medium">Rating</p>
              <p className="text-gray-700">
                {formData.placeData?.rating ?
                  `${formData.placeData.rating} ★` :
                  'Not available'}
              </p>
            </div>
            
            <div>
              <p className="text-blue-600 font-medium">Review Count</p>
              <p className="text-gray-700">
                {formData.placeData?.userRatingsTotal || 'Not available'}
              </p>
            </div>
            
            <div>
              <p className="text-blue-600 font-medium">Opening Hours</p>
              <p className="text-gray-700">
                {Object.keys(formData.openingHours).length > 0 ?
                  `${Object.keys(formData.openingHours).length} days imported` :
                  'Not available'}
              </p>
            </div>
            
            <div>
              <p className="text-blue-600 font-medium">Contact</p>
              <p className="text-gray-700">
                {formData.contact.phone || formData.contact.website ?
                  `${formData.contact.phone ? '☎ ' : ''}${formData.contact.website ? '🌐 ' : ''}Imported` :
                  'Not available'}
              </p>
            </div>
            
            <div>
              <p className="text-blue-600 font-medium">Address</p>
              <p className="text-gray-700 truncate">
                {formData.address || 'Not available'}
              </p>
            </div>
            
            <div>
              <p className="text-blue-600 font-medium">Updated</p>
              <p className="text-gray-700">
                {formData.placeData?.last_fetched ?
                  new Date(formData.placeData.last_fetched).toLocaleString() :
                  'Just now'}
              </p>
            </div>
          </div>
          
          <p className="mt-3 text-xs text-blue-600 italic">
            This data was automatically imported from Google Places API and will be stored with your location.
          </p>
        </div>
      )}
      
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            disabled={isProcessing}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Primary Activity Type
          </label>
          <select
            value={formData.primaryType}
            onChange={handlePrimaryTypeChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            disabled={isProcessing}
          >
            {activityTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Additional Types */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Additional Activity Types
        </label>
        <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {activityTypes.map(type => (
            <label key={type.value} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.types.includes(type.value)}
                onChange={(e) => handleTypeCheckboxChange(type.value, e.target.checked)}
                disabled={isProcessing || type.value === formData.primaryType}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm">{type.label}</span>
            </label>
          ))}
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
          value={formData.address}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          disabled={isProcessing}
        />
      </div>
      
      {/* Age Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Age
          </label>
          <select
            name="minAge"
            value={formData.ageRange.min}
            onChange={handleAgeRangeChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            disabled={isProcessing}
          >
            {Array.from({ length: 18 }, (_, i) => (
              <option key={i} value={i}>{i} years</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Maximum Age
          </label>
          <select
            name="maxAge"
            value={formData.ageRange.max}
            onChange={handleAgeRangeChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            disabled={isProcessing}
          >
            {Array.from({ length: 18 - formData.ageRange.min }, (_, i) => i + formData.ageRange.min).map(age => (
              <option key={age} value={age}>{age} years</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          disabled={isProcessing}
        />
      </div>

      {/* Pro Tips */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Pro Tips
        </label>
        <textarea
          name="proTips"
          value={formData.proTips || ''}
          onChange={handleChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Add insider tips from people who've visited this location..."
          disabled={isProcessing}
        />
        <p className="mt-1 text-sm text-gray-500">
          Provide practical, insider tips that aren't in the main description. Separate multiple tips with bullet points.
        </p>
      </div>
      
      {/* Price Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Price Range
        </label>
        <input
          type="text"
          name="priceRange"
          value={formData.priceRange || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="e.g. €, €€, €€€"
          disabled={isProcessing}
        />
      </div>
      
      {/* Contact Information */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="text"
              name="contact.phone"
              value={formData.contact.phone || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isProcessing}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="contact.email"
              value={formData.contact.email || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isProcessing}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <input
              type="url"
              name="contact.website"
              value={formData.contact.website || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isProcessing}
            />
          </div>
        </div>
      </div>
      
      {/* Opening Hours */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Opening Hours</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {daysOfWeek.map(day => (
            <div key={day}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {day}
              </label>
              <input
                type="text"
                value={formData.openingHours[day] || ''}
                onChange={(e) => handleOpeningHoursChange(day, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g. 9:00 AM - 5:00 PM or Closed"
                disabled={isProcessing}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LocationForm;