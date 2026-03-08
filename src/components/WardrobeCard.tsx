import Link from 'next/link';
import Image from 'next/image';
import type { WardrobeProduct } from '@/lib/wardrobeApi';

export function WardrobeCard({ product }: { product: WardrobeProduct }) {
  return (
    <div className="card">
      <Link href={`/product/${product.id}`} className="no-underline">
        <div className="imgWrap" style={{ position: 'relative' }}>
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 719px) calc(50vw - 32px), (max-width: 959px) calc(33vw - 24px), 300px"
            className="object-contain"
            quality={75}
          />
        </div>
        <div className="meta">
          <div className="name">{product.name}</div>
          <div className="price">{product.price} kr</div>
        </div>
      </Link>
    </div>
  );
}
