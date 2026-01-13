// app/page.tsx
"use client";

import { useMemo, useState } from "react";
import type { Product } from "../components/products";
import { PRODUCTS } from "../components/products";

import { TopNav } from "../components/TopNav";
import { HeroSection } from "../components/HeroSection";
import { CheckoutModal } from "../components/CheckoutModal";
import { CartDrawer } from "@/components/CartDrawer";

type Cart = Record<Product["id"], number>;

export default function Page() {
  const [cart, setCart] = useState<Cart>({ white: 0, black: 0 });
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const items = useMemo(() => {
    return PRODUCTS.map((p) => ({ product: p, qty: cart[p.id] }))
      .filter((x) => x.qty > 0);
  }, [cart]);

  const totalQty = items.reduce((s, it) => s + it.qty, 0);

  function setQty(id: Product["id"], qty: number) {
    setCart((c) => ({ ...c, [id]: Math.max(0, qty) }));
  }

  function openCheckout() {
    setCartOpen(false);
    setCheckoutOpen(true);
  }

  function finishFakeOrder() {
    alert("Beställning skickad (låtsas) ✅");
    setCheckoutOpen(false);
    setCart({ white: 0, black: 0 });
  }

  return (
    <div className="min-h-screen lg:h-screen bg-[#e9aeb7] overflow-x-hidden lg:overflow-hidden">
      <TopNav totalQty={totalQty} onOpenCart={() => setCartOpen(true)} />

      <HeroSection
        onShopClick={() =>
          document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" })
        }
      />

      {/* placeholder så länken #shop inte dör */}
      <div id="shop" className="hidden" />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={items}
        setQty={setQty}
        onCheckout={openCheckout}
      />

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onSubmit={finishFakeOrder}
      />
    </div>
  );
}
