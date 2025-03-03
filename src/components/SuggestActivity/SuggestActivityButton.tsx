import React from 'react';
import { Plus } from 'lucide-react';

interface SuggestActivityButtonProps {
  onClick: () => void;
}

const SuggestActivityButton: React.FC<SuggestActivityButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 relative group"
      aria-label="Suggest Activity"
    >
      <Plus size={20} className="text-gray-600" />
      
      {/* Tooltip */}
      <span className="absolute -bottom-10 right-0 bg-gray-800 text-white text-xs px-2 py-1 rounded
        opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        Suggest Activity
      </span>
    </button>
  );
};

export default SuggestActivityButton;