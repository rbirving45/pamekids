import React, { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import ModalWrapper from '../common/ModalWrapper';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
  locationName: string;
  defaultIssueType?: 'pro-tips' | 'incorrect-info' | 'closed-location' | 'inappropriate-content' | 'other';
}

interface FormData {
  issueType: 'pro-tips' | 'incorrect-info' | 'closed-location' | 'inappropriate-content' | 'other';
  description: string;
  email: string;
}

const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  isOpen,
  onClose,
  locationId,
  locationName,
  defaultIssueType = 'pro-tips'
}) => {
  const [formData, setFormData] = useState<FormData>({
    issueType: defaultIssueType,
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
        issueType: defaultIssueType,
        description: '',
        email: ''
      });
      setErrors({});
      setSubmitStatus('idle');
      setSubmitMessage('');
    }
  }, [isOpen, defaultIssueType]);

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
    
    if (!formData.description.trim()) {
      newErrors.description = 'Please describe the update or issue';
    } else if (formData.description.length > 2000) {
      newErrors.description = 'Description must be 2,000 characters or less';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
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
      // Prepare report data (same as before)
      const reportData = {
        ...formData,
        locationId,
        locationName
      };
  
      // Submit to Netlify function endpoint (now using Firebase)
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });
  
      const data = await response.json();
  
      // Check for errors with improved Firebase error handling
      if (!response.ok) {
        // Handle specific Firebase errors if any
        throw new Error(data.error || 'Failed to submit report');
      }
  
      // Success - this should work the same with Firebase
      setSubmitStatus('success');
      setSubmitMessage('Thank you! Our team will review your submission soon!');
      
      // Reset form after submission
      setFormData({
        issueType: 'incorrect-info',
        description: '',
        email: ''
      });
  
      // Close modal after 3 seconds
      setTimeout(() => {
        onClose();
        setSubmitStatus('idle');
      }, 3000);
      
    } catch (error) {
      console.error('Error submitting report:', error);
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
      title="Submit Update / Report Issue"
    >
      <p className="text-gray-600 mb-4">
        Help us improve the information for <strong>{locationName}</strong> by providing your feedback.
      </p>

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
            <label htmlFor="issueType" className="block text-sm font-medium text-gray-700 mb-1">
              Submission Type *
            </label>
            <select
              id="issueType"
              name="issueType"
              value={formData.issueType}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="pro-tips">Submit Pro Tip</option>
              <option value="incorrect-info">Update Location Details</option>
              <option value="closed-location">Location Closed/Moved</option>
              <option value="inappropriate-content">Inappropriate Content</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              maxLength={2000}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.description ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-200'
              }`}
              placeholder="Please describe the update or issue in detail"
            ></textarea>
            <p className="mt-1 text-xs text-gray-500">
              {formData.description.length}/2,000 characters
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
              We'll only use this to contact you if we have questions about your report
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
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </div>
      </form>
    </ModalWrapper>
  );
};

export default ReportIssueModal;