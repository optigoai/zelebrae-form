import { AppConfig, CelebrationLocation, Occasion, Amenity, ComboItem } from '../types/booking';

export const DEFAULT_LOCATIONS: CelebrationLocation[] = [
  {
    id: 'pantheerankavu',
    name: 'Pantheerankavu',
    tagline: '',
    address: 'Near Pantheerankavu Bypass Junction, Kozhikode, Kerala 673019',
    image: '/hero.webp',
    maxCapacity: 15,
    active: true,
    features: []
  },
  {
    id: 'karaparamba',
    name: 'Karaparamba',
    tagline: '',
    address: 'Near Karaparamba Junction, Kozhikode, Kerala 673010',
    image: '/hero.webp',
    maxCapacity: 15,
    active: true,
    features: []
  },
  {
    id: 'ashokapuram',
    name: 'Ashokapuram',
    tagline: '',
    address: 'Near Baby Memorial Hospital, Ashokapuram, Kozhikode, Kerala 673006',
    image: '/hero.webp',
    maxCapacity: 15,
    active: true,
    features: []
  },
  {
    id: 'arakkinar',
    name: 'Arakkinar',
    tagline: '',
    address: 'Arakkinar, Beypore Road, Kozhikode, Kerala 673028',
    image: '/hero.webp',
    maxCapacity: 15,
    active: true,
    features: []
  }
];

export const DEFAULT_OCCASIONS: Occasion[] = [
  {
    id: 'birthday',
    name: 'Birthday',
    icon: 'cake',
    description: '',
    popular: true
  },
  {
    id: 'anniversary',
    name: 'Anniversary',
    icon: 'heart',
    description: '',
    popular: true
  },
  {
    id: 'bride_to_be',
    name: 'Bride to Be',
    icon: 'crown',
    description: '',
    popular: false
  },
  {
    id: 'groom_to_be',
    name: 'Groom to Be',
    icon: 'sparkles',
    description: '',
    popular: false
  },
  {
    id: 'mom_to_be',
    name: 'Mom to Be',
    icon: 'baby',
    description: '',
    popular: false
  },
  {
    id: 'other',
    name: 'Other Milestone',
    icon: 'party-popper',
    description: '',
    popular: false
  }
];

export const DEFAULT_AMENITIES: Amenity[] = [
  {
    id: 'basic_decorations',
    name: 'Basic Decorations',
    icon: 'sparkles',
    description: '',
    isComplimentary: true,
    active: true
  },
  {
    id: 'music_mic',
    name: 'Background Music & Mic',
    icon: 'music',
    description: '',
    isComplimentary: true,
    active: true
  },
  {
    id: 'ac_hall',
    name: 'AC Hall',
    icon: 'wind',
    description: '',
    isComplimentary: true,
    active: true
  },
  {
    id: 'welcome_drink',
    name: 'Welcome Drink',
    icon: 'glass-water',
    description: '',
    isComplimentary: true,
    active: true
  }
];

