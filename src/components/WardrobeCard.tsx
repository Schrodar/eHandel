'use client';

import Link from 'next/link';
import type { WardrobeProduct } from '@/lib/wardrobeApi';

export function WardrobeCard({ product }: { product: WardrobeProduct }) {
  return (
    <div className="card">
      <Link href={`/product/${product.id}`} className="no-underline">
        <div className="imgWrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.image} alt={product.name} />
        </div>
        <div className="meta">
          <div className="name">{product.name}</div>
          <div className="price">{product.price} kr</div>
        </div>
      </Link>
    </div>
  );
}
