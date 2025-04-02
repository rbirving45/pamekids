import React, { useState, useEffect } from 'react';
import { BlogPost, Author, BlogImage } from '../../types/blog';
import { createBlogPost, updateBlogPost } from '../../utils/firebase-service';

interface BlogPostFormProps {
  editPost?: BlogPost | null;
  onSuccess: (post: BlogPost, isEdit: boolean) => void;
  onCancel: () => void;
}

const DEFAULT_AUTHOR: Author = {
  name: 'PameKids Team',
  role: 'Editor'
};

const BlogPostForm: React.FC<BlogPostFormProps> = ({
  editPost,
  onSuccess,
  onCancel
}) => {
  // Form state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [readingTime, setReadingTime] = useState<number | undefined>(undefined);
  const [author, setAuthor] = useState<Author>(DEFAULT_AUTHOR);
  const [mainImage, setMainImage] = useState<BlogImage | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');

  // Set form values when editing an existing post
  useEffect(() => {
    if (editPost) {
      setTitle(editPost.title || '');
      setSubtitle(editPost.subtitle || '');
      setSlug(editPost.slug || '');
      setSummary(editPost.summary || '');
      setContent(editPost.content || '');
      setPublishDate(editPost.publishDate || '');
      setReadingTime(editPost.readingTime);
      setAuthor(editPost.author || DEFAULT_AUTHOR);
      setMainImage(editPost.mainImage || null);
      setCategories(editPost.categories || []);
      setTags(editPost.tags || []);
    }
  }, [editPost]);

  // Generate a slug from the title
  const generateSlug = () => {
    if (!title) return;
    
    const generatedSlug = title
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-');
      
    setSlug(generatedSlug);
  };

  // Add a category
  const addCategory = () => {
    if (!newCategory.trim()) return;
    if (!categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()]);
    }
    setNewCategory('');
  };

  // Remove a category
  const removeCategory = (categoryToRemove: string) => {
    setCategories(categories.filter(category => category !== categoryToRemove));
  };

  // Add a tag
  const addTag = () => {
    if (!newTag.trim()) return;
    if (!tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
    }
    setNewTag('');
  };

  // Remove a tag
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Handle main image URL change
  const handleMainImageUrlChange = (url: string) => {
    setMainImage(current => ({
      ...current || { alt: '', caption: '', credit: '' },
      url
    }));
  };

  // Handle main image alt text change
  const handleMainImageAltChange = (alt: string) => {
    setMainImage(current => ({
      ...current || { url: '', caption: '', credit: '' },
      alt
    }));
  };

  // Handle main image caption change
  const handleMainImageCaptionChange = (caption: string) => {
    setMainImage(current => ({
      ...current || { url: '', alt: '', credit: '' },
      caption
    }));
  };

  // Handle main image credit change
  const handleMainImageCreditChange = (credit: string) => {
    setMainImage(current => ({
      ...current || { url: '', alt: '', caption: '' },
      credit
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!title) {
      setError('Title is required');
      return;
    }
    
    if (!slug) {
      setError('Slug is required');
      return;
    }
    
    if (!summary) {
      setError('Summary is required');
      return;
    }
    
    if (!content) {
      setError('Content is required');
      return;
    }
    
    if (!mainImage?.url) {
      setError('Main image URL is required');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Prepare blog post data
      const blogPostData: Omit<BlogPost, 'id'> = {
        title,
        subtitle,
        slug,
        summary,
        content,
        publishDate,
        updatedDate: new Date().toISOString(),
        readingTime: readingTime || Math.ceil(content.split(' ').length / 200), // Estimate reading time
        author,
        mainImage: mainImage as BlogImage,
        categories,
        tags
      };
      
      if (editPost) {
        // Update existing post
        await updateBlogPost(editPost.id, blogPostData);
        onSuccess({ ...blogPostData, id: editPost.id }, true);
      } else {
        // Create new post
        const result = await createBlogPost(blogPostData);
        onSuccess({ ...blogPostData, id: result.id }, false);
      }
    } catch (err: any) {
      setError(`Failed to save post: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-100 text-red-800 rounded-md">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => !slug && generateSlug()}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          
          {/* Subtitle */}
          <div>
            <label htmlFor="subtitle" className="block text-sm font-medium text-gray-700">
              Subtitle
            </label>
            <input
              type="text"
              id="subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          {/* Slug */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
              Slug *
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                /blog/
              </span>
              <input
                type="text"
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="block w-full flex-1 rounded-none rounded-r-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              URL-friendly name for your blog post
            </p>
          </div>
          
          {/* Summary */}
          <div>
            <label htmlFor="summary" className="block text-sm font-medium text-gray-700">
              Summary *
            </label>
            <textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              A brief description for previews and SEO
            </p>
          </div>
          
          {/* Main Image */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Main Image *</h3>
            
            <div className="space-y-3">
              <div>
                <label htmlFor="mainImageUrl" className="block text-xs text-gray-500">
                  Image URL
                </label>
                <input
                  type="url"
                  id="mainImageUrl"
                  value={mainImage?.url || ''}
                  onChange={(e) => handleMainImageUrlChange(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="mainImageAlt" className="block text-xs text-gray-500">
                  Alt Text
                </label>
                <input
                  type="text"
                  id="mainImageAlt"
                  value={mainImage?.alt || ''}
                  onChange={(e) => handleMainImageAltChange(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="mainImageCaption" className="block text-xs text-gray-500">
                  Caption
                </label>
                <input
                  type="text"
                  id="mainImageCaption"
                  value={mainImage?.caption || ''}
                  onChange={(e) => handleMainImageCaptionChange(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="mainImageCredit" className="block text-xs text-gray-500">
                  Photo Credit
                </label>
                <input
                  type="text"
                  id="mainImageCredit"
                  value={mainImage?.credit || ''}
                  onChange={(e) => handleMainImageCreditChange(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Right column */}
        <div className="space-y-6">
          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">
              Content *
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={15}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              HTML content for your blog post
            </p>
          </div>
          
          {/* Publish Date */}
          <div>
            <label htmlFor="publishDate" className="block text-sm font-medium text-gray-700">
              Publish Date
            </label>
            <input
              type="datetime-local"
              id="publishDate"
              value={publishDate}
              onChange={(e) => setPublishDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Leave empty to save as draft
            </p>
          </div>
          
          {/* Reading Time */}
          <div>
            <label htmlFor="readingTime" className="block text-sm font-medium text-gray-700">
              Reading Time (minutes)
            </label>
            <input
              type="number"
              id="readingTime"
              value={readingTime || ''}
              onChange={(e) => setReadingTime(e.target.value ? parseInt(e.target.value, 10) : undefined)}
              min="1"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Estimated time to read the post (optional)
            </p>
          </div>
          
          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Categories
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="block w-full flex-1 rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Add a category"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
              />
              <button
                type="button"
                onClick={addCategory}
                className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {categories.map(category => (
                <div key={category} className="flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm">
                  <span className="text-blue-800">{category}</span>
                  <button
                    type="button"
                    onClick={() => removeCategory(category)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tags
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="block w-full flex-1 rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Add a tag"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <button
                type="button"
                onClick={addTag}
                className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map(tag => (
                <div key={tag} className="flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm">
                  <span className="text-gray-800">{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-gray-600 hover:text-gray-800"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Form actions */}
      <div className="flex justify-end space-x-3 pt-5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : editPost ? 'Update Post' : 'Create Post'}
        </button>
      </div>
    </form>
  );
};

export default BlogPostForm;