export const DEFAULT_COMBOS: ComboItem[] = [
  {
    id: 'none',
    name: 'No Add-on Combo',
    category: 'Standard',
    description: 'Complimentary private celebration space with standard amenities only',
    price: 0,
    includes: ['Complimentary celebration nook', 'Standard cake pedestal & cutlery'],
    active: true
  },
  {
    id: 'mom_to_be_combo',
    name: 'Mom to Be Combo',
    category: 'Mom to Be',
    description: 'Special celebratory package tailored for baby shower surprises',
    price: 730,
    driveUrl: 'https://drive.google.com/file/d/1QaY5pqtC4KaQW3fdatM5pYWnmTlrZOoX/view?usp=drive_link',
    options: [
      { code: 'MC1', price: 730, label: 'MC1 ₹730/-' },
      { code: 'MC2', price: 420, label: 'MC2 ₹420/-' },
      { code: 'MC3', price: 440, label: 'MC3 ₹440/-' },
      { code: 'MC4', price: 450, label: 'MC4 ₹450/-' },
      { code: 'MC5', price: 580, label: 'MC5 ₹580/-' },
      { code: 'MC6', price: 600, label: 'MC6 ₹600/-' }
    ],
    includes: [
      'Mom to Be Satin Sash & Tiara',
      'Pastel Balloon Bundle & Props',
      'Cake Table Accents'
    ],
    active: true
  },
  {
    id: 'bride_to_be_combo',
    name: 'Bride to Be Combo',
    category: 'Bride to Be',
    description: 'Glamorous bachelorette & bridal party accessory set',
    price: 480,
    driveUrl: 'https://drive.google.com/file/d/1QhuG5mnaGMxpRQ8qhmSt9NUXUb4gL-NI/view?usp=drivesdk',
    options: [
      { code: 'BC1', price: 480, label: 'BC1 ₹480/-' },
      { code: 'BC2', price: 520, label: 'BC2 ₹520/-' },
      { code: 'BC3', price: 560, label: 'BC3 ₹560/-' },
      { code: 'BC4', price: 590, label: 'BC4 ₹590/-' },
      { code: 'BC5', price: 640, label: 'BC5 ₹640/-' },
      { code: 'BC6', price: 690, label: 'BC6 ₹690/-' },
      { code: 'BC7', price: 1190, label: 'BC7 ₹1190/-' },
      { code: 'BC8', price: 850, label: 'BC8 ₹850/-' },
      { code: 'BC9', price: 920, label: 'BC9 ₹920/-' }
    ],
    includes: [
      'Bride to Be Satin Sash & Veil',
      'Team Bride Badges & Photo Props',
      'Sparkling Celebration Accents'
    ],
    active: true
  },
  {
    id: 'birthday_combo',
    name: 'Birthday Combo',
    category: 'Birthday',
    description: 'Complete birthday decor setup with sash, crown, candles & props',
    price: 350,
    driveUrl: 'https://drive.google.com/file/d/1utY7FdUORh4c7TjVr1a4vAy8Qhg6eY3l/view?usp=drivesdk',
    popular: true,
    options: [
      { code: 'DC1', price: 350, label: 'DC1 ₹350/-' },
      { code: 'DC2', price: 390, label: 'DC2 ₹390/-' },
      { code: 'DC3', price: 390, label: 'DC3 ₹390/-' },
      { code: 'DC4', price: 420, label: 'DC4 ₹420/-' },
      { code: 'DC5', price: 450, label: 'DC5 ₹450/-' },
      { code: 'DC6', price: 470, label: 'DC6 ₹470/-' },
      { code: 'DC7', price: 530, label: 'DC7 ₹530/-' },
      { code: 'DC8', price: 750, label: 'DC8 ₹750/-' }
    ],
    includes: [
      'Custom Birthday Sash & Tiara/Crown',
      'Party Poppers & Sparkling Candle',
      'Celebration Props Set'
    ],
    active: true
  },
  {
    id: 'anniversary_combo',
    name: 'Anniversary Combo',
    category: 'Anniversary',
    description: 'Romantic celebration setup with rose petal spread & photo frames',
    price: 420,
    driveUrl: 'https://drive.google.com/file/d/1WP82RU9hDGRZ7VgnOZ68W4xRyqW1CtZp/view?usp=drivesdk',
    popular: true,
    options: [
      { code: 'AC1', price: 420, label: 'AC1 ₹420/-' },
      { code: 'AC2', price: 570, label: 'AC2 ₹570/-' },
      { code: 'AC3', price: 460, label: 'AC3 ₹460/-' },
      { code: 'AC4', price: 440, label: 'AC4 ₹440/-' }
    ],
    includes: [
      'Fresh Rose Petal Table Spread',
      'Anniversary Keepsake Frame',
      'LED Romantic Fairy Lights'
    ],
    active: true
  },
  {
    id: 'groom_to_be_combo',
    name: 'Groom to be Combo',
    category: 'Groom to Be',
    description: 'Festive toast & bachelor party pack celebrating the groom',
    price: 455,
    driveUrl: 'https://drive.google.com/file/d/1GHrVcKjuHcITCqQy_Hzy74Z_Mc-TYinM/view?usp=drivesdk',
    options: [
      { code: 'GC1', price: 590, label: 'GC1 ₹590/-' },
      { code: 'GC2', price: 455, label: 'GC2 ₹455/-' },
      { code: 'GC3', price: 490, label: 'GC3 ₹490/-' },
      { code: 'GC4', price: 625, label: 'GC4 ₹625/-' },
      { code: 'GC5', price: 975, label: 'GC5 ₹975/-' },
      { code: 'GC6', price: 690, label: 'GC6 ₹690/-' },
      { code: 'GC7', price: 655, label: 'GC7 ₹655/-' },
      { code: 'GC8', price: 1000, label: 'GC8 ₹1000/-' }
    ],
    includes: [
      'Groom to Be Sash & Badges',
      'Bachelor Celebration Props',
      'Party Poppers'
    ],
    active: true
  }
];

