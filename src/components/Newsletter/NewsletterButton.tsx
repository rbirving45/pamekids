import React from 'react';
import { Mail } from 'lucide-react';

interface NewsletterButtonProps {
  onClick: () => void;
}

const NewsletterButton: React.FC<NewsletterButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center px-3 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
      aria-label="Sign up for newsletter"
    >
      <Mail size={18} />
      <span className="ml-2 hidden md:inline">Subscribe</span>
    </button>
  );
};

export default NewsletterButton;