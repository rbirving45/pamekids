// src/data/locations.ts

export type ActivityType = 'indoor-play' | 'outdoor-play' | 'sports' | 'arts' | 'music' | 'education' | 'entertainment';
export interface Location {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  types: ActivityType[];
  primaryType?: ActivityType;
  description: string;
  address: string;
  ageRange: {
    min: number;
    max: number;
  };
  priceRange?: string;
  openingHours: Record<string, string>;
  contact: {
    phone?: string;
    email?: string;
    website?: string;
  };
  placeData?: {
    rating?: number;
    userRatingsTotal?: number;
    photos?: google.maps.places.PlacePhoto[];
    photoUrls?: string[];
  };
  images?: string[];
  featured?: boolean;
}

export const sampleLocations: Location[] = [  
    
    {
    id: 'ChIJaUPJzaufoRQRHlNSeShkDfo',
    name: 'Eurohoops Academy',
    coordinates: {
      lat: 38.122515,
      lng: 23.857702
    },
    placeData: {
      rating: 4.6,
      userRatingsTotal: 759
    },
    address: 'Leof. Marathonos 1, Anixi 145 69, Greece',
    types: ['sports'],
    primaryType: 'sports',
    ageRange: {
      min: 3,
      max: 17
    },
    description: 'Eurohoops Academy is a state-of-the-art basketball facility in northern Athens, offering top-notch training for children aged 6-17. With high-quality courts, advanced equipment, and a welcoming in-house cafeteria, it is an excellent choice for families seeking a fun and engaging athletic experience for their young basketball enthusiasts.',
    openingHours: {
      Monday: '4:30 – 11:30 PM',
      Tuesday: '4:30 – 11:30 PM',
      Wednesday: '4:30 – 11:30 PM',
      Thursday: '4:30 – 11:30 PM',
      Friday: '4:30 – 11:30 PM',
      Saturday: '8:00 AM – 11:30 PM',
      Sunday: '8:00 AM – 11:30 PM'
    },
    priceRange: '€€',
    contact: {
      phone: '697 167 1114',
      email: 'contact@eurohoopsacademy.com',
      website: 'http://www.eurohoopsacademy.net/'
    }
    }
,
    {
    id: 'ChIJ8etiBd29oRQRny4SOAjExCM',
    name: 'Hakuna Matata Family Park',
    coordinates: {
        lat: 38.074228,
        lng: 23.7944887
    },
    address: 'Acharnon 53, Kifisia 145 61, Greece',
    types: ['indoor-play'],
    primaryType: 'indoor-play',
    ageRange: {
        min: 2,
        max: 5
    },
    description: 'Hakuna Matata Family Park is an excellent choice for families with children in Athens. It offers a spacious outdoor play area, a variety of activities, and attentive staff to ensure kids safety and enjoyment. The park is well-suited for a range of ages, with clean facilities and tasty food options nearby.',
    openingHours: {
        Monday: '8:00 AM – 10:00 PM',
        Tuesday: '8:00 AM – 10:00 PM',
        Wednesday: '8:00 AM – 10:00 PM',
        Thursday: '8:00 AM – 10:00 PM',
        Friday: '8:00 AM – 10:00 PM',
        Saturday: '8:00 AM – 10:00 PM',
        Sunday: '8:00 AM – 10:00 PM'
    },
    priceRange: '€',
    contact: {
        phone: '21 5215 1807',
        email: 'email',
        website: 'https://hakunamatatafamilypark.gr/'
    }
    }
,
    {
    id: 'ChIJzQItEbSfoRQRgLfjM7mpOxI',
    name: 'Ekali Park',
    coordinates: {
        lat: 38.1244816,
        lng: 23.8554781
    },
    address: 'Leof. Marathonos 11, Anixi 145 69, Greece',
    types: ['outdoor-play','indoor-play'],
    primaryType: 'outdoor-play',
    ageRange: {
        min: 2,
        max: 9
    },
    description: 'Ekali Park offers a spacious outdoor area with various play equipment like trampolines, making it a great destination for families with young children. While facilities can sometimes be disorganized, the park provides a relaxing space for parents to supervise their kids activities. Recommended for ages 3-10.',
    openingHours: {
        Monday: '5:00 – 10:00 PM',
        Tuesday: '5:00 – 10:00 PM',
        Wednesday: '5:00 – 10:00 PM',
        Thursday: '5:00 – 10:00 PM',
        Friday: '5:00 – 10:00 PM',
        Saturday: '11:00 AM – 10:00 PM',
        Sunday: '11:00 AM – 10:00 PM'
    },
    priceRange: '€',
    contact: {
        phone: '',
        email: 'email',
        website: 'https://www.facebook.com/ekaliparkmagiclandanoixi'
    }
    }
,
    {
    id: 'ChIJRVX62Q2foRQRAhhlPfLFCnw',
    name: 'Fairytale Playland',
    coordinates: {
        lat: 38.0918541,
        lng: 23.7934323
    },
    address: 'Ilision 32, Kifisia 145 64, Greece',
    types: ['indoor-play'],
    primaryType: 'indoor-play',
    ageRange: {
        min: 2,
        max: 6
    },
    description: 'Fairytale Playland is a delightful indoor playground perfect for kids under 12. With a variety of play equipment, it is great for birthday parties and energetic playdates. Reviewers praise the clean, spacious facilities and friendly service, though some note the music can be loud at times. Families will find it a fun, safe option for active children.',
    openingHours: {
        Monday: 'Closed',
        Tuesday: '5:00 – 9:30 PM',
        Wednesday: '5:00 – 9:30 PM',
        Thursday: '5:00 – 9:30 PM',
        Friday: '5:00 – 9:30 PM',
        Saturday: '10:30 AM – 9:30 PM',
        Sunday: '10:30 AM – 9:30 PM'
    },
    priceRange: '€',
    contact: {
        phone: '21 0620 0255',
        email: 'email',
        website: ''
    }
    }
,
    {
    id: 'ChIJudUmiaufoRQRtu14CixpjCI',
    name: 'PLAYMOBIL FunPark Athens',
    coordinates: {
        lat: 38.1017515,
        lng: 23.8066777
    },
    address: 'Amaliados 4, Kifisia 145 64, Greece',
    types: ['indoor-play'],
    primaryType: 'indoor-play',
    ageRange: {
        min: 0,
        max: 8
    },
    description: 'The PLAYMOBIL FunPark Athens is a wonderland for children, with a vast collection of Playmobil toys to play with for the whole day. The park has various themed zones, a cafeteria serving delicious snacks and drinks, and attentive staff ensuring a clean and enjoyable experience for families. It is an excellent choice for kids to explore, create, and have fun.',
    openingHours: {
        Monday: 'Closed',
        Tuesday: '10:00 AM – 8:00 PM',
        Wednesday: '10:00 AM – 8:00 PM',
        Thursday: '10:00 AM – 8:00 PM',
        Friday: '10:00 AM – 9:00 PM',
        Saturday: '10:00 AM – 9:00 PM',
        Sunday: '10:00 AM – 9:00 PM'
    },
    priceRange: '€€',
    contact: {
        phone: '21 0800 0018',
        email: 'email',
        website: 'https://playmobil-funpark.gr/'
    }
    }
,
  {
    id: 'ChIJMb0tyFGeoRQR7DcvupCHjXo',
    name: 'Andreas Papandreou Park',
    coordinates: {
      lat: 38.10311650000001,
      lng: 23.8193545
    },
    address: '146 71, Eschilou 18, Nea Erithrea 146 71, Greece',
    types: ['outdoor-play'],
    primaryType: 'outdoor-play',
    ageRange: {
      min: 3,
      max: 16
    },
    description: 'Andreas Papandreou Park is a fantastic outdoor space for families with children. It features a dedicated bike path for older kids to practice their cycling skills, as well as a secure playground with play structures for all ages. There is also a coffee shop on-site, making it a great spot for parents to relax while the kids burn off energy. However, the lack of shade can be an issue during hot months, so supervision is recommended.',
    openingHours: {
      Monday: '8:00 AM – 9:00 PM',
      Tuesday: '8:00 AM – 9:00 PM',
      Wednesday: '8:00 AM – 9:00 PM',
      Thursday: '8:00 AM – 9:00 PM',
      Friday: '8:00 AM – 9:00 PM',
      Saturday: '8:00 AM – 9:00 PM',
      Sunday: '8:00 AM – 9:00 PM'
    },
    priceRange: 'Free entrance',
    contact: {
      phone: '21 0625 4283',
      email: 'email',
      website: 'website'
    }
  }
,
  {
    id: 'ChIJKTSQPN6eoRQRwLauC168650',
    name: 'Goulandris Natural History Museum',
    coordinates: {
      lat: 38.07463,
      lng: 23.8144081
    },
    address: 'Othonos 100, Kifisia 145 62, Greece',
    types: ['education'],
    primaryType: 'education',
    ageRange: {
      min: 0,
      max: 18
    },
    description: 'The Goulandris Natural History Museum offers a fun and educational experience for families with children. Featuring a variety of animal and plant exhibits, interactive displays, and a mini-dome for short films, the museum provides an engaging hands-on learning environment. While touching exhibits is generally not allowed, the knowledgeable staff and beautiful garden cafe make this a wonderful outing for kids of all ages.',
    openingHours: {
      Monday: '9:00 AM – 4:00 PM',
      Tuesday: '9:00 AM – 4:00 PM',
      Wednesday: '9:00 AM – 4:00 PM',
      Thursday: '9:00 AM – 4:00 PM',
      Friday: '9:00 AM – 4:00 PM',
      Saturday: '10:00 AM – 3:00 PM',
      Sunday: '10:00 AM – 3:00 PM'
    },
    priceRange: '€€',
    contact: {
      phone: '21 0801 5870',
      email: 'email',
      website: 'http://www.gnhm.gr/'
    }
  }
,
  {
    id: 'ChIJ2xBEBsKeoRQR4EW4dXVTKy4',
    name: 'Mavromichali park',
    coordinates: {
      lat: 38.0720379,
      lng: 23.82810449999999
    },
    address: '39, Mavromichali 37, Kifisia 145 62, Greece',
    types: ['outdoor-play'],
    primaryType: 'outdoor-play',
    ageRange: {
      min: 2,
      max: 9
    },
    description: 'Mavromichali park is a well-maintained green oasis with a high-quality playground, perfect for families with children of all ages. With ample shade, this peaceful suburban park offers a pleasant afternoon of outdoor play and picnicking. However, cleanliness concerns have been noted in some reviews.',
    openingHours: {
      Monday: 'Open 24 hours',
      Tuesday: 'Open 24 hours',
      Wednesday: 'Open 24 hours',
      Thursday: 'Open 24 hours',
      Friday: 'Open 24 hours',
      Saturday: 'Open 24 hours',
      Sunday: 'Open 24 hours'
    },
    priceRange: 'Free entrance',
    contact: {
      phone: '',
      email: 'n/a',
      website: 'website'
    }
  }
,
  {
    id: 'ChIJQ6JKoFmZoRQR6sqpVJsP50s',
    name: 'Ninja Park Athens',
    coordinates: {
      lat: 38.09792999999999,
      lng: 23.8024394
    },
    address: 'Agravlis 33, Kifisia 145 64, Greece',
    types: ['sports'],
    primaryType: 'sports',
    ageRange: {
      min: 4,
      max: 14
    },
    description: 'Ninja Park Athens is an exciting indoor playground perfect for active kids aged 6-12. With various climbing structures, soft padded floors, and enthusiastic staff, it is a great spot for children to burn off energy, challenge themselves, and have a blast with friends. Easy parking and generally positive reviews make it a convenient and enjoyable family destination.',
    openingHours: {
      Monday: 'Closed',
      Tuesday: '5:00 – 10:00 PM',
      Wednesday: '5:00 – 10:00 PM',
      Thursday: '5:00 – 10:00 PM',
      Friday: '5:00 – 10:00 PM',
      Saturday: '10:00 AM – 6:00 PM',
      Sunday: '10:00 AM – 6:00 PM'
    },
    priceRange: '€',
    contact: {
      phone: '698 396 7409',
      email: 'email',
      website: 'https://ninjapark.gr/'
    }
  }
,
  {
    id: 'ChIJI3S6BQ-foRQRssC168iV57w',
    name: 'Super Market Thanopoulos',
    coordinates: {
      lat: 38.0917967,
      lng: 23.79685
    },
    address: 'Elaion 38, Kifisia 145 64, Greece',
    types: ['indoor-play'],
    primaryType: 'indoor-play',
    ageRange: {
      min: 2,
      max: 8
    },
    description: 'Super Market Thanopoulos is a must-visit for families with children, especially those with dietary restrictions. This supermarket offers an impressive selection of gluten-free products, including a rooftop cafe serving delicious gluten-free treats. It is a convenient one-stop-shop for grocery essentials and a great place to enjoy a relaxing meal with the kids.',
    openingHours: {
      Monday: '8:00 AM – 9:00 PM',
      Tuesday: '8:00 AM – 9:00 PM',
      Wednesday: '8:00 AM – 9:00 PM',
      Thursday: '8:00 AM – 9:00 PM',
      Friday: '8:00 AM – 9:00 PM',
      Saturday: '8:00 AM – 8:00 PM',
      Sunday: 'Closed'
    },
    priceRange: 'Free entrance',
    contact: {
      phone: '21 0620 1878',
      email: 'email',
      website: 'http://www.thanopoulos.gr/'
    }
  }
,
  {
    id: 'ChIJuz--QSyZoRQRWycZnRTb0Jw',
    name: 'XPLORE Entertainment Center',
    coordinates: {
      lat: 38.0346371,
      lng: 23.7910334
    },
    address: 'Leof. Kifisias 37Α, Marousi 151 23, Greece',
    types: ['indoor-play'],
    primaryType: 'indoor-play',
    ageRange: {
      min: 3,
      max: 12
    },
    description: 'XPLORE Entertainment Center is an engaging, multi-level play space perfect for kids of all ages. With an aquarium, science exhibits, and fun physical activities like bumper cars and a play TV studio, there is something for every child to enjoy. Parents will appreciate the variety of educational and recreational options.',
    openingHours: {
      Monday: '10:00 AM – 9:00 PM',
      Tuesday: '10:00 AM – 9:00 PM',
      Wednesday: '10:00 AM – 9:00 PM',
      Thursday: '10:00 AM – 9:00 PM',
      Friday: '10:00 AM – 9:00 PM',
      Saturday: '10:00 AM – 9:00 PM',
      Sunday: '11:00 AM – 7:00 PM'
    },
    priceRange: '€€',
    contact: {
      phone: '21 0688 5450',
      email: 'email',
      website: 'https://www.x-plore.gr/'
    }
  }
,
  {
    id: 'ChIJJa4OuQGfoRQRVAmqgpt-H_Y',
    name: 'Gymboree Play & Music - Nea Erythrea',
    coordinates: {
      lat: 38.0932409,
      lng: 23.8094471
    },
    address: 'Tatoiou 102, Nea Erithrea 146 71, Greece',
    types: ['indoor-play','music'],
    primaryType: 'indoor-play',
    ageRange: {
      min: 1,
      max: 5
    },
    description: 'Gymboree Play & Music offers a fantastic indoor play space for children, with structured activities and a relaxed atmosphere. Suitable for babies and toddlers, the facility features a variety of elements for climbing, exploring, and interacting with other kids. The welcoming staff and clean, accessible space make it an excellent choice for family outings.',
    openingHours: {
      Monday: 'Hours not available',
      Tuesday: 'Hours not available',
      Wednesday: 'Hours not available',
      Thursday: 'Hours not available',
      Friday: 'Hours not available',
      Saturday: 'Hours not available',
      Sunday: 'Hours not available'
    },
    priceRange: '€',
    contact: {
      phone: '21 0800 1610',
      email: 'email',
      website: 'http://gymboreeplaymusic.gr/'
    }
  }
,
  {
    id: 'ChIJtygeFUC8oRQRIItumil0pBk',
    name: 'Stavros Niarchos Park',
    coordinates: {
      lat: 37.9421989,
      lng: 23.6934583
    },
    address: 'Leof. Andrea Siggrou 364, Kallithea 176 74, Greece',
    types: ['outdoor-play'],
    primaryType: 'outdoor-play',
    ageRange: {
      min: 0,
      max: 12
    },
    description: 'Stavros Niarchos Park is a stunning family-friendly destination in Athens, offering vast green spaces, contemporary architecture, and a range of free activities. Suitable for all ages, visitors can enjoy ice skating, light sculptures, a childrens library, and panoramic city views, making it an excellent choice for a day out.',
    openingHours: {
      Monday: '6:00 AM – 12:00 AM',
      Tuesday: '6:00 AM – 12:00 AM',
      Wednesday: '6:00 AM – 12:00 AM',
      Thursday: '6:00 AM – 12:00 AM',
      Friday: '6:00 AM – 12:00 AM',
      Saturday: '6:00 AM – 12:00 AM',
      Sunday: '6:00 AM – 12:00 AM'
    },
    priceRange: 'Free entrance',
    contact: {
      phone: '21 6809 1000',
      email: 'email',
      website: 'http://www.snfcc.org/'
    }
  }
,
  {
    id: 'ChIJQ2TZZBW8oRQRbetWhC_0E8U',
    name: 'Stavros Niarchos Foundation Cultural Center',
    coordinates: {
      lat: 37.9398564,
      lng: 23.6921202
    },
    address: 'Leof. Andrea Siggrou 364, Kallithea 176 74, Greece',
    types: ['education'],
    primaryType: 'education',
    ageRange: {
      min: 0,
      max: 18
    },
    description: 'The Stavros Niarchos Foundation Cultural Center is a fantastic destination for families with children in Athens. This modern, green oasis offers a variety of activities, including playgrounds, sports facilities, and cultural events, making it a perfect spot for kids to explore, play, and enjoy the outdoors. The scenic paths, water features, and serene atmosphere provide a refreshing escape from the hustle and bustle.',
    openingHours: {
      Monday: '6:00 AM – 12:00 AM',
      Tuesday: '6:00 AM – 12:00 AM',
      Wednesday: '6:00 AM – 12:00 AM',
      Thursday: '6:00 AM – 12:00 AM',
      Friday: '6:00 AM – 12:00 AM',
      Saturday: '6:00 AM – 12:00 AM',
      Sunday: '6:00 AM – 12:00 AM'
    },
    priceRange: 'Free entrance',
    contact: {
      phone: '21 6809 1000',
      email: 'email',
      website: 'http://www.snfcc.org/'
    }
  }
,
  {
    id: 'ChIJAY6ARxm8oRQROcOTG3dSK1o',
    name: 'Flisvos Park',
    coordinates: {
      lat: 37.92821370000001,
      lng: 23.6879282
    },
    address: 'Πάρκο Φλοίσβου Λεωφόρος Ποσειδονος παλαιο φαληρο, Athina 175 61, Greece',
    types: ['outdoor-play'],
    primaryType: 'outdoor-play',
    ageRange: {
      min: 3,
      max: 12
    },
    description: 'Flisvos Park is a delightful amusement park suitable for families with children of all ages. It offers a range of outdoor activities, an indoor play area, and scenic waterfront views. Ideal for a fun-filled day, the park provides a safe and engaging environment for kids to explore and play.',
    openingHours: {
      Monday: '10:00 AM – 9:00 PM',
      Tuesday: '10:00 AM – 9:00 PM',
      Wednesday: '10:00 AM – 9:00 PM',
      Thursday: '10:00 AM – 9:00 PM',
      Friday: '10:00 AM – 9:00 PM',
      Saturday: '10:00 AM – 9:00 PM',
      Sunday: '10:00 AM – 9:00 PM'
    },
    priceRange: 'Free entrance',
    contact: {
      phone: '21 0988 5140',
      email: 'email',
      website: 'http://www.parkoflisvos.gr/'
    }
  }
,
  {
    id: 'ChIJ3fMLn_aaoRQRYw5jA5ltkMA',
    name: 'Attica Zoological Park',
    coordinates: {
      lat: 37.9802674,
      lng: 23.9107779
    },
    address: 'Spata 190 04, Greece',
    types: ['outdoor-play'],
    primaryType: 'outdoor-play',
    ageRange: {
      min: 0,
      max: 18
    },
    description: 'Attica Zoological Park offers a diverse and well-cared-for collection of animals, from dolphins to rhinos, in a clean and spacious environment. This family-friendly destination provides an engaging and educational experience for children of all ages, with a variety of facilities and activities to enjoy.',
    openingHours: {
      Monday: '9:00 AM – 5:00 PM',
      Tuesday: '9:00 AM – 5:00 PM',
      Wednesday: '9:00 AM – 5:00 PM',
      Thursday: '9:00 AM – 5:00 PM',
      Friday: '9:00 AM – 5:00 PM',
      Saturday: '9:00 AM – 5:00 PM',
      Sunday: '9:00 AM – 5:00 PM'
    },
    priceRange: '€€',
    contact: {
      phone: '21 0663 4725',
      email: 'email',
      website: 'https://www.atticapark.com/'
    }
  }
,
  {
    id: 'ChIJ3UNwIEKdoRQRUemi4yTedyw',
    name: 'Farmamoo',
    coordinates: {
      lat: 38.0952607,
      lng: 23.9311903
    },
    address: 'Leof. Dionisou, Nea Makri 190 05, Greece',
    types: ['outdoor-play'],
    primaryType: 'outdoor-play',
    ageRange: {
      min: 2,
      max: 8
    },
    description: 'Farmamoo is a delightful amusement park perfect for young children. Offering opportunities to interact with friendly farm animals, explore nature, and enjoy family-friendly activities, this well-maintained attraction provides a fun and educational experience. Families will appreciate the scenic setting and the chance for kids to connect with the natural world.',
    openingHours: {
      Monday: 'Closed',
      Tuesday: 'Closed',
      Wednesday: 'Closed',
      Thursday: 'Closed',
      Friday: 'Closed',
      Saturday: '10:00 AM – 6:00 PM',
      Sunday: 'Closed'
    },
    priceRange: '€€',
    contact: {
      phone: '698 707 2816',
      email: 'email',
      website: 'website'
    }
  }
,
  {
    id: 'ChIJX1GoNxOgoRQR6AYJdrk_-zY',
    name: 'Cable Car Station Regency Casinos',
    coordinates: {
      lat: 38.13774170000001,
      lng: 23.7418373
    },
    address: 'Parnithos, Acharnes 136 72, Greece',
    types: ['entertainment'],
    primaryType: 'entertainment',
    ageRange: {
      min: 0,
      max: 18
    },
    description: 'The Cable Car Station Regency Casinos offers a thrilling 10-minute ride above the scenic slopes of Mt. Parnitha, providing stunning views of Athens below. This activity is suitable for all ages, with free cable car access and ample parking. Families can enjoy the breathtaking panorama and explore the surrounding natural environment.',
    openingHours: {
      Monday: '9:00 AM – 12:00 AM',
      Tuesday: '9:00 AM – 12:00 AM',
      Wednesday: '9:00 AM – 12:00 AM',
      Thursday: '9:00 AM – 12:00 AM',
      Friday: '9:00 AM – 12:00 AM',
      Saturday: '9:00 AM – 12:00 AM',
      Sunday: '9:00 AM – 12:00 AM'
    },
    priceRange: 'Free entrance',
    contact: {
      phone: '21 0242 1234',
      email: 'email',
      website: 'https://www.athens.regencycasinos.gr/'
    }
  }
,
  {
    id: 'ChIJX4Ou5-yeoRQRSqfWbD2BWKc',
    name: 'Zaatar',
    coordinates: {
      lat: 38.0989969,
      lng: 23.8197301
    },
    address: 'Chimarra 7, Nea Erithrea 146 71, Greece',
    types: ['indoor-play'],
    primaryType: 'indoor-play',
    ageRange: {
      min: 2,
      max: 8
    },
    description: 'Zaatar is a family-friendly restaurant with a beautiful garden area, offering a range of international and Greek dishes. While the food quality has some mixed reviews, the overall atmosphere is pleasant, with live music on Thursdays. Families can enjoy the spacious setting and child-friendly facilities.',
    openingHours: {
      Monday: 'Closed',
      Tuesday: '1:00 PM – 12:00 AM',
      Wednesday: '1:00 PM – 12:00 AM',
      Thursday: '1:00 PM – 12:00 AM',
      Friday: '1:00 PM – 12:00 AM',
      Saturday: '1:00 PM – 12:00 AM',
      Sunday: '1:00 – 7:00 PM'
    },
    priceRange: '€€',
    contact: {
      phone: '21 0807 0969',
      email: 'email@email.com',
      website: 'http://zaatar.gr/'
    }
  }
,
  {
    id: 'ChIJQ0HSMMGYoRQRGAjxLDV8OUY',
    name: 'Village Cinemas @ The Mall Athens',
    coordinates: {
      lat: 38.0446112,
      lng: 23.7902429
    },
    address: 'Ανδρέα Παπανδρέου 35 - Μαρούσι 35 Andrea Papandreou - Maroussi, Andrea Papandreou 35, Marousi 151 22, Greece',
    types: ['entertainment'],
    primaryType: 'entertainment',
    ageRange: {
      min: 5,
      max: 18
    },
    description: 'Village Cinemas @ The Mall Athens is a top-notch movie theater that offers a fantastic cinematic experience for families. With large, comfortable seating, high-quality audio and visuals, and a variety of snacks, it is a great option for kids of all ages to enjoy the latest films in a clean, modern setting.',
    openingHours: {
      Monday: '5:00 – 11:30 PM',
      Tuesday: '5:00 – 11:30 PM',
      Wednesday: '5:00 – 11:30 PM',
      Thursday: '5:00 – 11:30 PM',
      Friday: '5:00 – 11:30 PM',
      Saturday: '1:00 – 11:30 PM',
      Sunday: '1:00 – 11:30 PM'
    },
    priceRange: '€€',
    contact: {
      phone: 'phone',
      email: 'email',
      website: 'http://www.villagecinemas.gr/'
    }
  }
,
  {
    id: 'ChIJuwQuciO9oRQRw2P2aWXuwYA',
    name: 'Museum of Illusions Athens',
    coordinates: {
      lat: 37.9768103,
      lng: 23.7228082
    },
    address: 'Ermou 119 Entrance from, Astiggos 12, Athina 105 55, Greece',
    types: ['entertainment'],
    primaryType: 'entertainment',
    ageRange: {
      min: 0,
      max: 18
    },
    description: 'The Museum of Illusions Athens is an engaging, interactive experience perfect for families with kids of all ages. Discover mind-bending optical illusions, holograms, and hands-on exhibits that challenge your perception. The museum is well-organized, with friendly staff to help you make the most of your visit. It is a fun and educational activity that will delight both children and adults.',
    openingHours: {
      Monday: '10:00 AM – 9:00 PM',
      Tuesday: '10:00 AM – 9:00 PM',
      Wednesday: '10:00 AM – 9:00 PM',
      Thursday: '10:00 AM – 9:00 PM',
      Friday: '10:00 AM – 9:00 PM',
      Saturday: '10:00 AM – 9:00 PM',
      Sunday: '10:00 AM – 9:00 PM'
    },
    priceRange: '€€',
    contact: {
      phone: '21 0220 1610',
      email: 'email',
      website: 'https://athens.museumofillusions.gr/'
    }
  }
,
  {
    id: 'ChIJ-SZuer-foRQR_xVHROWWreM',
    name: 'Vagoni Cafe & Stables',
    coordinates: {
      lat: 38.1196714,
      lng: 23.7904324
    },
    placeData: {
      rating: 4.5,
      userRatingsTotal: 393
    },
    address: 'Tatoiou 187, Acharnes 136 72, Greece',
    types: ['sports'],
    primaryType: 'sports',
    ageRange: {
      min: 5,
      max: 18
    },
    description: 'Vagoni Cafe & Stables is a charming countryside oasis near Athens, perfect for families with children. With a peaceful setting, you can enjoy coffee and snacks while watching horses, dogs, and chickens. The cafe offers horseback riding tours, making it an ideal destination for kids to interact with animals and experience the great outdoors.',
    openingHours: {
      Monday: 'Closed',
      Tuesday: '4:00 – 7:00 PM',
      Wednesday: '4:00 – 7:00 PM',
      Thursday: '4:00 – 7:00 PM',
      Friday: '4:00 – 7:00 PM',
      Saturday: '10:00 AM – 6:00 PM',
      Sunday: '10:00 AM – 6:00 PM'
    },
    priceRange: '€',
    contact: {
      phone: '694 462 0825',
      email: 'email',
      website: 'https://www.vagonistables.gr/'
    }
  }
,
  {
    id: 'ChIJOV-gr2iYoRQRovGQyikHAX4',
    name: 'Gymboree Psychiko',
    coordinates: {
      lat: 38.00041280000001,
      lng: 23.7774833
    },
    placeData: {
      rating: 4.7,
      userRatingsTotal: 210
    },
    address: 'Grigoriou Xenopoulou 3Α, Neo Psichiko 154 51, Greece',
    types: ['indoor-play','music'],
    primaryType: 'indoor-play',
    ageRange: {
      min: 0,
      max: 6
    },
    description: 'Gymboree Psychiko is a lively play space perfect for young children up to 7 years old. With a spacious, well-organized indoor area and an outdoor yard, it offers a variety of engaging activities and entertainment for kids. The friendly staff and clean facilities make it an excellent choice for birthday parties or active playtime.',
    openingHours: {
      Monday: '4:30 – 8:00 PM',
      Tuesday: '10:00 AM – 1:00 PM, 4:30 – 8:00 PM',
      Wednesday: '4:30 – 8:00 PM',
      Thursday: '10:00 AM – 1:00 PM, 5:00 – 8:00 PM',
      Friday: '4:30 – 8:00 PM',
      Saturday: 'Closed',
      Sunday: 'Closed'
    },
    priceRange: '€€',
    contact: {
      phone: '21 0677 7017',
      email: 'contact@gymboreepsychiko.com',
      website: 'http://www.gymboreeplaymusic.gr/'
    }
  }
,
  {
    id: 'ChIJzbCx07SYoRQRiBZcX8rtW_0',
    name: 'TOYS LAND Athens',
    coordinates: {
      lat: 38.0616255,
      lng: 23.7838749
    },
    placeData: {
      rating: 4.1,
      userRatingsTotal: 420
    },
    address: 'Leof. Amarousiou 49, Likovrisi 141 23, Greece',
    types: ['indoor-play'],
    primaryType: 'indoor-play',
    ageRange: {
      min: 2,
      max: 8
    },
    description: "TOYS LAND Athens is a cozy indoor soft play and party venue perfect for kids under 10. With a family-friendly atmosphere, it offers a safe, clean play area and friendly staff, making it a convenient option for playdates or birthday celebrations, especially during inclement weather.",
    openingHours: {
      Monday: 'Closed',
      Tuesday: 'Closed',
      Wednesday: 'Closed',
      Thursday: 'Closed',
      Friday: '5:00 – 9:00 PM',
      Saturday: '10:00 AM – 9:00 PM',
      Sunday: '10:00 AM – 9:00 PM'
    },
    priceRange: '€',
    contact: {
      phone: '21 0284 3500',
      email: 'contact@toyslandathenskidssoftplaypartyvenue.com',
      website: 'http://www.toysland.gr/'
    }
  }
,
  {
    id: "ChIJ3fp3zcyeoRQREMETlRO8DE0",
    name: "FUNMILY eat-drink-play",
    coordinates: {
      lat: 38.0519035,
      lng: 23.8288943
    },
    placeData: {
      rating: 4.4,
      userRatingsTotal: 1358
    },
    address: "Odos Pentelis 114, Marousi 151 26, Greece",
    types: ["indoor-play","outdoor-play"],
    primaryType: "indoor-play",
    ageRange: {
      min: 3,
      max: 7
    },
    description: "FUNMILY eat-drink-play is a family-friendly restaurant and cafe in Athens with an indoor play area and outdoor activities. It's suitable for children aged 4-7, with a safe environment, dedicated staff, and tasty food that allows parents to relax while their kids have fun.",
    openingHours: {
      Monday: "Closed",
      Tuesday: "Closed",
      Wednesday: "5:00 – 9:00 PM",
      Thursday: "5:00 – 9:00 PM",
      Friday: "5:30 – 10:00 PM",
      Saturday: "11:00 AM – 10:00 PM",
      Sunday: "11:00 AM – 9:30 PM"
    },
    priceRange: "€€",
    contact: {
      phone: "21 0810 5300",
      email: "contact@funmilyeatdrinkplay.com",
      website: "http://www.funmily.gr/"
    }
  }
,
  {
    id: "ChIJ_-3DNwCeoRQRDyKC8MvmI54",
    name: "Kinder City",
    coordinates: {
      lat: 38.1251474,
      lng: 23.8558
    },
    placeData: {
      rating: 4.6,
      userRatingsTotal: 565
    },
    address: "Leof. Marathonos 17, Anixi 145 69, Greece",
    types: ["indoor-play"],
    primaryType: "indoor-play",
    ageRange: {
      min: 0,
      max: 6
    },
    description: "Kinder City is a fun-filled restaurant and play space perfect for families with young children up to age 6. With a variety of toys, games, and a delicious menu, it offers a great value for birthday parties and casual family outings. The welcoming staff and clean, safe environment make it an excellent choice for a memorable time with the kids.",
    openingHours: {
      Monday: "4:00 – 10:00 PM",
      Tuesday: "11:00 AM – 10:00 PM",
      Wednesday: "11:00 AM – 10:00 PM",
      Thursday: "11:00 AM – 10:00 PM",
      Friday: "11:00 AM – 10:00 PM",
      Saturday: "10:00 AM – 10:00 PM",
      Sunday: "10:00 AM – 10:00 PM"
    },
    priceRange: "€€",
    contact: {
      phone: "21 1213 3172",
      email: "contact@kindercitypartyhall.com",
      website: "http://www.kindercity.gr/"
    }
  }
,
  {
    id: "ChIJU0HBKCifoRQRl52mQbOu0Sk",
    name: "Magic Land",
    coordinates: {
      lat: 38.124396,
      lng: 23.8561178
    },
    placeData: {
      rating: 4.4,
      userRatingsTotal: 50
    },
    address: "Leof. Marathonos 11, Anixi 145 69, Greece",
    types: ["indoor-play","outdoor-play"],
    primaryType: "indoor-play",
    ageRange: {
      min: 0,
      max: 16
    },
    description: "Magic Land Παιδότοπος is an excellent indoor and outdoor play space for kids of all ages. With a restaurant, ample activities, and party facilities, it's an ideal spot for families to enjoy quality time together. The large, well-equipped play areas provide plenty of fun and safe entertainment for children.",
    openingHours: {
      Monday: "5:00 – 10:00 PM",
      Tuesday: "5:00 – 10:00 PM",
      Wednesday: "5:00 – 10:00 PM",
      Thursday: "5:00 – 10:00 PM",
      Friday: "5:00 – 10:00 PM",
      Saturday: "10:00 AM – 10:00 PM",
      Sunday: "10:00 AM – 10:00 PM"
    },
    priceRange: "€",
    contact: {
      phone: "697 447 4878",
      email: "contact@magicland.com",
      website: "https://www.facebook.com/magiclanekaliparkdanoixi"
    }
  }
,
  {
    id: "ChIJG6RfWsx1oRQRJxMhy7_WeGE",
    name: "PlaySpace AmFil",
    coordinates: {
      lat: 38.1295096,
      lng: 23.8580054
    },
    placeData: {
      rating: 4.5,
      userRatingsTotal: 318
    },
    address: "Athinon Chalkidos 4, Anixi 145 69, Greece",
    types: ["indoor-play"],
    primaryType: "indoor-play",
    ageRange: {
      min: 0,
      max: 8
    },
    description: "A well-equipped indoor and outdoor play space with a cafe and restaurant, suitable for children up to 8 years old. Offers fun activities, party hosting, and a comfortable area for parents. Clean and well-organized, with helpful staff, making it a great choice for families looking for a safe and enjoyable day out.",
    openingHours: {
      Monday: "4:00 – 10:00 PM",
      Tuesday: "11:00 AM – 10:00 PM",
      Wednesday: "11:00 AM – 10:00 PM",
      Thursday: "11:00 AM – 10:00 PM",
      Friday: "11:00 AM – 10:30 PM",
      Saturday: "10:00 AM – 10:30 PM",
      Sunday: "10:00 AM – 10:00 PM"
    },
    priceRange: "€",
    contact: {
      phone: "21 0621 5707",
      email: "contact@playspaceamfil.com",
      website: "https://m.facebook.com/home.php?stype=phss&sk=live&eav=AfbDCpbIT0XXk7THqmcOGu9phii2wwznbJPIrPtMTAP3gkdQ9cunjNit9z6-7V_lqZU&gfid=AQCK7hcrxZv2KdSuz8E&paipv=0&_rdr&tbua=1"
    }
  }
,
  {
    id: "ChIJ9aMCC_ueoRQRHfISpk9pO70",
    name: "Α.Σ. Καράτε Οδυσσέας",
    coordinates: {
      lat: 38.0866442,
      lng: 23.8184377
    },
    placeData: {
      rating: 4.9,
      userRatingsTotal: 88
    },
    address: "Char. Trikoupi 109, Kifisia 145 63, Greece",
    types: ["sports"],
    primaryType: "sports",
    ageRange: {
      min: 4,
      max: 16
    },
    description: "Α.Σ. Καράτε Οδυσσέας is an excellent karate studio in Athens offering classes for children 4 and up. With highly praised instructors and a welcoming environment, this is a great option for kids to learn self-defense, discipline, and physical fitness in a fun and supportive setting.",
    openingHours: {
      Monday: "Hours not available",
      Tuesday: "Hours not available",
      Wednesday: "Hours not available",
      Thursday: "Hours not available",
      Friday: "Hours not available",
      Saturday: "Hours not available",
      Sunday: "Hours not available"
    },
    priceRange: "€",
    contact: {
      phone: "21 3043 4220",
      email: "contact@.com",
      website: "http://odysseaskarate.gr/"
    }
  }
,
  {
    id: "ChIJoe2lufmhoRQRFQ0kkW4bxW8",
    name: "Paradise Park",
    coordinates: {
      lat: 38.071501,
      lng: 23.752976
    },
    placeData: {
      rating: 4.5,
      userRatingsTotal: 2726
    },
    address: "Ε.Ο. Κόμβος, Μεταμορφώσεως 100, Αχαρνές 136 71, Greece",
    types: ["outdoor-play","education"],
    primaryType: "outdoor-play",
    ageRange: {
      min: 2,
      max: 16
    },
    description: "Paradise Park is an amusement park in Athens that offers a range of fun and educational activities for children. With a focus on interactive experiences, the park features things like archery, gardening, and sports courts. Families can enjoy the relaxing atmosphere and make new friends, though some note limited food options.",
    openingHours: {
      Monday: "8:00 AM – 11:30 PM",
      Tuesday: "8:00 AM – 11:30 PM",
      Wednesday: "8:00 AM – 11:30 PM",
      Thursday: "8:00 AM – 11:30 PM",
      Friday: "8:00 AM – 11:30 PM",
      Saturday: "8:00 AM – 10:00 PM",
      Sunday: "9:00 AM – 10:00 PM"
    },
    priceRange: "€",
    contact: {
      phone: "21 0246 6466",
      email: "contact@paradisepark.com",
      website: "https://www.paradisepark.gr/"
    }
  }
];