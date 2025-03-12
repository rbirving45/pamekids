import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { testFirebaseConnection } from '../../utils/firebase-test';
import MigrationUtility from './MigrationUtility';

interface Subscription {
  id: string;
  email: string;
  firstName: string;
  ageRanges: string[];
  postalCode: string;
  subscribedAt: string;
}

interface ActivitySuggestion {
  id: string;
  name: string;
  type: string;
  googleMapsLink: string;
  description: string;
  email: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface Report {
  id: string;
  locationId: string;
  locationName: string;
  issueType: string;
  description: string;
  email: string;
  timestamp: string;
  status: 'new' | 'in-progress' | 'resolved' | 'rejected';
}

const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return 'N/A';
  
  // Handle Firestore timestamp objects
  if (typeof timestamp === 'object' && timestamp.seconds) {
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Handle ISO string dates
  try {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    console.error('Error formatting date:', e);
    return 'Invalid date';
  }
};

const Dashboard: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [activities, setActivities] = useState<ActivitySuggestion[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Check if admin is logged in
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin');
    }
  }, [navigate]);

  // Fetch all data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      
      const token = localStorage.getItem('adminToken');
      if (!token) {
        navigate('/admin');
        return;
      }
      
      try {
        let errorMessages: string[] = [];
  
        // Function to handle fetch with error handling
        const fetchEndpoint = async (endpoint: string) => {
          try {
            const response = await fetch(`/api/${endpoint}?adminToken=${token}`);
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(`${endpoint} API error: ${errorData.error || response.statusText}`);
            }
            return await response.json();
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            errorMessages.push(errorMessage);
            console.error(`Error fetching ${endpoint}:`, error);
            return null;
          }
        };
  
        // Fetch data from all endpoints
        const [subscriptionsData, activitiesData, reportsData] = await Promise.all([
          fetchEndpoint('newsletter'),
          fetchEndpoint('activities'),
          fetchEndpoint('reports')
        ]);
        
        // Process data if available - handle Firebase data structures
        if (subscriptionsData) {
          const subscribers = subscriptionsData.subscribers || [];
          // Convert Firestore timestamp objects to Date objects for display
          setSubscriptions(subscribers.map((sub: any) => ({
            ...sub,
            // Convert Firebase timestamp to readable format if needed
            subscribedAt: sub.subscribedAt // formatTimestamp will handle this
          })));
        }
        
        if (activitiesData) {
          const suggestions = activitiesData.suggestions || [];
          setActivities(suggestions.map((suggestion: any) => ({
            ...suggestion,
            // Convert Firebase timestamp to readable format if needed
            timestamp: suggestion.timestamp // formatTimestamp will handle this
          })));
        }
        
        if (reportsData) {
          const reports = reportsData.reports || [];
          setReports(reports.map((report: any) => ({
            ...report,
            // Convert Firebase timestamp to readable format if needed
            timestamp: report.timestamp // formatTimestamp will handle this
          })));
        }
        
        // Set error if any endpoint failed
        if (errorMessages.length > 0) {
          setError(`Some data could not be loaded: ${errorMessages.join(', ')}`);
        }
      } catch (err: unknown) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [navigate]);

  const formatDate = formatTimestamp;
  
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin');
  };

  const handleDebug = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setError('No admin token found');
        return;
      }

      setIsLoading(true);
      setError('Running debug diagnostics...');
      
      const response = await fetch(`/api/debug?adminToken=${token}`);
      const data = await response.json();
      
      if (!response.ok) {
        setError(`Debug API error: ${data.error || response.statusText}`);
        return;
      }
      
      // Format the debug data as JSON with indentation
      const debugText = JSON.stringify(data, null, 2);
      console.log('Debug data:', data);
      
      // Create downloadable file
      const blob = new Blob([debugText], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'netlify-debug.json';
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setError(`Debug completed successfully. Check console and downloads folder.`);
    } catch (err) {
      console.error('Debug error:', err);
      setError(`Debug error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">PameKids Admin</h1>
          <div className="flex space-x-4">
            <button
              onClick={async () => {
                const result = await testFirebaseConnection();
                console.log('Firebase test result:', result);
                alert(result.success ? 'Firebase connected!' : `Firebase error: ${result.message}`);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Test Firebase Connection
            </button>
            <button
              onClick={handleDebug}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Run Diagnostics
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
            {error}
          </div>
        )}

        <Tabs defaultValue="activities" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="activities" className="px-4 py-2">
              Activity Suggestions ({activities.length})
            </TabsTrigger>
            <TabsTrigger value="reports" className="px-4 py-2">
              Issue Reports ({reports.length})
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="px-4 py-2">
              Newsletter Subscribers ({subscriptions.length})
            </TabsTrigger>
            <TabsTrigger value="utilities" className="px-4 py-2">
              Utilities
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activities">
            <Card>
              <CardHeader>
                <CardTitle>Activity Suggestions</CardTitle>
                <CardDescription>
                  Review and manage user-submitted activity suggestions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No activity suggestions yet.</p>
                ) : (
                  <div className="space-y-4">
                    {activities.map(activity => (
                      <div key={activity.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-lg">{activity.name}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            activity.status === 'approved' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {activity.status}
                          </span>
                        </div>
                        <p className="text-sm mb-2"><strong>Type:</strong> {activity.type}</p>
                        <p className="text-sm mb-2">
                          <strong>Google Maps:</strong>{' '}
                          <a
                            href={activity.googleMapsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View location
                          </a>
                        </p>
                        {activity.description && (
                          <p className="text-sm mb-2"><strong>Description:</strong> {activity.description}</p>
                        )}
                        {activity.email && (
                          <p className="text-sm mb-2"><strong>Contact:</strong> {activity.email}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Submitted on {formatDate(activity.timestamp)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Issue Reports</CardTitle>
                <CardDescription>
                  Review and manage reported issues with existing locations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reports.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No issue reports yet.</p>
                ) : (
                  <div className="space-y-4">
                    {reports.map(report => (
                      <div key={report.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-lg">{report.locationName}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            report.status === 'new' ? 'bg-yellow-100 text-yellow-800' :
                            report.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                            report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {report.status}
                          </span>
                        </div>
                        <p className="text-sm mb-2"><strong>Issue Type:</strong> {report.issueType}</p>
                        <p className="text-sm mb-2"><strong>Description:</strong> {report.description}</p>
                        {report.email && (
                          <p className="text-sm mb-2"><strong>Contact:</strong> {report.email}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Reported on {formatDate(report.timestamp)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <CardTitle>Newsletter Subscribers</CardTitle>
                <CardDescription>
                  View all newsletter subscribers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {subscriptions.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No subscribers yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Age Ranges
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {subscriptions.map(sub => (
                          <tr key={sub.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{sub.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{sub.firstName || '-'}</td>
                            <td className="px-6 py-4 text-sm">
                              {sub.ageRanges.join(', ')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{sub.postalCode || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(sub.subscribedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="utilities">
            <Card>
              <CardHeader>
                <CardTitle>Admin Utilities</CardTitle>
                <CardDescription>
                  Advanced utilities for database management.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MigrationUtility />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;