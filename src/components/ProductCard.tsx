'use client';

import Image from 'next/image';
import type { Product } from './products';
import { formatPrice } from './products';

export function ProductCard({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (p: Product) => void;
}) {
  return (
    <article className="product-card">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-2">
          <p
            className="text-sm font-semibold tracking-wide"
            style={{ color: 'var(--muted)' }}
          >
            Limited drop
          </p>
          <h3 className="product-name">{product.name}</h3>
          <p style={{ color: 'var(--muted)' }}>
            En mjuk, tung premium-tee. Sitter snyggt. Känns dyr.
          </p>
        </div>

        <div className="relative product-image shrink-0">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-contain"
            priority={false}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="product-price">{formatPrice(product.priceInOre)}</p>

        <button onClick={() => onAdd(product)} className="btn-primary">
          Lägg i varukorg
        </button>
      </div>
    </article>
  );
}
