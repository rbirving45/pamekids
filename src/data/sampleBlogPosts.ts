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
    content: `
    <h2>What's Hoppin’?</h2>
    <p>Spring has finally arrived in Greece and with it, so has the Easter season. Get ready for some egg-stra special children's activities happening around Athens to celebrate Easter with your little ones. Reserve your spot today - they are filling up fast!<br>
    <em>*All activities will be held in Greek and are FREE, however registration is required to book your spot.</em></p>
    <h3>Saturday, April 5, 2025</h3>
    <p><strong>11:00 - 12:00  |  Nordau Creative Learning Center</strong>  (Nordau 7)<br> <strong>"Painting for the Easter Table"</strong><br> Art workshop for children aged 6 to 12 years. We paint and laminate coasters to decorate the Easter table.   Registrations at tel. 210 6433128 (Monday - Friday, 10:00 - 18:00).</p>
    <h3>Sunday, April 6, 2025</h3>
    <p><strong>11:00 - 13:00  |  Vafiochoriou Creative Learning Center</strong> (Vafiochoriou & Karolidou 2)<br>
    <strong>"Welcome to us, spring"</strong><br> Musical and motor skills and art education workshops for children aged 6 to 10 years. The little gardeners bring spring and make the place bloom, planting flowers. Registrations at tel. 210 6427770 (Monday - Friday, 10:00 - 18:00).</p>
    <h3>Tuesday, April 8, 2025</h3>
    <p><strong>17:00 - 18:00 & 18:00 - 19:00  |  Creative Learning Center of Evelpidon</strong> (Evelpidon 18)<br>
    <strong>"Painting for the Easter Table"</strong><br>
    Art workshop for children aged 6 to 12 years. Paint and laminate coasters to decorate the Easter table. Registrations at tel. 210 8840520 (Monday - Friday, 10:00 - 18:00).</p>
    <h3>Saturday, April 12, 2025</h3>
    <p><strong>11:00 | Cultural Center "Melina"</strong>  (66 Heraklidon & Thessalonikis Street, Athens)<br>
    <strong>Greek Easter for the whole family at the Cultural Center "Melina"</strong><br>
    Educational activity for families with children from 5 to 12 years old. What does Easter mean to you? With spring mood, imagination, colors, palettes, etc. we create a resurrection composition on canvas. Participation applications at tel. 210 3414466 (Monday - Friday, 11:00 -14:00).<br>
    <br>
    <strong>11:00 - 12:00 & 12:00 - 13:00 |   Kypseli Creative Learning Center</strong> (Kalogera 18)<br> <strong>"Painting for the Easter Table"</strong><br> Art workshop for children aged 6 to 12 years. We paint and laminate coasters to decorate the Easter table. Registrations at tel. 210 8821428 (Monday - Friday, 10:00 - 18:00).<br>
    <br>
    <strong>11:30 | Athens City Gallery</strong> “Art and Space, and Easter Story!”</strong><br>
    For families with children aged 7 to 12. On the day of the celebration of the International Day of Human Space Flight, the Gallery will combine the works of Apostolos Fanakidis with the moment when man first walked in space. A historical event that paved the way for space exploration. After all, back in the distant 1961, when the first space flight was being prepared, it was Easter days. Registrations for participation at tel. 210 5202420 (Monday - Friday, 10:00 - 14:00).<br>
    <br>
    <strong>12:00 |  Museum of Folk Art and Tradition "Aggeliki Hatzimichali"</strong> (Aggeliki Hatzimichali 6, Plaka)<br>
    <strong>"Little Lazarines at the Museum"</strong> ages 6+<br>
    Easter program for the whole family. For the fourth year we decorate the "Lazarine" basket and sing the carols of the resurrection of Lazarus. Registrations at tel. 210 3243987 (Monday - Friday, 10:00 - 14:00).<br>
    <br>
    <strong>12:00 - 13:00 & 13:00 - 14:00  |  Neos Kosmos Creative Learning Center</strong>  (Sostratou 5)<br>
    <strong>"Painting Easter"</strong><br>
    Creative art workshop for children aged 6 to 12 years. Children will create Easter motifs with various materials. Registrations at tel. 210 9247036 (Monday - Friday, 11:00 - 18:00).</p>
    <h3>Sunday, April 13, 2025</h3>
    <p><strong>11:30 |  Athens Municipal Library</strong> (2 Domokou, Larissa Station)<br>
    <strong>"Resurrection with Words"</strong><br>
    Educational program for families with children over 13 years old and adults. Easter customs and habits of everyday life through great literary texts. Registrations at tel. 210 8236635 (Monday - Friday, 11:30 - 16:30).</p>
    <h3>Holy Monday, April 14, 2025</h3>
    <p><strong>11:00 |  Children's - Adolescent Library of the Municipality of Athens</strong> , Park for Children and Culture formerly KAPAPS (Lampsa & Trifylias, Ampelokipoi)<br>
    <strong>"Just Before Easter"</strong><br>
    Easter activity for children in the 5th and 6th grades of primary school. Come and celebrate Easter together through the magic of literature! Our little friends will have the opportunity to enjoy reading an excerpt from an Easter story, discuss the messages it conveys and participate in fun literacy games that will strengthen their love of reading. Through this experiential experience, children will come into contact with the tradition and spirit of Easter, while at the same time cultivating their creativity and imagination. Registrations at tel. 210 6929736 (Monday - Friday, 11:00 - 16:00).</p>
    <h3>Holy Tuesday, April 15, 2025</h3>
    <p><strong>11:30 |  Children's - Adolescent Library of the Municipality of Athens</strong> , Park for Children and Culture, former KAPAPS (Lampsa & Trifylias, Ampelokipoi)<br>
    <strong>"Just Before Easter"</strong><br>
    Easter activity for high school children. Come and celebrate Easter together through the magic of literature! Teenagers will have the opportunity to read excerpts from an Easter story, exchange thoughts and ideas, and participate in interactive literacy games, which will help them discover literature in a more lively and entertaining way. Through this experience, students will cultivate their critical thinking and creativity as well as their collaboration with their peers. Registrations at tel. 210 6929736 (Monday - Friday, 11:00 - 16:00).<br>
    <br>
    <strong>16:00 - 17:30 & 18:00 - 19:30 | Clay Center</strong> (Phanosthenous & Sphinx)<br>
    <strong>"A beautiful butterfly at the Resurrection"</strong><br>
    Clay and ceramics workshop for families with children 5 and up with clay butterfly molding. Registrations at tel. 210 9247031 (Monday & Friday: 15:00 - 20:00 & Tuesday, Wednesday, Thursday: 10:00 - 15:00).</p>
    <h3>Holy Wednesday, April 16, 2025</h3>
    <p><strong>11:00 |  Children's Municipal Library of Athens</strong> (2 Domokou, Larissa Station)<br>
    <strong>"Bookworms in Action!"</strong><br>
    Reading aloud for children aged 19 to 30 months. The presence of an accompanying person is required. Registrations at tel. 210 8810884 (Monday - Friday, 11:30 - 16:30).<br>
    <br>
    <strong>11:00 | Infant - Toddler Library , Park for Children and Culture, former KAPAPS</strong> (Lampsa & Trifylias, Ampelokipoi)<br>
    <strong>"Colorful Candles"</strong><br>
    Activity for children aged 4 to 6 years. Come and read Easter fairy tales and learn about the customs and traditions of our country. Followed by a workshop where children will make their own unique candles. Registration: 210 8829735 (Monday - Friday, 12:00 - 16:00)<br>
    <br>
    <strong>16:00 - 17:30 & 18:00 - 19:30 | Clay Center</strong> (Phanosthenous & Sphinx)<br>
    <strong>"A beautiful butterfly at the Resurrection"</strong><br>
    Clay and ceramics workshop for the whole family with clay butterfly molding. Registrations at tel. 210 9247031 (Monday & Friday: 15:00 - 20:00 & Tuesday, Wednesday, Thursday: 10:00 - 15:00).</p>
`,
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