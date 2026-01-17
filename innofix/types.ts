
export enum Category {
  ALL = 'All',
  KITCHEN = 'Kitchen',
  LAUNDRY = 'Laundry',
  SOLAR = 'Solar',
  CLIMATE = 'Climate'
}

export interface GalleryItem {
  id: number;
  fileName: string;
  category: Category;
  title: string;
  description: string;
}
