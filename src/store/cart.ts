"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  couponCode: string;
  addItem: (productId: string, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  setCoupon: (code: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: "",
      addItem: (productId, quantity = 1) => {
        const items = [...get().items];
        const existing = items.find((item) => item.productId === productId);
        if (existing) {
          existing.quantity = Math.min(20, existing.quantity + quantity);
        } else {
          items.push({ productId, quantity });
        }
        set({ items });
      },
      removeItem: (productId) => {
        set({ items: get().items.filter((item) => item.productId !== productId) });
      },
      setQuantity: (productId, quantity) => {
        if (quantity < 1) {
          set({ items: get().items.filter((item) => item.productId !== productId) });
          return;
        }
        set({
          items: get().items.map((item) =>
            item.productId === productId ? { ...item, quantity: Math.min(20, quantity) } : item,
          ),
        });
      },
      setCoupon: (code) => set({ couponCode: code.trim().toUpperCase() }),
      clear: () => set({ items: [], couponCode: "" }),
    }),
    { name: "digisouq-cart" },
  ),
);
