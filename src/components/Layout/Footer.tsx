import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <div className="flex items-baseline">
              <span className="font-logo text-3xl font-bold text-blue-400">Pame</span>
              <span className="font-logo text-2xl font-semibold text-orange-400">Kids</span>
            </div>
            <p className="text-gray-400 text-sm mt-1">© 2025 PameKids. All rights reserved.</p>
          </div>
          
          <div className="flex gap-6">
            <Link to="/" className="text-gray-300 hover:text-white">About</Link>
            <Link to="/" className="text-gray-300 hover:text-white">Contact</Link>
            <Link to="/privacy" className="text-gray-300 hover:text-white">Privacy</Link>
            <Link to="/terms" className="text-gray-300 hover:text-white">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;