// app/hooks/useCart.ts
"use client";

import { useMemo, useState } from "react";
import type { WardrobeProduct } from "@/lib/wardrobeApi";

export type Cart = Record<string, number>;

export type CartItem = {
  product: WardrobeProduct;
  qty: number;
};

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const cart: Cart = useMemo(() => {
    const map: Cart = {};
    for (const it of items) {
      map[it.product.id] = it.qty;
    }
    return map;
  }, [items]);

  const totalQty = useMemo(
    () => items.reduce((sum, it) => sum + it.qty, 0),
    [items],
  );

  function add(product: WardrobeProduct) {
    setItems((prev) => {
      const existing = prev.find((it) => it.product.id === product.id);
      if (existing) {
        return prev.map((it) =>
          it.product.id === product.id ? { ...it, qty: it.qty + 1 } : it,
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  }

  function setQty(id: string, qty: number) {
    const nextQty = Math.max(0, qty);
    setItems((prev) => {
      if (nextQty === 0) {
        return prev.filter((it) => it.product.id !== id);
      }
      return prev.map((it) =>
        it.product.id === id ? { ...it, qty: nextQty } : it,
      );
    });
  }

  function reset() {
    setItems([]);
  }

  return { cart, items, totalQty, add, setQty, reset };
}
