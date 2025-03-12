import React, { useState } from 'react';
import { migrateLocationsToFirebase } from '../../utils/migrate-locations';

const MigrationUtility: React.FC = () => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMigration = async () => {
    if (window.confirm('Are you sure you want to migrate all locations to Firebase? This operation cannot be undone.')) {
      setIsMigrating(true);
      setError(null);
      try {
        const migrationResults = await migrateLocationsToFirebase();
        setResults(migrationResults);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error('Migration error:', err);
      } finally {
        setIsMigrating(false);
      }
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-lg font-medium mb-4">Data Migration Utility</h2>
      
      <button
        onClick={handleMigration}
        disabled={isMigrating}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
      >
        {isMigrating ? 'Migrating...' : 'Migrate Locations to Firebase'}
      </button>
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {results && (
        <div className="mt-4">
          <h3 className="font-medium mb-2">Migration Results</h3>
          <p>Success: {results.success}</p>
          <p>Failed: {results.failed}</p>
          {results.errors && results.errors.length > 0 && (
            <div className="mt-2">
              <h4 className="font-medium">Errors:</h4>
              <ul className="list-disc pl-5">
                {results.errors.map((error: string, index: number) => (
                  <li key={index} className="text-sm text-red-600">{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MigrationUtility;