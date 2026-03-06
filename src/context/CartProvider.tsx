'use client';

import React, { createContext, useContext, useSyncExternalStore, useState } from 'react';
import { useCart } from '../hooks/useCart';
import { CartDrawer } from '@/components/CartDrawer';
import { CheckoutModal } from '@/components/CheckoutModal';

type CartContextValue = ReturnType<typeof useCart> & {
  openCart: () => void;
  closeCart: () => void;
  cartOpen: boolean;
  openCheckout: () => void;
  closeCheckout: () => void;
  checkoutOpen: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const cart = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

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

  const value: CartContextValue = {
    ...cart,
    openCart,
    closeCart,
    cartOpen,
    openCheckout,
    closeCheckout,
    checkoutOpen,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
      {mounted && (
        <CartDrawer
          open={cartOpen}
          onClose={closeCart}
          items={cart.items}
          setQty={cart.setQty}
          onCheckout={openCheckout}
          coupon={cart.coupon}
          onApplyCoupon={cart.applyCoupon}
          onRemoveCoupon={cart.removeCoupon}
        />
      )}

      {mounted && (
        <CheckoutModal
          open={checkoutOpen}
          onClose={closeCheckout}
        />
      )}
    </CartContext.Provider>
  );
}
export function useCartContext() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCartContext must be used within CartProvider');
  return ctx;
}
