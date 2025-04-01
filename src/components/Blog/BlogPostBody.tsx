import React, { ReactNode } from 'react';

interface BlogPostBodyProps {
  children?: ReactNode;
  content?: string;
  className?: string;
}

/**
 * Component for styling and rendering blog post content
 * Supports both React children and HTML content string
 */
const BlogPostBody: React.FC<BlogPostBodyProps> = ({
  children,
  content,
  className = ''
}) => {
  // Custom prose classes to match PameKids styling
  const proseClasses = `
    prose prose-blue
    max-w-none
    prose-headings:text-blue-500
    prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4
    prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3
    prose-p:text-gray-700 prose-p:leading-relaxed
    prose-a:text-blue-600 prose-a:font-medium prose-a:no-underline hover:prose-a:underline
    prose-ul:mb-4 prose-ol:mb-4
    prose-li:text-gray-700 prose-li:mb-1
    prose-blockquote:border-orange-400 prose-blockquote:bg-orange-50 prose-blockquote:rounded-md prose-blockquote:py-1 prose-blockquote:px-4
    prose-img:rounded-lg prose-img:shadow-sm
    prose-hr:border-gray-200
    prose-strong:font-bold prose-strong:text-gray-800
    ${className}
  `;

  // If HTML content string is provided
  if (content) {
    return (
      <div
        className={proseClasses}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  // If React children are provided
  return (
    <div className={proseClasses}>
      {children}
    </div>
  );
};

// Helper components for specific content types
// These allow for more consistent styling and easier usage

// Subheading with optional anchor link
export const BlogSubheading: React.FC<{
  id?: string;
  children: ReactNode;
  level: 2 | 3 | 4;
}> = ({ id, children, level }) => {
  // Dynamically render the appropriate heading level
  if (level === 2) {
    return (
      <h2 id={id} className="group relative">
        {children}
        {id && (
          <a
            href={`#${id}`}
            className="absolute opacity-0 group-hover:opacity-100 -ml-6 pr-2 text-blue-400"
            aria-label="Anchor link"
          >
            #
          </a>
        )}
      </h2>
    );
  } else if (level === 3) {
    return (
      <h3 id={id} className="group relative">
        {children}
        {id && (
          <a
            href={`#${id}`}
            className="absolute opacity-0 group-hover:opacity-100 -ml-6 pr-2 text-blue-400"
            aria-label="Anchor link"
          >
            #
          </a>
        )}
      </h3>
    );
  } else {
    return (
      <h4 id={id} className="group relative">
        {children}
        {id && (
          <a
            href={`#${id}`}
            className="absolute opacity-0 group-hover:opacity-100 -ml-6 pr-2 text-blue-400"
            aria-label="Anchor link"
          >
            #
          </a>
        )}
      </h4>
    );
  }
};

// Callout box for important information
export const BlogCallout: React.FC<{
  children: ReactNode;
  type?: 'info' | 'warning' | 'tip';
}> = ({ children, type = 'info' }) => {
  // Different styling based on callout type
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-orange-50 border-orange-200 text-orange-800',
    tip: 'bg-green-50 border-green-200 text-green-800'
  };
  
  return (
    <div className={`p-4 my-6 rounded-lg border-l-4 ${styles[type]}`}>
      {children}
    </div>
  );
};

// Image caption component
export const BlogCaption: React.FC<{
  children: ReactNode;
}> = ({ children }) => {
  return (
    <p className="text-sm text-gray-600 italic text-center mt-2 mb-6">
      {children}
    </p>
  );
};

export default BlogPostBody;