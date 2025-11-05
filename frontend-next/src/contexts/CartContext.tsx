'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { ProductResponse } from '@/features/merchant/products/types';

type CartItem = { product: ProductResponse; quantity: number };

interface CartProviderProps {
  children: ReactNode;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (p: ProductResponse, quantity?: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  updateQuantity: (id: string, quantity: number) => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  // Initialize items from localStorage using lazy initializer
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('cart');
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (error) {
        console.warn('Failed to load cart from localStorage:', error);
      }
    }
    return [];
  });
  
  const [mounted, setMounted] = useState(false);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Save to localStorage whenever items change
  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem('cart', JSON.stringify(items));
      } catch (error) {
        console.warn('Failed to save cart to localStorage:', error);
      }
    }
  }, [items, mounted]);

  const addItem = (p: ProductResponse, quantity: number = 1) => {
    setItems((prev) => {
      const exists = prev.find((i) => i.product._id === p._id);
      if (exists) {
        return prev.map((i) =>
          i.product._id === p._id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { product: p, quantity }];
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.product._id === id
          ? { ...i, quantity: quantity > 0 ? quantity : 1 }
          : i
      )
    );
  };

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((i) => i.product._id !== id));

  const clearCart = () => setItems([]);

  // Computed values
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => {
    const price = item.product.salePrice || item.product.price || 0;
    return sum + price * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearCart,
        updateQuantity,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
};

