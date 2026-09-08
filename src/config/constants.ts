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
    id: 'birthday_combo',
    name: 'Birthday Combo',
    category: 'Birthday',
    description: '',
    price: 350,
    driveUrl: 'https://drive.google.com/file/d/1utY7FdUORh4c7TjVr1a4vAy8Qhg6eY3l/view?usp=drivesdk',
    image: '/images/combos/birthday/cover.jpeg',
    popular: true,
    options: [
      { code: 'DC1', price: 350, label: 'DC1 ₹350/-', image: '/images/combos/birthday/DC1.jpeg' },
      { code: 'DC2', price: 390, label: 'DC2 ₹390/-', image: '/images/combos/birthday/DC2.jpeg' },
      { code: 'DC3', price: 390, label: 'DC3 ₹390/-', image: '/images/combos/birthday/DC3.jpeg' },
      { code: 'DC4', price: 420, label: 'DC4 ₹420/-', image: '/images/combos/birthday/DC4.jpeg' },
      { code: 'DC5', price: 450, label: 'DC5 ₹450/-', image: '/images/combos/birthday/DC5.jpeg' },
      { code: 'DC6', price: 470, label: 'DC6 ₹470/-', image: '/images/combos/birthday/DC6.jpeg' },
      { code: 'DC7', price: 530, label: 'DC7 ₹530/-', image: '/images/combos/birthday/DC7.jpeg' },
      { code: 'DC8', price: 750, label: 'DC8 ₹750/-', image: '/images/combos/birthday/DC8.jpeg' },
      { code: 'DC9', price: 885, label: 'DC9 ₹885/-', image: '/images/combos/birthday/DC9.jpeg' }
    ],
    includes: [],
    active: true
  },
  {
    id: 'anniversary_combo',
    name: 'Anniversary Combo',
    category: 'Anniversary',
    description: '',
    price: 420,
    driveUrl: 'https://drive.google.com/file/d/1WP82RU9hDGRZ7VgnOZ68W4xRyqW1CtZp/view?usp=drivesdk',
    image: '/images/combos/anniversary/cover.jpeg',
    popular: true,
    options: [
      { code: 'AC1', price: 420, label: 'AC1 ₹420/-', image: '/images/combos/anniversary/AC1.jpeg' },
      { code: 'AC2', price: 570, label: 'AC2 ₹570/-', image: '/images/combos/anniversary/AC2.jpeg' },
      { code: 'AC3', price: 460, label: 'AC3 ₹460/-', image: '/images/combos/anniversary/AC3.jpeg' },
      { code: 'AC4', price: 440, label: 'AC4 ₹440/-', image: '/images/combos/anniversary/AC4.jpeg' },
      { code: 'AC5', price: 590, label: 'AC5 ₹590/-', image: '/images/combos/anniversary/AC5.jpeg' }
    ],
    includes: [],
    active: true
  },
  {
    id: 'bride_to_be_combo',
    name: 'Bride to Be Combo',
    category: 'Bride to Be',
    description: '',
    price: 480,
    driveUrl: 'https://drive.google.com/file/d/1QhuG5mnaGMxpRQ8qhmSt9NUXUb4gL-NI/view?usp=drivesdk',
    image: '/images/combos/bride/cover.jpeg',
    options: [
      { code: 'BC1', price: 480, label: 'BC1 ₹480/-', image: '/images/combos/bride/BC1.jpeg' },
      { code: 'BC2', price: 530, label: 'BC2 ₹530/-', image: '/images/combos/bride/BC2.jpeg' },
      { code: 'BC3', price: 710, label: 'BC3 ₹710/-', image: '/images/combos/bride/BC3.jpeg' },
      { code: 'BC4', price: 840, label: 'BC4 ₹840/-', image: '/images/combos/bride/BC4.jpeg' },
      { code: 'BC5', price: 550, label: 'BC5 ₹550/-', image: '/images/combos/bride/BC5.jpeg' },
      { code: 'BC6', price: 520, label: 'BC6 ₹520/-', image: '/images/combos/bride/BC6.jpeg' },
      { code: 'BC7', price: 1190, label: 'BC7 ₹1190/-', image: '/images/combos/bride/BC7.jpeg' },
      { code: 'BC8', price: 980, label: 'BC8 ₹980/-', image: '/images/combos/bride/BC8.jpeg' },
      { code: 'BC9', price: 770, label: 'BC9 ₹770/-', image: '/images/combos/bride/BC9.jpeg' },
      { code: 'BC10', price: 740, label: 'BC10 ₹740/-', image: '/images/combos/bride/BC10.jpeg' }
    ],
    includes: [],
    active: true
  },
  {
    id: 'groom_to_be_combo',
    name: 'Groom to be Combo',
    category: 'Groom to Be',
    description: '',
    price: 590,
    driveUrl: 'https://drive.google.com/file/d/1GHrVcKjuHcITCqQy_Hzy74Z_Mc-TYinM/view?usp=drivesdk',
    image: '/images/combos/groom/cover.jpeg',
    options: [
      { code: 'GC1', price: 590, label: 'GC1 ₹590/-', image: '/images/combos/groom/GC1.jpeg' },
      { code: 'GC2', price: 455, label: 'GC2 ₹455/-', image: '/images/combos/groom/GC2.jpeg' },
      { code: 'GC3', price: 510, label: 'GC3 ₹510/-', image: '/images/combos/groom/GC3.jpeg' },
      { code: 'GC4', price: 625, label: 'GC4 ₹625/-', image: '/images/combos/groom/GC4.jpeg' },
      { code: 'GC5', price: 975, label: 'GC5 ₹975/-', image: '/images/combos/groom/GC5.jpeg' },
      { code: 'GC6', price: 690, label: 'GC6 ₹690/-', image: '/images/combos/groom/GC6.jpeg' },
      { code: 'GC7', price: 655, label: 'GC7 ₹655/-', image: '/images/combos/groom/GC7.jpeg' },
      { code: 'GC8', price: 1000, label: 'GC8 ₹1000/-', image: '/images/combos/groom/GC8.jpeg' },
      { code: 'GC9', price: 580, label: 'GC9 ₹580/-', image: '/images/combos/groom/GC9.jpeg' }
    ],
    includes: [],
    active: true
  },
  {
    id: 'mom_to_be_combo',
    name: 'Mom to Be Combo',
    category: 'Mom to Be',
    description: '',
    price: 730,
    driveUrl: 'https://drive.google.com/file/d/1QaY5pqtC4KaQW3fdatM5pYWnmTlrZOoX/view?usp=drive_link',
    image: '/images/combos/mom/cover.jpeg',
    options: [
      { code: 'MC1', price: 730, label: 'MC1 ₹730/-', image: '/images/combos/mom/MC1.jpeg' },
      { code: 'MC2', price: 420, label: 'MC2 ₹420/-', image: '/images/combos/mom/MC2.jpeg' },
      { code: 'MC3', price: 440, label: 'MC3 ₹440/-', image: '/images/combos/mom/MC3.jpeg' },
      { code: 'MC4', price: 450, label: 'MC4 ₹450/-', image: '/images/combos/mom/MC4.jpeg' },
      { code: 'MC5', price: 580, label: 'MC5 ₹580/-', image: '/images/combos/mom/MC5.jpeg' },
      { code: 'MC6', price: 600, label: 'MC6 ₹600/-', image: '/images/combos/mom/MC6.jpeg' },
      { code: 'MC7', price: 670, label: 'MC7 ₹670/-', image: '/images/combos/mom/MC7.jpeg' }
    ],
    includes: [],
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
  whatsappNumber: '918585855859',
  bookingWindowDays: 45,
  menuPdfUrl: 'https://drive.google.com/file/d/1utY7FdUORh4c7TjVr1a4vAy8Qhg6eY3l/view?usp=drivesdk'
};
