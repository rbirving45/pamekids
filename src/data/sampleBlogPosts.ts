import { BlogPost } from '../types/blog';

// Sample blog post data for development and testing
export const sampleBlogPosts: BlogPost[] = [
  {
    id: '1',
    slug: 'top-10-playgrounds-in-athens',
    title: 'Top 10 Playgrounds in Athens for Kids',
    subtitle: 'Discover the best outdoor play areas for children of all ages',
    author: {
      name: 'Maria Papadopoulos',
      bio: 'Parent of two and Athens local with a passion for finding family-friendly activities',
      avatar: '/images/blog/avatars/maria.jpg'
    },
    publishDate: '2025-02-15T08:00:00Z',
    mainImage: {
      url: '/images/blog/playgrounds-athens-cover.jpg',
      alt: 'Children playing at a colorful playground in Athens',
      caption: 'The renovated playground at the National Garden is popular with local families'
    },
    summary: 'Athens offers numerous playgrounds where children can enjoy outdoor play. From the National Garden to the coastal parks, here are our top picks for safe and fun playgrounds across the city.',
    content: '<p>Athens is home to many wonderful playgrounds where children can play, explore, and make friends. As the weather in Greece is pleasant for most of the year, outdoor play spaces are an essential part of family life in the city.</p><h2>1. National Garden Playground</h2><p>Located in the heart of Athens, this recently renovated playground offers modern equipment in a historic setting. The shaded areas make it ideal even during hot summer days.</p><h2>2. Stavros Niarchos Foundation Park</h2><p>This state-of-the-art playground is part of the impressive Stavros Niarchos Foundation Cultural Center. The playground features innovative equipment and is surrounded by beautiful Mediterranean gardens.</p><h2>3. Alsos Petralona</h2><p>A hidden gem in the Petralona neighborhood, this playground is situated in a small forest that provides natural shade and a feeling of escape from the urban environment.</p>',
    readingTime: 7,
    tags: ['playgrounds', 'outdoor-play', 'athens'],
    categories: ['Outdoor Activities']
  },
  {
    id: '2',
    slug: 'childrens-museums-athens-guide',
    title: 'A Complete Guide to Children\'s Museums in Athens',
    subtitle: 'Educational and interactive experiences for curious minds',
    author: {
      name: 'Nikos Andreou',
      bio: 'Education specialist and museum enthusiast',
      avatar: '/images/blog/avatars/nikos.jpg'
    },
    publishDate: '2025-02-01T10:30:00Z',
    mainImage: {
      url: '/images/blog/museums-athens-cover.jpg',
      alt: 'Children exploring exhibits at the Hellenic Children\'s Museum',
      caption: 'Interactive learning at the Hellenic Children\'s Museum'
    },
    summary: 'Discover Athens\' best museums designed specifically for children, offering hands-on learning experiences that make education fun and engaging for young visitors.',
    content: '<p>Athens may be famous for its ancient museums and historical sites, but it also offers several excellent museums designed specifically with children in mind.</p><h2>Hellenic Children\'s Museum</h2><p>This interactive museum in the center of Athens is designed for children aged 4-12. It offers hands-on exhibits that encourage learning through play across various themes including science, art, and everyday life.</p><h2>Hellenic Cosmos</h2><p>While not exclusively a children\'s museum, the Foundation of the Hellenic World\'s cultural center offers impressive virtual reality exhibitions that bring Greek history to life in a way that captivates younger audiences.</p><h2>Museum of Illusions</h2><p>This fascinating museum presents a world of optical illusions and mind-bending exhibits that both educate and entertain children about perception, vision, and science.</p>',
    readingTime: 8,
    tags: ['museums', 'education', 'indoor-activities', 'athens'],
    categories: ['Cultural Activities', 'Rainy Day Ideas']
  },
  {
    id: '3',
    slug: 'summer-camps-athens-2025',
    title: 'Best Summer Camps in Athens for 2025',
    subtitle: 'Plan ahead for an unforgettable summer of fun and learning',
    author: {
      name: 'Elena Kyriakou',
      bio: 'Former camp counselor and parenting blogger',
      avatar: '/images/blog/avatars/elena.jpg'
    },
    publishDate: '2025-03-10T09:15:00Z',
    updatedDate: '2025-03-15T14:20:00Z',
    mainImage: {
      url: '/images/blog/summer-camps-cover.jpg',
      alt: 'Children participating in outdoor summer camp activities',
      caption: 'Summer camps provide opportunities for children to learn new skills and make friends'
    },
    images: [
      {
        url: '/images/blog/summer-camps-1.jpg',
        alt: 'Children learning to sail at a coastal summer camp',
        caption: 'Many coastal camps offer water sports and sailing lessons'
      },
      {
        url: '/images/blog/summer-camps-2.jpg',
        alt: 'Arts and crafts activity at summer camp',
        caption: 'Creative activities are a staple of most summer programs'
      },
      {
        url: '/images/blog/summer-camps-3.jpg',
        alt: 'Children on a nature hike during summer camp',
        caption: 'Nature exploration camps are increasingly popular'
      }
    ],
    summary: 'Planning for summer 2025? Our comprehensive guide covers the best summer camps in and around Athens, from sports and adventure camps to arts and science programs.',
    content: '<p>Summer camps provide children with opportunities to make new friends, learn new skills, and create lasting memories. Athens and its surrounding areas offer a wide variety of summer camp options to suit every interest and age group.</p><h2>Sports Camps</h2><p>For active children who love sports, Athens offers specialized camps focusing on everything from traditional team sports to tennis, swimming, and even sailing on the Athens Riviera.</p><h2>STEM and Robotics Camps</h2><p>Several educational institutions and organizations run summer programs focused on science, technology, engineering, and mathematics. These camps often include robotics, coding, and hands-on experiments.</p><h2>Arts and Performance Camps</h2><p>Creative children can explore their artistic talents at camps dedicated to visual arts, theater, music, and dance. Many of these programs culminate in performances or exhibitions for parents.</p>',
    readingTime: 10,
    tags: ['summer-camps', 'activities', 'athens', 'planning'],
    categories: ['Summer Activities', 'Camps'],
    relatedPosts: ['1', '2']
  }
];

// Helper function to get a blog post by slug
export const getBlogPostBySlug = (slug: string): BlogPost | undefined => {
  return sampleBlogPosts.find(post => post.slug === slug);
};

// Helper function to get blog posts by category
export const getBlogPostsByCategory = (category: string): BlogPost[] => {
  return sampleBlogPosts.filter(post =>
    post.categories && post.categories.includes(category)
  );
};

// Helper function to get blog posts by tag
export const getBlogPostsByTag = (tag: string): BlogPost[] => {
  return sampleBlogPosts.filter(post =>
    post.tags && post.tags.includes(tag)
  );
};

// Helper function to get related blog posts
export const getRelatedBlogPosts = (currentPostId: string): BlogPost[] => {
  const currentPost = sampleBlogPosts.find(post => post.id === currentPostId);
  
  if (!currentPost || !currentPost.relatedPosts || currentPost.relatedPosts.length === 0) {
    // If no related posts specified, return recent posts excluding current
    return sampleBlogPosts
      .filter(post => post.id !== currentPostId)
      .sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime())
      .slice(0, 3);
  }
  
  // Return the specified related posts
  return sampleBlogPosts.filter(post =>
    currentPost.relatedPosts?.includes(post.id)
  );
};