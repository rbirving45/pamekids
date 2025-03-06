import React from 'react';
import { PlusIcon } from 'lucide-react';

interface SuggestActivityButtonProps {
  onClick: () => void;
}

const SuggestActivityButton: React.FC<SuggestActivityButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center px-3 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors h-[40px]"
      aria-label="Suggest an activity"
    >
      <PlusIcon size={18} />
      <span className="ml-2 hidden md:inline">Activity</span>
    </button>
  );
};

export default SuggestActivityButton;