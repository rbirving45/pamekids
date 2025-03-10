import React, { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { ActivityType } from '../../data/locations';
import ModalWrapper from '../common/ModalWrapper';

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

  // Handle form submission

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
  
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setSubmitMessage('');
  
    try {
      // Submit to Netlify function endpoint (now using Firebase)
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        // Improved error handling for Firebase
        throw new Error(data.error || 'Failed to submit activity suggestion');
      }
  
      // Success - this should work the same with Firebase
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
      console.error('Error submitting activity suggestion:', error);
      setSubmitStatus('error');
      setSubmitMessage(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Suggest an Activity"
    >
      <p className="text-gray-600 mb-6">Add your favorite places and activities to PameKids!</p>

      {submitStatus === 'success' ? (
        <div className="p-4 bg-green-50 text-green-800 rounded-lg mb-4 flex items-center z-modal-success-message">
          <CheckCircle className="mr-2 flex-shrink-0" size={20} />
          <p>{submitMessage}</p>
        </div>
      ) : submitStatus === 'error' ? (
        <div className="p-4 bg-red-50 text-red-800 rounded-lg mb-4 z-modal-success-message">
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
    </ModalWrapper>
  );
};

export default SuggestActivityModal;