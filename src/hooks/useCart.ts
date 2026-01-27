// app/hooks/useCart.ts
"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Cart item snapshot stored in client state and sent to backend.
 * Följer krav: sku är unik och används som nyckel.
 *
 * Detta följer Klarna-kraven: vi jobbar alltid i öre och har
 * tydlig SKU + momssats per rad.
 */
export type CartItem = {
  variantId: string; // FK till produkt/variant-ID i katalogen
  sku: string; // unik SKU (snapshot)
  productName: string; // produktnamn vid köptillfället
  variantLabel?: string; // t.ex. färg
  unitPrice: number; // pris i öre (inkl. moms)
  quantity: number; // antal (>= 1)
  imageUrl?: string;
  productUrl?: string; // t.ex. /product/[slug]
  taxRate: number; // moms i basis points, t.ex. 2500 = 25%
  stock?: number; // valfri lager-snapshot
};

export type CartState = Record<string, CartItem>; // key: SKU

const STORAGE_KEY = "cart:v1";

export function useCart() {
  // Stabil initial render: tom vagn både på server och första client-render
  const [cart, setCart] = useState<CartState>({});

  // Läs in sparad vagn först efter att komponenten har mountat i browsern
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartState;
        setCart(parsed);
      }
    } catch {
      // ignorera parse/localStorage-fel
    }
  }, []);

  // Skriv tillbaka till localStorage när cart ändras (endast i browsern)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignorera
    }
  }, [cart]);

  const items = useMemo(
    () => Object.values(cart).filter((i) => i.quantity > 0),
    [cart],
  );

  const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);

  function add(snapshot: Omit<CartItem, "quantity"> & { quantity?: number }) {
    const sku = snapshot.sku;
    setCart((current) => {
      const existing = current[sku];
      const baseQty = snapshot.quantity ?? 1;
      const nextQty = existing ? existing.quantity + baseQty : baseQty;
      const cappedQty = snapshot.stock
        ? Math.min(nextQty, snapshot.stock)
        : Math.max(1, nextQty);

      return {
        ...current,
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
    setCart((current) => {
      const existing = current[sku];
      if (!existing) return current;

      const next = Math.max(0, Math.floor(quantity));
      const capped = existing.stock ? Math.min(next, existing.stock) : next;

      if (capped === 0) {
        const copy = { ...current };
        delete copy[sku];
        return copy;
      }

      return { ...current, [sku]: { ...existing, quantity: capped } };
    });
  }

  function remove(sku: string) {
    setCart((current) => {
      const copy = { ...current };
      delete copy[sku];
      return copy;
    });
  }

  function reset() {
    setCart({});
  }

  return { cart, items, totalQty, add, setQty, remove, reset } as const;
}
      
