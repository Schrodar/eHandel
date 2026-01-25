// app/hooks/useCart.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import { PRODUCTS } from "../components/products";
import { getProductById as getWardrobeProduct } from "@/lib/wardrobeApi";

/**
 * Cart item snapshot stored in client state and sent to backend.
 * Följer krav: sku är unik och används som nyckel.
 */
export type CartItem = {
  variantId: string; // FK to variant/product variant id
  sku: string; // unique SKU (snapshot)
  productName: string; // snapshot
  variantLabel?: string; // e.g. color label
  unitPrice: number; // in öre (int)
  quantity: number; // >=1
  imageUrl?: string;
  productUrl?: string; // /product/[slug]
  taxRate: number; // basis points, e.g. 2500
  stock?: number; // optional available stock snapshot
};

export type CartState = Record<string, CartItem>; // keyed by SKU

const STORAGE_KEY = "cart:v1";

export function useCart() {
  // Stabil initial render: tom vagn både på server och första client-render
  const [cart, setCart] = useState<CartState>({});

  // Läs in sparad vagn först efter att komponenten har mountat i browsern
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartState;
        setCart(parsed);
      }
    } catch {
      // ignore parse/localStorage errors
    }
  }, []);

  // Skriv tillbaka till localStorage när cart ändras (endast i browsern)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  const items = useMemo(() => Object.values(cart).filter((i) => i.quantity > 0), [cart]);

  const totalQty = items.reduce((s, it) => s + it.quantity, 0);

  function add(snapshot: Omit<CartItem, 'quantity'> & { quantity?: number }) {
    const sku = snapshot.sku;
    setCart((c) => {
      const existing = c[sku];
      const qty = existing ? existing.quantity + (snapshot.quantity ?? 1) : (snapshot.quantity ?? 1);
      const cappedQty = snapshot.stock ? Math.min(qty, snapshot.stock) : Math.max(1, qty);
      return {
        ...c,
        [sku]: {
          variantId: snapshot.variantId,
          sku,
          productName: snapshot.productName,
          variantLabel: snapshot.variantLabel,
          unitPrice: snapshot.unitPrice,
          quantity: cappedQty,
          imageUrl: snapshot.imageUrl,
          productUrl: snapshot.productUrl,
          taxRate: snapshot.taxRate ?? 2500,
          stock: snapshot.stock,
        },
      };
    });
  }

  function setQty(sku: string, quantity: number) {
    setCart((c) => {
      const existing = c[sku];
      if (!existing) return c;
      const qty = Math.max(0, Math.floor(quantity));
      const capped = existing.stock ? Math.min(qty, existing.stock) : qty;
      if (capped === 0) {
        const copy = { ...c };
        delete copy[sku];
        return copy;
      }
      return { ...c, [sku]: { ...existing, quantity: capped } };
    });
  }

  function remove(sku: string) {
    setCart((c) => {
      const copy = { ...c };
      delete copy[sku];
      return copy;
    });
  }

  function reset() {
    setCart({});
  }

  return { cart, items, totalQty, add, setQty, remove, reset } as const;
}
