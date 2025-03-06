// App.tsx
import React, { useState } from 'react';
import MapComponent from './components/Map/Map';
import { sampleLocations } from './data/locations';
import SuggestActivityButton from './components/SuggestActivity/SuggestActivityButton';
import SuggestActivityModal from './components/SuggestActivity/SuggestActivityModal';
import { NewsletterButton, NewsletterModal } from './components/Newsletter';

const activityConfig = {
  'indoor-play': { name: 'Indoor Play', color: '#FF4444' },
  'outdoor-play': { name: 'Outdoor Play', color: '#33B679' },
  'sports': { name: 'Sports', color: '#FF8C00' },
  'arts': { name: 'Arts', color: '#9C27B0' },
  'music': { name: 'Music', color: '#3F51B5' },
  'education': { name: 'Education', color: '#4285F4' },
  'entertainment': { name: 'Entertainment', color: '#FFB300' }
};

function App() {
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [isNewsletterModalOpen, setIsNewsletterModalOpen] = useState(false);
  
  // Add debug utility for location issues (accessible via window object)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).getLocationIssues = () => {
        try {
          const reports = localStorage.getItem('location_issue_reports');
          return reports ? JSON.parse(reports) : [];
        } catch (e) {
          console.error('Error fetching location issues:', e);
          return [];
        }
      };
    }
  }, []);

  return (
    <div className="h-screen w-full flex flex-col">
      <header className="bg-white shadow-md z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="relative inline-flex items-baseline">
              {/* Main logo text */}
              <span className="font-logo text-2xl font-bold text-blue-500">Pame</span>
              
              {/* Sub-brand text */}
              <span className="font-logo text-xl font-semibold text-orange-500">Kids</span>
            </div>
            <div className="flex items-center space-x-3">
              <NewsletterButton onClick={() => setIsNewsletterModalOpen(true)} />
              <SuggestActivityButton onClick={() => setIsSuggestModalOpen(true)} />
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 relative overflow-hidden">
        <MapComponent locations={sampleLocations} />
      </main>

      <SuggestActivityModal
        isOpen={isSuggestModalOpen}
        onClose={() => setIsSuggestModalOpen(false)}
        activityTypes={activityConfig}
      />
      
      <NewsletterModal
        isOpen={isNewsletterModalOpen}
        onClose={() => setIsNewsletterModalOpen(false)}
      />
    </div>
  );
}

export default App;