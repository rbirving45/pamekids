import React, { useState, useEffect } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { ActivityType } from '../../data/locations';

// Simple UUID generator fallback function
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface SuggestActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activityTypes: Record<ActivityType, { name: string; color: string }>;
}

interface FormData {
  name: string;
  type: ActivityType;
  googleMapsLink: string;
  description: string;
  email: string;
}

interface StoredSuggestion extends FormData {
  id: string;
  timestamp: string;
  reviewed: boolean;
}

const STORAGE_KEY = 'activity_suggestions';

const SuggestActivityModal: React.FC<SuggestActivityModalProps> = ({
  isOpen,
  onClose,
  activityTypes
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'indoor-play',
    googleMapsLink: '',
    description: '',
    email: ''
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        type: 'indoor-play',
        googleMapsLink: '',
        description: '',
        email: ''
      });
      setErrors({});
      setSubmitStatus('idle');
      setSubmitMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user edits it
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Activity name is required';
    }

    if (!formData.googleMapsLink.trim()) {
      newErrors.googleMapsLink = 'Google Maps link is required';
    } else if (!isValidUrl(formData.googleMapsLink)) {
      newErrors.googleMapsLink = 'Please enter a valid URL';
    }

    if (formData.description.length > 200) {
      newErrors.description = 'Description must be 200 characters or less';
    }

    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Helper function to store suggestions in localStorage
  const saveSuggestion = (suggestion: FormData): StoredSuggestion => {
    try {
      // Get existing suggestions
      const existingSuggestions = localStorage.getItem(STORAGE_KEY);
      const suggestions: StoredSuggestion[] = existingSuggestions
        ? JSON.parse(existingSuggestions)
        : [];
      
      // Create new suggestion with metadata
      const newSuggestion: StoredSuggestion = {
        ...suggestion,
        id: generateUUID(),
        timestamp: new Date().toISOString(),
        reviewed: false
      };
      
      // Add to array and save back to localStorage
      suggestions.push(newSuggestion);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(suggestions));
      
      // Log location of stored data for debugging
      console.log('Suggestion saved to localStorage. Access with: localStorage.getItem("activity_suggestions")');
      
      return newSuggestion;
    } catch (error) {
      console.error('Error saving suggestion to localStorage:', error);
      throw new Error('Failed to save your suggestion. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setSubmitMessage('');

    try {
      // Save to localStorage instead of sending to server
      saveSuggestion(formData);

      // Success
      setSubmitStatus('success');
      setSubmitMessage('Thank you! Your activity suggestion has been submitted successfully.');
      
      // Reset form after submission
      setFormData({
        name: '',
        type: 'indoor-play',
        googleMapsLink: '',
        description: '',
        email: ''
      });

      // Close modal after 3 seconds
      setTimeout(() => {
        onClose();
        setSubmitStatus('idle');
      }, 3000);
      
    } catch (error) {
      console.error('Error saving suggestion:', error);
      setSubmitStatus('error');
      setSubmitMessage(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="relative w-full max-w-md p-6 bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <button
          className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100"
          onClick={onClose}
        >
          <X size={20} className="text-gray-500" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">Suggest an Activity</h2>
        <p className="text-gray-600 mb-6">Add your favorite places and activities to PameKids!</p>

        {submitStatus === 'success' ? (
          <div className="p-4 bg-green-50 text-green-800 rounded-lg mb-4 flex items-center">
            <CheckCircle className="mr-2 flex-shrink-0" size={20} />
            <p>{submitMessage}</p>
          </div>
        ) : submitStatus === 'error' ? (
          <div className="p-4 bg-red-50 text-red-800 rounded-lg mb-4">
            <p>{submitMessage}</p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Activity Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  errors.name ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-200'
                }`}
                placeholder="e.g. City Park Playground"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Activity Type *
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {Object.entries(activityTypes).map(([type, config]) => (
                  <option key={type} value={type}>
                    {config.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="googleMapsLink" className="block text-sm font-medium text-gray-700 mb-1">
                Google Maps Link *
              </label>
              <input
                type="url"
                id="googleMapsLink"
                name="googleMapsLink"
                value={formData.googleMapsLink}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  errors.googleMapsLink ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-200'
                }`}
                placeholder="https://maps.google.com/..."
              />
              {errors.googleMapsLink && <p className="mt-1 text-sm text-red-600">{errors.googleMapsLink}</p>}
              <p className="mt-1 text-xs text-gray-500">
                Right-click on a location in Google Maps and select "Share" to get the link
              </p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                maxLength={200}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  errors.description ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-200'
                }`}
                placeholder="Brief description of the activity (max 200 characters)"
              ></textarea>
              <p className="mt-1 text-xs text-gray-500">
                {formData.description.length}/200 characters
              </p>
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Your Email (optional)
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  errors.email ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-200'
                }`}
                placeholder="your.email@example.com"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              <p className="mt-1 text-xs text-gray-500">
                We'll only use this to contact you if we have questions about your suggestion
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full px-4 py-3 text-white font-medium rounded-lg
                  ${isSubmitting
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                  }`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Suggestion'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SuggestActivityModal;