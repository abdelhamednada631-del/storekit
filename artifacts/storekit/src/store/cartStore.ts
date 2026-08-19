import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem { 
  id: string; 
  productId: string; 
  variantId: string; 
  productName: string; 
  variantLabel: string; 
  imageUrl: string; 
  price: number; 
  compareAtPrice?: number; 
  quantity: number; 
  maxQuantity: number; 
}

interface CartState { 
  items: CartItem[]; 
  isOpen: boolean; 
  addItem: (item: Omit<CartItem, 'id'>) => void; 
  removeItem: (variantId: string) => void; 
  updateQuantity: (variantId: string, qty: number) => void; 
  clearCart: () => void; 
  openCart: () => void; 
  closeCart: () => void; 
}

export const useCartStore = create<CartState>()(persist((set, get) => ({
  items: [], 
  isOpen: false,
  addItem: (item) => set((state) => {
    const existing = state.items.find(i => i.variantId === item.variantId);
    if (existing) return { items: state.items.map(i => i.variantId === item.variantId ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.maxQuantity) } : i) };
    return { items: [...state.items, { ...item, id: crypto.randomUUID() }] };
  }),
  removeItem: (variantId) => set(state => ({ items: state.items.filter(i => i.variantId !== variantId) })),
  updateQuantity: (variantId, qty) => set(state => qty <= 0 ? { items: state.items.filter(i => i.variantId !== variantId) } : { items: state.items.map(i => i.variantId === variantId ? { ...i, quantity: Math.min(qty, i.maxQuantity) } : i) }),
  clearCart: () => set({ items: [] }),
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
}), { name: 'storekit-cart' }));
