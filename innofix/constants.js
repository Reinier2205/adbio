const Category = {
  ALL: 'All',
  KITCHEN: 'Kitchen',
  LAUNDRY: 'Laundry',
  SOLAR: 'Solar',
  CLIMATE: 'Climate'
};

/**
 * UPDATE THIS ARRAY TO ADD MORE IMAGES
 * To add an image:
 * 1. Ensure the file is in the same folder as this project.
 * 2. Add a new object to the array below.
 */
export const SHOWCASE_IMAGES = [
  {
    id: 1,
    fileName: 'image1 (1).jpg',
    category: Category.LAUNDRY,
    title: 'Washing Machine Drum Repair',
    description: 'Internal components fix for a top-loading machine in Sandton.'
  },
  {
    id: 2,
    fileName: 'image1 (2).jpg',
    category: Category.KITCHEN,
    title: 'Stove Element Replacement',
    description: 'Restoring heating performance to a ceramic cooktop.'
  },
  {
    id: 3,
    fileName: 'image1 (3).jpg',
    category: Category.SOLAR,
    title: 'Solar Inverter Maintenance',
    description: 'Ensuring efficient energy flow for a Fourways household.'
  },
  {
    id: 4,
    fileName: 'image1 (4).jpg',
    category: Category.KITCHEN,
    title: 'Fridge Compressor Service',
    description: 'Regassing and cooling system optimization.'
  },
  {
    id: 5,
    fileName: 'image1 (5).jpg',
    category: Category.LAUNDRY,
    title: 'Tumble Dryer Belt Fix',
    description: 'Replacing worn drive belts to restore rotation.'
  },
  {
    id: 6,
    fileName: 'image1 (6).jpg',
    category: Category.CLIMATE,
    title: 'Aircon Filter & Gas Service',
    description: 'Full deep clean and regas for summer readiness.'
  },
  {
    id: 7,
    fileName: 'image1 (7).jpg',
    category: Category.KITCHEN,
    title: 'Dishwasher Drain Issue',
    description: 'Clearing blockages and repairing pump mechanics.'
  },
  {
    id: 8,
    fileName: 'image1 (8).jpg',
    category: Category.KITCHEN,
    title: 'Oven Wiring Repair',
    description: 'Fixed dangerous faulty wiring in a built-in oven.'
  },
  {
    id: 9,
    fileName: 'image1 (9).jpg',
    category: Category.SOLAR,
    title: 'Battery Storage Calibration',
    description: 'Optimizing solar battery cycles for longer life.'
  },
  {
    id: 10,
    fileName: 'image1 (10).jpg',
    category: Category.LAUNDRY,
    title: 'Washing Machine Suspension',
    description: 'Fixing heavy vibrations and noise issues.'
  }
];

export const WHATSAPP_NUMBER = '27627962943';
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;