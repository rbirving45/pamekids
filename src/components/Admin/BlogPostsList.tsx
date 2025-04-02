import React, { useState } from 'react';
import { Calendar, Edit, Trash2, Eye } from 'lucide-react';
import { BlogPost } from '../../types/blog';
import { deleteBlogPost } from '../../utils/firebase-service';

interface BlogPostsListProps {
  posts: BlogPost[];
  onRefresh: () => void;
  onEditPost: (post: BlogPost) => void;
}

const BlogPostsList: React.FC<BlogPostsListProps> = ({ posts, onRefresh, onEditPost }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not published';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle post deletion with confirmation
  const handleDeletePost = async (post: BlogPost) => {
    // Show confirmation dialog
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${post.title}"? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;
    
    try {
      setIsDeleting(true);
      setError(null);
      
      await deleteBlogPost(post.id);
      
      setSuccessMessage(`Successfully deleted "${post.title}"`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
      // Refresh the posts list
      onRefresh();
    } catch (err: any) {
      setError(`Failed to delete post: ${err.message}`);
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  // Get status label based on dates
  const getStatusLabel = (post: BlogPost) => {
    const now = new Date();
    const publishDate = post.publishDate ? new Date(post.publishDate) : null;
    
    if (!publishDate) {
      return <span className="px-2 py-1 bg-gray-200 text-gray-800 rounded-full text-xs">Draft</span>;
    }
    
    if (publishDate > now) {
      return <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded-full text-xs">Scheduled</span>;
    }
    
    return <span className="px-2 py-1 bg-green-200 text-green-800 rounded-full text-xs">Published</span>;
  };

  return (
    <div>
      {/* Error and success messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md">
          {successMessage}
        </div>
      )}
      
      {/* Loading indicator */}
      {isDeleting && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded-md">
          Processing...
        </div>
      )}
      
      {/* Blog posts table */}
      {posts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No blog posts found.</p>
          <button
            onClick={() => onRefresh()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Refresh
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Publish Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categories
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {posts.map(post => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 truncate max-w-xs">{post.title}</div>
                    {post.subtitle && (
                      <div className="text-xs text-gray-500 truncate max-w-xs">{post.subtitle}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {getStatusLabel(post)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar size={14} className="mr-1" />
                      {formatDate(post.publishDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex flex-wrap gap-1">
                      {post.categories && post.categories.length > 0 ? (
                        post.categories.map(category => (
                          <span key={category} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {category}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex justify-center space-x-2">
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-900"
                        title="View post"
                      >
                        <Eye size={18} />
                      </a>
                      <button
                        onClick={() => onEditPost(post)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit post"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeletePost(post)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete post"
                        disabled={isDeleting}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BlogPostsList;