"use client";

import Image from "next/image";
import type { Product } from "./products";

export function ProductCard({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (p: Product) => void;
}) {
  return (
    <div className="rounded-3xl bg-white/70 backdrop-blur border border-white/40 shadow-sm p-6">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold tracking-wide text-slate-700">
            Limited drop
          </p>
          <h3 className="text-xl font-semibold tracking-tight text-slate-900">
            {product.name}
          </h3>
          <p className="text-slate-700">
            En mjuk, tung premium-tee. Sitter snyggt. Känns dyr.
          </p>
        </div>

        <div className="relative h-28 w-28 shrink-0">
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
        <p className="text-lg font-semibold text-slate-900">
          {product.priceSek} kr
        </p>

        <button
          onClick={() => onAdd(product)}
          className="rounded-full px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] transition"
        >
          Lägg i varukorg
        </button>
      </div>
    </div>
  );
}
