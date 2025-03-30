import React, { useState, useEffect } from 'react';
import { Location } from '../../types/location';
import { getLocations, updateLocation } from '../../utils/firebase-service';
import { Star } from 'lucide-react';
import SearchableDropdown from './SearchableDropdown';

const FeaturedLocationsManager: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [featuredLocations, setFeaturedLocations] = useState<(Location | null)[]>(Array(9).fill(null));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch all locations on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get all locations
        const allLocations = await getLocations();
        setLocations(allLocations);
        
        // Filter out featured locations and add them to slots
        const featured = allLocations
          .filter(loc => loc.featured === true)
          .slice(0, 9);
        
        // Create a new array with featured locations in the slots based on featuredPosition
        const newFeaturedLocations = Array(9).fill(null);
        
        // First place locations with defined featuredPosition in their correct slots
        featured.forEach(loc => {
          if (loc.featuredPosition !== null && loc.featuredPosition !== undefined
              && loc.featuredPosition >= 0 && loc.featuredPosition < 9) {
            newFeaturedLocations[loc.featuredPosition] = loc;
          }
        });
        
        // Then handle any featured locations without a position (backward compatibility)
        let nextAvailableSlot = 0;
        featured
          .filter(loc => loc.featuredPosition === null || loc.featuredPosition === undefined)
          .forEach(loc => {
            // Find the next empty slot
            while (nextAvailableSlot < 9 && newFeaturedLocations[nextAvailableSlot] !== null) {
              nextAvailableSlot++;
            }
            
            // Place the location in the available slot if there is one
            if (nextAvailableSlot < 9) {
              newFeaturedLocations[nextAvailableSlot] = loc;
              nextAvailableSlot++;
            }
          });
        
        setFeaturedLocations(newFeaturedLocations);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching locations:', err);
        setError('Failed to load locations. Please try again.');
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Handle selecting a location for a slot
  const handleLocationSelect = async (slotIndex: number, locationId: string | null) => {
    try {
      // Clear any previous messages
      setSuccessMessage(null);
      setError(null);
      
      console.log(`Slot ${slotIndex}: Changing to location ID ${locationId || 'null'}`);
      
      // First, create a copy of the current featured locations
      const updatedFeaturedLocations = [...featuredLocations];
      
      // If locationId is null, clear the slot
      if (locationId === null) {
        // If there was a location in this slot before, update its featured status and clear position
        if (updatedFeaturedLocations[slotIndex]) {
          const prevLocationId = updatedFeaturedLocations[slotIndex]?.id;
          
          if (prevLocationId) {
            console.log(`Clearing location ${prevLocationId} from slot ${slotIndex}`);
            
            // Check if the location is in any other slots
            const inOtherSlots = updatedFeaturedLocations.some(
              (loc, idx) => loc?.id === prevLocationId && idx !== slotIndex
            );
            
            if (inOtherSlots) {
              console.log(`Location ${prevLocationId} also exists in other slots, not changing featured status`);
            } else {
              console.log(`Updating location ${prevLocationId}: featured=false, featuredPosition=null`);
              // Only set featured: false if this location isn't in any other slot
              await updateLocation(prevLocationId, {
                featured: false,
                featuredPosition: null
              });
            }
          }
        }
        
        // Clear the slot
        updatedFeaturedLocations[slotIndex] = null;
      } else {
        // Find the selected location
        const selectedLocation = locations.find(loc => loc.id === locationId);
        
        if (!selectedLocation) {
          setError(`Location with ID ${locationId} not found.`);
          return;
        }
        
        // If there was a location in this slot before, update its featured status
        if (updatedFeaturedLocations[slotIndex]) {
          const prevLocationId = updatedFeaturedLocations[slotIndex]?.id;
          
          if (prevLocationId && prevLocationId !== locationId) {
            console.log(`Removing location ${prevLocationId} from slot ${slotIndex}`);
            
            // Check if the location is in any other slots
            const inOtherSlots = updatedFeaturedLocations.some(
              (loc, idx) => loc?.id === prevLocationId && idx !== slotIndex
            );
            
            if (inOtherSlots) {
              console.log(`Location ${prevLocationId} also exists in other slots, not changing featured status`);
            } else {
              console.log(`Updating location ${prevLocationId}: featured=false, featuredPosition=null`);
              // Only set featured: false if this location isn't in any other slot
              await updateLocation(prevLocationId, {
                featured: false,
                featuredPosition: null
              });
            }
          }
        }
        
        // Check if this location is already featured in another slot
        const existingSlotIndex = updatedFeaturedLocations.findIndex(
          loc => loc && loc.id === locationId
        );
        
        if (existingSlotIndex !== -1 && existingSlotIndex !== slotIndex) {
          console.log(`Location ${locationId} already in slot ${existingSlotIndex}, moving to slot ${slotIndex}`);
          // Clear the other slot
          updatedFeaturedLocations[existingSlotIndex] = null;
        }
        
        // Make a copy of the selected location to update in our UI
        const updatedLocation = { ...selectedLocation };
        updatedLocation.featuredPosition = slotIndex;
        
        console.log(`Updating location ${locationId}: featured=true, featuredPosition=${slotIndex}`);
        
        // Update the location's featured status and position in Firestore
        await updateLocation(locationId, {
          featured: true,
          featuredPosition: slotIndex
        });
        
        // Update the slot with the updated location
        updatedFeaturedLocations[slotIndex] = updatedLocation;
      }
      
      // Update state with the new arrangement
      setFeaturedLocations(updatedFeaturedLocations);
      setSuccessMessage('Featured locations updated successfully.');
      
      // Wait a moment then refresh the locations data to ensure we have the latest from Firestore
      setTimeout(async () => {
        try {
          // Force a refresh of locations data
          console.log('Refreshing locations data from Firestore');
          const refreshedLocations = await getLocations(true); // Force refresh
          setLocations(refreshedLocations);
          
          // Filter out featured locations and re-populate slots
          const featured = refreshedLocations
            .filter(loc => loc.featured === true);
            
          console.log('Refreshed featured locations:', featured);
          
          // Create a new array with featured locations in the slots based on featuredPosition
          const refreshedFeaturedLocations = Array(9).fill(null);
          
          // First place locations with defined featuredPosition in their correct slots
          featured.forEach(loc => {
            console.log(`Location ${loc.name} (${loc.id}): featuredPosition=${loc.featuredPosition}`);
            if (loc.featuredPosition !== null && loc.featuredPosition !== undefined
                && loc.featuredPosition >= 0 && loc.featuredPosition < 9) {
              refreshedFeaturedLocations[loc.featuredPosition] = loc;
            }
          });
          
          // Then handle any featured locations without a position (backward compatibility)
          let nextAvailableSlot = 0;
          featured
            .filter(loc => loc.featuredPosition === null || loc.featuredPosition === undefined)
            .forEach(loc => {
              // Find the next empty slot
              while (nextAvailableSlot < 9 && refreshedFeaturedLocations[nextAvailableSlot] !== null) {
                nextAvailableSlot++;
              }
              
              // Place the location in the available slot if there is one
              if (nextAvailableSlot < 9) {
                refreshedFeaturedLocations[nextAvailableSlot] = loc;
                nextAvailableSlot++;
              }
            });
            
          setFeaturedLocations(refreshedFeaturedLocations);
        } catch (refreshErr) {
          console.error('Error refreshing locations data:', refreshErr);
        }
      }, 1000);
    } catch (err) {
      console.error('Error updating featured location:', err);
      setError('Failed to update featured location. Please try again.');
    }
  };

  // Get locations that aren't currently featured for dropdown options
  const getAvailableLocations = (currentSlotIndex: number) => {
    // Include all locations except those already in other slots
    return locations.filter(loc => {
      // Check if this location is in another slot
      const existingSlotIndex = featuredLocations.findIndex(
        featuredLoc => featuredLoc && featuredLoc.id === loc.id
      );
      
      // If it's not in any slot OR it's in the current slot, include it
      return existingSlotIndex === -1 || existingSlotIndex === currentSlotIndex;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
        <p>Loading locations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Manage Featured Locations</h2>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 text-green-600 p-4 rounded-md">
          {successMessage}
        </div>
      )}
      
      <p className="text-gray-600">
        Select up to 9 locations to feature on the homepage. These locations will appear in the order shown below.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {featuredLocations.map((location, index) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Featured Slot {index + 1}</h3>
            </div>
            
            <div className="mb-2">
              <SearchableDropdown
                label="Select Location"
                items={getAvailableLocations(index)}
                value={location?.id || ''}
                onChange={(value) => handleLocationSelect(index, value)}
                placeholder="Search for a location..."
                className="w-full"
              />
            </div>
            
            {location && (
              <div className="mt-2 text-sm">
                <p><strong>Primary Type:</strong> {location.primaryType || location.types[0]}</p>
                <p className="mt-1"><strong>Age Range:</strong> {location.ageRange.min}-{location.ageRange.max}</p>
                <p className="mt-1"><strong>Price Range:</strong> {location.priceRange || 'Not specified'}</p>
                
                {/* Star Rating with number of ratings */}
                {location.placeData?.rating && location.placeData.userRatingsTotal ? (
                  <div className="mt-1 flex items-center">
                    <strong className="mr-1">Rating:</strong>
                    <div className="flex items-center">
                      <Star size={16} className="text-yellow-400 fill-yellow-400" />
                      <span className="ml-1 text-sm font-medium text-gray-800">
                        {location.placeData.rating.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-600 ml-1">
                        ({location.placeData.userRatingsTotal > 1000
                          ? `${Math.floor(location.placeData.userRatingsTotal / 1000)}k`
                          : location.placeData.userRatingsTotal})
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1"><strong>Rating:</strong> No ratings yet</p>
                )}
              </div>
            )}
            
            {location && (
              <button
                onClick={() => handleLocationSelect(index, null)}
                className="mt-3 px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:underline"
              >
                Clear Slot
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeaturedLocationsManager;