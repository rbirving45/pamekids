// Global type definitions for PameKids app
import { Location } from './location';

declare global {
  interface Window {
    openLocationDetail?: (location: Location, source?: 'map_click' | 'list_item' | 'search_result') => void;
    openReportIssueModal?: (locationId: string, locationName: string, defaultIssueType: string) => void;
    getLocationIssues?: () => any[];
    fs: {
      readFile: (path: string, options?: { encoding?: string }) => Promise<any>;
    };
  }
}