export const STANDARD_TIME_SLOTS = [
  { time: '09:30 AM', endTime: '10:30 AM', period: 'morning' as const },
  { time: '10:30 AM', endTime: '11:30 AM', period: 'morning' as const },
  { time: '11:30 AM', endTime: '12:30 PM', period: 'morning' as const },
  { time: '12:30 PM', endTime: '01:30 PM', period: 'afternoon' as const },
  { time: '01:30 PM', endTime: '02:30 PM', period: 'afternoon' as const },
  { time: '02:30 PM', endTime: '03:30 PM', period: 'afternoon' as const },
  { time: '03:30 PM', endTime: '04:30 PM', period: 'afternoon' as const },
  { time: '04:30 PM', endTime: '05:30 PM', period: 'afternoon' as const },
  { time: '05:30 PM', endTime: '06:30 PM', period: 'evening' as const },
  { time: '06:30 PM', endTime: '07:30 PM', period: 'evening' as const },
  { time: '07:30 PM', endTime: '08:30 PM', period: 'evening' as const },
  { time: '08:30 PM', endTime: '09:30 PM', period: 'evening' as const }
];

export const GUIDELINES_LIST = [
  'Celebration area is complimentary for Zelebrae customers only.',
  'Usage is allowed only during the allotted 1-hour time slot.',
  'Please arrive on time and complete the celebration within the allotted time.',
  'Kindly cooperate in winding up on time for the next customer.',
  'Time extension may not be possible during busy hours.',
  'Please keep the celebration area clean during and after use.',
  'Outside food and beverages are strictly not allowed.',
  'Avoid spilling cake, cream, or drinks on floor, walls, or decorations.',
  'Do not touch, pull, or damage flowers, lights, or decorative installations.',
  'Do not move tables, stands, props, or fixed setup items.',
  'Confetti, party poppers, and decorations are allowed only if purchased from Zelebrae.',
  'Outside decorations, wall sticking, and tape hangings are not allowed.',
  'Handle sound system and equipment carefully; avoid excessively loud music.',
  'Any damage to flowers, lights, glass, paintings, curtains, speaker, mic, or other equipment will be charged.'
];

export const DEFAULT_APP_CONFIG: AppConfig = {
  locations: DEFAULT_LOCATIONS,
  occasions: DEFAULT_OCCASIONS,
  amenities: DEFAULT_AMENITIES,
  combos: DEFAULT_COMBOS,
  maxGuests: 15,
  minGuests: 1,
  whatsappNumber: '919072333600',
  bookingWindowDays: 45,
  menuPdfUrl: 'https://drive.google.com/file/d/1utY7FdUORh4c7TjVr1a4vAy8Qhg6eY3l/view?usp=drivesdk'
};
