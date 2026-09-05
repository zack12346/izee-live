"use client";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart";
export function AddToCart({ productId }: { productId: string }) { const addItem = useCartStore((state) => state.addItem); return <Button size="lg" className="mt-8 w-full" onClick={() => { addItem(productId); toast.success("أُضيف المنتج إلى السلة"); }}><ShoppingBag /> أضف إلى السلة</Button>; }
