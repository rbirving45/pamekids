import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../Layout/Header';
import Footer from '../Layout/Footer';
import SEO from '../SEO';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO pageType="privacy" />
      
      <div className="fixed top-0 left-0 right-0 z-header w-full">
        <Header />
      </div>
      
      {/* Add spacing to account for fixed header */}
      <div className="h-16"></div>
      
      <main className="flex-1 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-blue-500 mb-8">Privacy Policy</h1>
          
          <div className="prose prose-blue max-w-none">
            <p className="mb-4">
              Last Updated: March 31, 2025
            </p>
            
            <p className="mb-4">
              At PameKids, we respect your privacy and are committed to protecting your personal data.
              This Privacy Policy explains how we collect, use, and safeguard your information when you use our website.
            </p>
            
            <h2 className="text-2xl font-semibold text-blue-500 mt-8 mb-4">Information We Collect</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-2">Location Data</h3>
            <p className="mb-4">
              We request access to your location to show you children's activities near you.
              This helps us provide more relevant suggestions based on your proximity to activities.
              You can always deny location permissions, and the app will still function with default location settings.
            </p>
            
            <h3 className="text-xl font-semibold mt-6 mb-2">Analytics</h3>
            <p className="mb-4">
              We use Google Analytics to collect anonymous information about how visitors use our website.
              This includes information such as which pages you visit, how long you spend on the site,
              and basic device information. This helps us improve our services and user experience.
              You may opt out of analytics tracking through your consent preferences.
            </p>
            
            <h3 className="text-xl font-semibold mt-6 mb-2">User Submissions</h3>
            <p className="mb-4">
              When you submit information about activities or report issues via our forms,
              we collect the information you provide, including any optional contact information like your email address.
              This information is used solely to process your submission and, if needed, to contact you about your submission.
            </p>
            
            <h3 className="text-xl font-semibold mt-6 mb-2">Newsletter Subscription</h3>
            <p className="mb-4">
              If you sign up for our newsletter, we collect your email address to send you updates about
              children's activities, new features, and other relevant information.
              You can unsubscribe from these communications at any time.
            </p>
            
            <h2 className="text-2xl font-semibold text-blue-500 mt-8 mb-4">How We Use Your Information</h2>
            <p className="mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-8 mb-4">
              <li>Show you relevant children's activities near your location</li>
              <li>Improve our website and services</li>
              <li>Process your activity submissions and reports</li>
              <li>Send you newsletters if you've subscribed</li>
              <li>Respond to your inquiries</li>
            </ul>
            
            <h2 className="text-2xl font-semibold text-blue-500 mt-8 mb-4">Data Sharing</h2>
            <p className="mb-4">
              We do not sell your personal information to third parties. We may share anonymous,
              aggregated information with our partners to help improve our services.
            </p>
            
            <h2 className="text-2xl font-semibold text-blue-500 mt-8 mb-4">Your Choices</h2>
            <p className="mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-8 mb-4">
              <li>Opt out of providing your location data through your browser or device settings</li>
              <li>Opt out of analytics tracking through our consent management tool</li>
              <li>Unsubscribe from our newsletter at any time</li>
              <li>Request that we delete any personal information you've provided</li>
              <li>
                Manage your consent preferences by{' '}
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      const event = new CustomEvent('openWelcomeModal');
                      window.dispatchEvent(event);
                    }
                  }}
                  className="text-blue-500 hover:text-blue-700 underline cursor-pointer"
                >
                  clicking here
                </button>
              </li>
            </ul>
            
            <h2 className="text-2xl font-semibold text-blue-500 mt-8 mb-4">Contact Us</h2>
            <p className="mb-4">
              If you have any questions about this Privacy Policy, please contact us at:
              <br />
              <a href="mailto:info@pamekids.com" className="text-blue-500 hover:text-blue-700">
                info@pamekids.com
              </a>
            </p>
            
            <p className="mt-8 mb-4">
              <Link to="/" className="text-blue-500 hover:text-blue-700">
                Return to Home
              </Link>
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;