'use client';

import React, { createContext, useContext, useState } from 'react';
import { useCart } from '../hooks/useCart';
import { CartDrawer } from '@/components/CartDrawer';
import { CheckoutModal } from '@/components/CheckoutModal';
import type { CustomerInfo } from '@/components/checkout';

type CartContextValue = ReturnType<typeof useCart> & {
  openCart: () => void;
  closeCart: () => void;
  cartOpen: boolean;
  openCheckout: () => void;
  closeCheckout: () => void;
  checkoutOpen: boolean;
  finishOrder: (customer: CustomerInfo) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

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

  function finishOrder(customer: CustomerInfo) {
    // I produktion: skicka till server här
    console.log('Order submitted with customer:', customer);
    console.log('Cart items:', cart.cart);

    alert('Beställning skickad (låtsas) ✅');
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

      <CheckoutModal
        open={checkoutOpen}
        onClose={closeCheckout}
        onSubmit={finishOrder}
      />
    </CartContext.Provider>
  );
}
export function useCartContext() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCartContext must be used within CartProvider');
  return ctx;
}
