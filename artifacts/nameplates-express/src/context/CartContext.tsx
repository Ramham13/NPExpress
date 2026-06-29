import { createContext, useContext, useState, ReactNode } from "react";

export interface CartItem {
  id: string; // unique item id
  productId: string;
  templateName: string;
  size: string;
  color: string;
  quantity: number;
  logoUploaded: boolean;
  logoFit: string | null;
  unitPrice: number;
  totalPrice: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  itemCount: number;
  customerData: any;
  setCustomerData: (data: any) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [customerData, setCustomerData] = useState<any>(null);

  const addItem = (item: Omit<CartItem, "id">) => {
    setItems((prev) => [
      ...prev,
      { ...item, id: Math.random().toString(36).substr(2, 9) },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity, totalPrice: item.unitPrice * quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setCustomerData(null);
  };

  const cartTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        cartTotal,
        itemCount,
        customerData,
        setCustomerData,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
