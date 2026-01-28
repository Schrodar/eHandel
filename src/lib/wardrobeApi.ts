export type PriceClass = 'budget' | 'standard' | 'premium';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'all';

export type WardrobeProduct = {
  id: string;
  name: string;
  category: string;
  style: string;
  fit: string;
  material: string;
  color: string;
  season: Season;
  price: number; // SEK
  priceClass: PriceClass;
  image: string; // public/ path
};

export const SAMPLE_WARDROBE: WardrobeProduct[] = [
  {
    id: 'w-001',
    name: 'Classic Tee',
    category: 'tops',
    style: 'minimal',
    fit: 'regular',
    material: 'cotton',
    color: 'white',
    season: 'all',
    price: 399,
    priceClass: 'standard',
    image: '/product-w-001.svg',
  },
  {
    id: 'w-002',
    name: 'Boxy Shirt',
    category: 'tops',
    style: 'casual',
    fit: 'boxy',
    material: 'linen',
    color: 'beige',
    season: 'summer',
    price: 699,
    priceClass: 'standard',
    image: '/product-w-002.svg',
  },
  {
    id: 'w-003',
    name: 'Slim Jeans',
    category: 'bottoms',
    style: 'street',
    fit: 'slim',
    material: 'denim',
    color: 'blue',
    season: 'all',
    price: 999,
    priceClass: 'premium',
    image: '/product-w-003.svg',
  },
  {
    id: 'w-004',
    name: 'Light Jacket',
    category: 'outerwear',
    style: 'minimal',
    fit: 'regular',
    material: 'polyester',
    color: 'black',
    season: 'autumn',
    price: 1299,
    priceClass: 'premium',
    image: '/product-w-004.svg',
  },
  {
    id: 'w-005',
    name: 'Summer Shorts',
    category: 'bottoms',
    style: 'casual',
    fit: 'regular',
    material: 'cotton',
    color: 'green',
    season: 'summer',
    price: 349,
    priceClass: 'budget',
    image: '/product-w-005.svg',
  },
];

export function getAllProducts(): WardrobeProduct[] {
  return SAMPLE_WARDROBE;
}

export function getProductById(id: string): WardrobeProduct | undefined {
  try {
    const needle = decodeURIComponent(String(id)).toLowerCase();
    const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    return (
      SAMPLE_WARDROBE.find((p) => p.id.toLowerCase() === needle) ||
      SAMPLE_WARDROBE.find((p) => compact(p.id) === compact(needle)) ||
      SAMPLE_WARDROBE.find((p) => compact(p.name) === compact(needle))
    );
  } catch {
    return undefined;
  }
}
