import React, { useState } from 'react';
import { useConsent } from '../../contexts/ConsentContext';
import { X, MapPin, BarChart2, Check, Settings } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const {
    setHasShownWelcomeModal,
    updateAllConsent
  } = useConsent();

  // Local state for the consent form
  const [showCustomize, setShowCustomize] = useState(false);
  const [customAnalytics, setCustomAnalytics] = useState(true);
  const [customLocation, setCustomLocation] = useState(true);

  // Handler for accepting all
  const handleAcceptAll = () => {
    updateAllConsent(true, true);
    setHasShownWelcomeModal(true);
    onClose();
  };

  // Handler for rejecting all
  const handleRejectAll = () => {
    updateAllConsent(false, false);
    setHasShownWelcomeModal(true);
    onClose();
  };

  // Handler for saving custom preferences
  const handleSavePreferences = () => {
    updateAllConsent(customAnalytics, customLocation);
    setHasShownWelcomeModal(true);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-modal-backdrop bg-black bg-opacity-70 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto overflow-hidden z-modal-container animation-popup">
        {/* Header */}
        <div className="relative bg-primary-100 p-5 border-b border-gray-200">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <X size={20} />
          </button>
          <h2 className="text-2xl font-bold text-primary-800">Welcome to PameKids!</h2>
          <p className="mt-1 text-gray-600">
            We help parents discover amazing activities for children
            in Greece, and we just need a couple things from you to get started.
          </p>
        </div>

        {/* Content */}
        {!showCustomize ? (
          <div className="p-6">
            <div className="space-y-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-1">
                  <MapPin className="h-5 w-5 text-blue-500" />
                </div>
                <div className="ml-3">
                  <h3 className="font-medium">Location Services</h3>
                  <p className="text-sm text-gray-500">
                    We use your location to show you nearby activities and provide accurate directions.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 pt-1">
                  <BarChart2 className="h-5 w-5 text-blue-500" />
                </div>
                <div className="ml-3">
                  <h3 className="font-medium">Usage Analytics</h3>
                  <p className="text-sm text-gray-500">
                    We collect anonymous usage data to improve our app and make it more useful for families.
                  </p>
                </div>
              </div>
            </div>


            <div className="flex flex-col gap-3">
              <button
                onClick={handleAcceptAll}
                className="w-full bg-blue-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-blue-600 flex items-center justify-center"
              >
                <Check size={18} className="mr-2" />
                Accept All
              </button>
              <button
                onClick={() => setShowCustomize(true)}
                className="w-full bg-white text-gray-500 border border-gray-300 rounded-lg px-4 py-2 font-medium hover:bg-gray-50 flex items-center justify-center"
              >
                <Settings size={18} className="mr-2" />
                Customize
              </button>
            </div>
            
            <p className="text-sm text-gray-500 mb-6">
              By using PameKids, you agree to our <a href="/privacy" className="text-blue-500 hover:underline">Privacy Policy</a> and
              <a href="/terms" className="text-blue-500 hover:underline"> Terms of Service</a>.
            </p>

          </div>
        ) : (
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">Customize Privacy Settings</h3>

            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-1">
                    <BarChart2 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="ml-3">
                    <h4 className="font-medium">Analytics</h4>
                    <p className="text-sm text-gray-500">
                    Collect anonymous usage data to improve our app
                    </p>
                  </div>
                </div>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={customAnalytics}
                      onChange={() => setCustomAnalytics(!customAnalytics)}
                    />
                    <div className={`block w-10 h-6 rounded-full ${customAnalytics ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${customAnalytics ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-1">
                    <MapPin className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="ml-3">
                    <h4 className="font-medium">Location</h4>
                    <p className="text-sm text-gray-500">
                      Show nearby activities and provide accurate directions
                    </p>
                  </div>
                </div>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={customLocation}
                      onChange={() => setCustomLocation(!customLocation)}
                    />
                    <div className={`block w-10 h-6 rounded-full ${customLocation ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${customLocation ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleSavePreferences}
                className="w-full bg-blue-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-blue-600"
              >
                Save Preferences
              </button>
              <button
                onClick={() => setShowCustomize(false)}
                className="w-full bg-gray-100 text-gray-800 rounded-lg px-4 py-2 font-medium hover:bg-gray-200"
              >
                Back
              </button>
              <button
                onClick={handleRejectAll}
                className="w-full bg-white text-gray-500 rounded-lg px-4 py-2 font-medium hover:bg-gray-50"
              >
                Reject All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeModal;