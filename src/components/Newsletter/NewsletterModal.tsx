import React, { useState, useEffect } from 'react';
import { X, CheckCircle } from 'lucide-react';

interface NewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  email: string;
  firstName: string;
  ageRanges: string[];
  postalCode: string;
}

const NewsletterModal: React.FC<NewsletterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    firstName: '',
    ageRanges: [],
    postalCode: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        email: '',
        firstName: '',
        ageRanges: [],
        postalCode: '',
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

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      ageRanges: checked
        ? [...prev.ageRanges, value]
        : prev.ageRanges.filter(range => range !== value)
    }));
    
    // Clear age range error if any ranges are selected
    if (errors.ageRanges && checked) {
      setErrors(prev => ({ ...prev, ageRanges: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.ageRanges.length === 0) {
      newErrors.ageRanges = 'Please select at least one age range';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      // Submit to Netlify function endpoint (same URL, now using Firebase)
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        // Handle specific Firebase-related errors
        if (data.error && data.error.includes('already subscribed')) {
          throw new Error('This email is already subscribed to our newsletter.');
        } else {
          throw new Error(data.error || 'Failed to subscribe to newsletter');
        }
      }
  
      // Success handling - should work with Firebase response too
      setSubmitStatus('success');
      setSubmitMessage('Thank you for subscribing to our newsletter! You\'ll start receiving updates soon.');
      
      // Reset form after submission
      setFormData({
        email: '',
        firstName: '',
        ageRanges: [],
        postalCode: '',
      });
  
      // Close modal after 3 seconds
      setTimeout(() => {
        onClose();
        setSubmitStatus('idle');
      }, 3000);
      
    } catch (error) {
      console.error('Error submitting newsletter signup:', error);
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

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Subscribe to discover more</h2>
        <p className="text-gray-600 mb-6">Sign up to discover more of the best kids activities, classes, and events in your area!</p>

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
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
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
            </div>

            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                Name (optional)
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Your name"
              />
            </div>

            <div>
              <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                Postal Code (optional)
              </label>
              <input
                type="text"
                id="postalCode"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Enter your postal code"
              />
              <p className="mt-1 text-xs text-gray-500">
                Helps us send you location-specific activities
              </p>
            </div>

            <div>
              <p className="block text-sm font-medium text-gray-700 mb-2">
                Child Age Ranges *
              </p>
              <div className="space-y-2">
                {['0-2 years', '3-5 years', '6-8 years', '9-12 years', '13+ years'].map((range) => (
                  <label key={range} className="flex items-center">
                    <input
                      type="checkbox"
                      name="ageRanges"
                      value={range}
                      checked={formData.ageRanges.includes(range)}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700">{range}</span>
                  </label>
                ))}
              </div>
              {errors.ageRanges && <p className="mt-1 text-sm text-red-600">{errors.ageRanges}</p>}
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
                {isSubmitting ? 'Submitting...' : 'Subscribe'}
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              We'll never share your email with anyone else. You can unsubscribe anytime.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewsletterModal;