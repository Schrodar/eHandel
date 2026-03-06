'use client';

import type { WardrobeProduct } from '@/lib/wardrobeApi';
import { SAMPLE_WARDROBE } from '@/lib/wardrobeApi';
import { WardrobeFilters } from '@/components/WardrobeFilters';
import { WardrobeCard } from '@/components/WardrobeCard';
import './wardrobe.css';

export function Wardrobe({
  products = SAMPLE_WARDROBE,
}: {
  products?: WardrobeProduct[];
}) {
  return (
    <WardrobeFilters products={products}>
      {({ filtered }) => {
        const isSingle = filtered.length === 1;
        return (
          <div className={isSingle ? 'wardrobe-grid wardrobe-grid--single' : 'wardrobe-grid'}>
            {filtered.map((p) => (
              <WardrobeCard key={p.id} product={p} />
            ))}
          </div>
        );
      }}
    </WardrobeFilters>
  );
}

export default Wardrobe;
