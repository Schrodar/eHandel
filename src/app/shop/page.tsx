import Wardrobe from '@/components/Wardrobe';
import { SAMPLE_WARDROBE } from '@/lib/wardrobeApi';
import { getAllWardrobeProductsFromDb } from '@/lib/productService';

export const metadata = {
  title: 'Shop — SAZZE',
  description:
    'Browse our wardrobe collection. Filter by category, color, fit, material and season.',
};

export default async function ShopPage() {
  const productsFromDb = await getAllWardrobeProductsFromDb();
  const products = productsFromDb.length ? productsFromDb : SAMPLE_WARDROBE;

  return (
    <main className="min-h-screen py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <h1 className="text-2xl font-serif mb-4">Shop</h1>
        <Wardrobe products={products} />
      </div>
    </main>
  );
}
