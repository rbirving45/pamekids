import React, { useCallback } from 'react';
import { useTouch } from '../../contexts/TouchContext';

const MapBlockingOverlay: React.FC = () => {
  const { isMapBlocked } = useTouch();
  
  // Single handler for all interaction types
  const blockInteraction = useCallback((e: React.UIEvent) => {
    // Always prevent propagation and default behavior
    e.stopPropagation();
    e.preventDefault();
  }, []);
  
  // Don't render anything if map shouldn't be blocked
  if (!isMapBlocked) return null;
  
  return (
    <div
      className="fixed inset-0 z-map-blocker"
      style={{
        backgroundColor: 'transparent',
        pointerEvents: 'auto'
      }}
      onClick={blockInteraction}
      onTouchStart={blockInteraction}
      onTouchMove={blockInteraction}
      onTouchEnd={blockInteraction}
      onTouchCancel={blockInteraction}
      onMouseDown={blockInteraction}
      onMouseMove={blockInteraction}
      onMouseUp={blockInteraction}
      onWheel={blockInteraction}
      aria-hidden="true"
    />
  );
};

export default MapBlockingOverlay;