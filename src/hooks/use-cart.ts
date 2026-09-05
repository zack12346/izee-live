"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cart";

export function useCartCount() {
  const items = useCartStore((state) => state.items);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(items.reduce((sum, item) => sum + item.quantity, 0));
  }, [items]);

  return count;
}

export function useHydratedCart() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
