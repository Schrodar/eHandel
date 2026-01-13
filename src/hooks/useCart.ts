// app/hooks/useCart.ts
"use client";

import { useMemo, useState } from "react";
import type { Product } from "../components/products";
import { PRODUCTS } from "../components/products";

export type Cart = Record<Product["id"], number>;

export function useCart() {
  const [cart, setCart] = useState<Cart>({ white: 0, black: 0 });

  const items = useMemo(() => {
    return PRODUCTS.map((p) => ({ product: p, qty: cart[p.id] }))
      .filter((x) => x.qty > 0);
  }, [cart]);

  const totalQty = items.reduce((s, it) => s + it.qty, 0);

  function add(id: Product["id"]) {
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  }

  function setQty(id: Product["id"], qty: number) {
    setCart((c) => ({ ...c, [id]: Math.max(0, qty) }));
  }

  function reset() {
    setCart({ white: 0, black: 0 });
  }

  return { cart, items, totalQty, add, setQty, reset };
}
