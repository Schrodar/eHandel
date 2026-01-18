"use client";

import React, { createContext, useContext, useState } from "react";
import { useCart } from "../hooks/useCart";
import { CartDrawer } from "./CartDrawer";
import { CheckoutModal } from "./CheckoutModal";

type CartContextValue = ReturnType<typeof useCart> & {
  openCart: () => void;
  closeCart: () => void;
  cartOpen: boolean;
  openCheckout: () => void;
  closeCheckout: () => void;
  checkoutOpen: boolean;
  finishOrder: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCartContext() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCartContext must be used within CartProvider");
  return ctx;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const cart = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  function openCart() {
    setCartOpen(true);
  }
  function closeCart() {
    setCartOpen(false);
  }

  function openCheckout() {
    setCartOpen(false);
    setCheckoutOpen(true);
  }
  function closeCheckout() {
    setCheckoutOpen(false);
  }

  function finishOrder() {
    alert("Beställning skickad (låtsas) ✅");
    setCheckoutOpen(false);
    cart.reset();
  }

  const value: CartContextValue = {
    ...cart,
    openCart,
    closeCart,
    cartOpen,
    openCheckout,
    closeCheckout,
    checkoutOpen,
    finishOrder,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer
        open={cartOpen}
        onClose={closeCart}
        items={cart.items}
        setQty={cart.setQty}
        onCheckout={openCheckout}
      />

      <CheckoutModal open={checkoutOpen} onClose={closeCheckout} onSubmit={finishOrder} />
    </CartContext.Provider>
  );
}
