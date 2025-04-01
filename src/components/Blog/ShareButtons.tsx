import React from 'react';
import { Facebook, Twitter, Linkedin, Mail, Link as LinkIcon, Copy } from 'lucide-react';
import { trackCustomEvent } from '../../utils/analytics';

interface ShareButtonsProps {
  title: string;
  url: string;
  summary?: string;
  hashtags?: string[];
  className?: string;
}

/**
 * Component for social media sharing buttons
 * Provides buttons for common platforms and copy link functionality
 */
const ShareButtons: React.FC<ShareButtonsProps> = ({
  title,
  url,
  summary = '',
  hashtags = [],
  className = ''
}) => {
  // Track sharing events
  const trackShare = (platform: string) => {
    trackCustomEvent(
      'blog_share',
      'Blog',
      `Shared on ${platform}`,
      { platform, title, url },
      false
    );
  };
  
  // Generate sharing URLs for different platforms
  const getShareUrls = () => {
    // Encode parameters
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedSummary = encodeURIComponent(summary);
    const encodedHashtags = hashtags.join(',');
    
    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}&hashtags=${encodedHashtags}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedSummary}%0A%0A${encodedUrl}`
    };
  };
  
  const shareUrls = getShareUrls();
  
  // Copy the current URL to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      // Show a temporary tooltip or notification here if needed
      
      // Track the copy event
      trackShare('copy_link');
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-sm font-medium text-gray-700 mr-1">Share:</span>
      
      {/* Facebook */}
      <a
        href={shareUrls.facebook}
        target="_blank"
        rel="noopener noreferrer"
        className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        aria-label="Share on Facebook"
        onClick={() => trackShare('facebook')}
      >
        <Facebook size={16} />
      </a>
      
      {/* Twitter */}
      <a
        href={shareUrls.twitter}
        target="_blank"
        rel="noopener noreferrer"
        className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-400 text-white hover:bg-blue-500 transition-colors"
        aria-label="Share on Twitter"
        onClick={() => trackShare('twitter')}
      >
        <Twitter size={16} />
      </a>
      
      {/* LinkedIn */}
      <a
        href={shareUrls.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-800 text-white hover:bg-blue-900 transition-colors"
        aria-label="Share on LinkedIn"
        onClick={() => trackShare('linkedin')}
      >
        <Linkedin size={16} />
      </a>
      
      {/* Email */}
      <a
        href={shareUrls.email}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-600 text-white hover:bg-gray-700 transition-colors"
        aria-label="Share via Email"
        onClick={() => trackShare('email')}
      >
        <Mail size={16} />
      </a>
      
      {/* Copy Link Button */}
      <button
        onClick={copyToClipboard}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors"
        aria-label="Copy link"
        title="Copy link to clipboard"
      >
        <Copy size={16} />
      </button>
    </div>
  );
};

export default ShareButtons;