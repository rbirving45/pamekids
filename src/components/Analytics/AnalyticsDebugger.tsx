import React, { useState, useEffect } from 'react';
import {
  enableAnalyticsDebug,
  disableAnalyticsDebug,
  disableAnalyticsSending,
  enableAnalyticsSending
} from '../../utils/analytics';

/**
 * A debug component that shows analytics events in real-time
 * and provides controls to enable/disable debug mode and sending events
 */
const AnalyticsDebugger: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [events, setEvents] = useState<Array<{timestamp: string; event: string; params: any}>>([]);
  const [isDebugEnabled, setIsDebugEnabled] = useState(false);
  const [isSendingDisabled, setIsSendingDisabled] = useState(false);

  // Check initial state from localStorage
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      setIsDebugEnabled(localStorage.getItem('pamekids_analytics_debug') === 'true');
      setIsSendingDisabled(localStorage.getItem('pamekids_analytics_disable') === 'true');
    }

    // Show debugger if URL has debug=analytics param
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'analytics') {
      setIsVisible(true);
      setIsExpanded(true);
      enableAnalyticsDebug();
      setIsDebugEnabled(true);
    }
  }, []);

  // Listen for console logs with analytics events
  useEffect(() => {
    if (!isVisible || !isDebugEnabled) return;

    // Create a proxy for console.log to capture analytics events
    const originalLog = console.log;
    console.log = function(...args) {
      // Call original console.log
      originalLog.apply(console, args);

      // Check if this is an analytics event (look for the "📊 Analytics:" prefix)
      const eventString = args[0]?.toString() || '';
      if (typeof eventString === 'string' && eventString.includes('📊 Analytics:')) {
        const eventName = eventString.replace('📊 Analytics:', '').trim();
        const params = args[1] || {};
        
        setEvents(prev => [
          {
            timestamp: new Date().toLocaleTimeString(),
            event: eventName,
            params
          },
          ...prev.slice(0, 49) // Keep last 50 events
        ]);
      }
    };

    // Restore original console.log on cleanup
    return () => {
      console.log = originalLog;
    };
  }, [isVisible, isDebugEnabled]);

  // Toggle debug mode
  const toggleDebug = () => {
    if (isDebugEnabled) {
      disableAnalyticsDebug();
      setIsDebugEnabled(false);
    } else {
      enableAnalyticsDebug();
      setIsDebugEnabled(true);
    }
  };

  // Toggle sending events to GA
  const toggleSending = () => {
    if (isSendingDisabled) {
      enableAnalyticsSending();
      setIsSendingDisabled(false);
    } else {
      disableAnalyticsSending();
      setIsSendingDisabled(true);
    }
  };

  // Don't render anything if not visible
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white p-2 rounded-full opacity-50 hover:opacity-100"
        title="Show Analytics Debugger"
      >
        📊
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 z-50 w-full md:w-96 bg-white border-t md:border-l border-gray-300 shadow-lg overflow-hidden transition-all duration-300 ease-in-out"
      style={{
        height: isExpanded ? '50vh' : '40px',
        maxHeight: '70vh'
      }}
    >
      {/* Header */}
      <div className="bg-gray-800 text-white p-2 flex justify-between items-center">
        <div className="flex items-center">
          <span className="mr-2">📊</span>
          <h3 className="font-medium">Analytics Debugger</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleDebug}
            className={`px-2 py-1 rounded text-xs ${isDebugEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
          >
            {isDebugEnabled ? 'Debug On' : 'Debug Off'}
          </button>
          <button
            onClick={toggleSending}
            className={`px-2 py-1 rounded text-xs ${isSendingDisabled ? 'bg-red-500' : 'bg-green-500'}`}
          >
            {isSendingDisabled ? 'GA Off' : 'GA On'}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-gray-700"
          >
            {isExpanded ? '▼' : '▲'}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 rounded hover:bg-gray-700"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Event List */}
      {isExpanded && (
        <div className="overflow-y-auto p-2 h-[calc(100%-40px)] bg-gray-100">
          {events.length === 0 ? (
            <div className="text-gray-500 text-center py-4">
              No events captured yet. Interact with the app to see events.
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((event, index) => (
                <div key={index} className="bg-white p-2 rounded border border-gray-200 text-xs">
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-blue-600">{event.event}</div>
                    <div className="text-gray-500">{event.timestamp}</div>
                  </div>
                  <pre className="mt-1 overflow-x-auto">
                    {JSON.stringify(event.params, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyticsDebugger;