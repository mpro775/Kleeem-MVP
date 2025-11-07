'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import axiosInstance from '@/lib/axios';
import type { ProductResponse } from '@/features/merchant/products/types';

type CartItem = { product: ProductResponse; quantity: number };

interface CouponInfo {
  code: string;
  discount: number;
  type: string;
  discountType?: 'percentage' | 'fixed_amount' | 'free_shipping';
}

interface CartProviderProps {
  children: ReactNode;
}

interface CartContextValue {
  items: CartItem[];
  appliedCoupon: CouponInfo | null;
  selectedCurrency: string;
  
  // Cart operations
  addItem: (p: ProductResponse, quantity?: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  updateQuantity: (id: string, quantity: number) => void;
  
  // Coupon operations
  applyCoupon: (code: string, merchantId: string) => Promise<{ success: boolean; message?: string }>;
  removeCoupon: () => void;
  
  // Currency operations
  setSelectedCurrency: (currency: string) => void;
  
  // Price calculations
  getSubtotal: () => number;
  getCouponDiscount: () => number;
  getTotal: () => number;
  
  // Computed values
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
  
  // Coupon state
  const [appliedCoupon, setAppliedCoupon] = useState<CouponInfo | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('appliedCoupon');
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (error) {
        console.warn('Failed to load coupon from localStorage:', error);
      }
    }
    return null;
  });
  
  // Currency state
  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedCurrency') || 'SAR';
    }
    return 'SAR';
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

  // Save coupon to localStorage
  useEffect(() => {
    if (mounted) {
      try {
        if (appliedCoupon) {
          localStorage.setItem('appliedCoupon', JSON.stringify(appliedCoupon));
        } else {
          localStorage.removeItem('appliedCoupon');
        }
      } catch (error) {
        console.warn('Failed to save coupon to localStorage:', error);
      }
    }
  }, [appliedCoupon, mounted]);

  // Save currency to localStorage
  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem('selectedCurrency', selectedCurrency);
      } catch (error) {
        console.warn('Failed to save currency to localStorage:', error);
      }
    }
  }, [selectedCurrency, mounted]);

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

  // Coupon operations
  const applyCoupon = async (
    code: string,
    merchantId: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await axiosInstance.post('/coupons/validate', {
        code,
        merchantId,
        cartItems: items.map((item) => ({
          productId: item.product._id,
          categoryId: item.product.category,
          price: item.product.price,
          quantity: item.quantity,
        })),
        totalAmount: getSubtotal(),
      });

      if (response.data.valid) {
        setAppliedCoupon({
          code,
          discount: response.data.discountAmount || 0,
          type: response.data.coupon.type,
          discountType: response.data.coupon.discountType,
        });
        return { success: true };
      }
      return { success: false, message: response.data.message || 'الكوبون غير صالح' };
    } catch (error: any) {
      console.error('Coupon validation failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'فشل التحقق من الكوبون',
      };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  // Currency operations
  const handleSetCurrency = (currency: string) => {
    setSelectedCurrency(currency);
  };

  // Price calculations
  const getSubtotal = (): number => {
    return items.reduce((sum, item) => {
      const price = item.product.salePrice || item.product.price || 0;
      return sum + price * item.quantity;
    }, 0);
  };

  const getCouponDiscount = (): number => {
    if (!appliedCoupon) return 0;
    return appliedCoupon.discount;
  };

  const getTotal = (): number => {
    const subtotal = getSubtotal();
    const discount = getCouponDiscount();
    return Math.max(0, subtotal - discount);
  };

  // Computed values
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = getTotal();

  return (
    <CartContext.Provider
      value={{
        items,
        appliedCoupon,
        selectedCurrency,
        
        // Cart operations
        addItem,
        removeItem,
        clearCart,
        updateQuantity,
        
        // Coupon operations
        applyCoupon,
        removeCoupon,
        
        // Currency operations
        setSelectedCurrency: handleSetCurrency,
        
        // Price calculations
        getSubtotal,
        getCouponDiscount,
        getTotal,
        
        // Computed values
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

