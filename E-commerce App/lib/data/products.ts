export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  compareAt?: number;
  image: string;
  rating: number;
  reviews: number;
  stock: number;
  badge?: string;
};

export const products: Product[] = [
  {
    id: "aurora-headphones",
    name: "Aurora Wireless Headphones",
    category: "Audio",
    price: 149,
    compareAt: 179,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85",
    rating: 4.8,
    reviews: 124,
    stock: 18,
    badge: "Bestseller",
  },
  {
    id: "luma-watch",
    name: "Luma Smart Watch S2",
    category: "Wearables",
    price: 219,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85",
    rating: 4.7,
    reviews: 89,
    stock: 11,
    badge: "New",
  },
  {
    id: "arc-lamp",
    name: "Arc Minimal Desk Lamp",
    category: "Home",
    price: 68,
    compareAt: 79,
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85",
    rating: 4.6,
    reviews: 52,
    stock: 27,
  },
  {
    id: "nova-backpack",
    name: "Nova Travel Backpack",
    category: "Bags",
    price: 92,
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85",
    rating: 4.9,
    reviews: 163,
    stock: 34,
  },
  {
    id: "terra-sneakers",
    name: "Terra Everyday Sneakers",
    category: "Fashion",
    price: 118,
    compareAt: 140,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85",
    rating: 4.5,
    reviews: 77,
    stock: 9,
    badge: "Sale",
  },
  {
    id: "pulse-speaker",
    name: "Pulse Bluetooth Speaker",
    category: "Audio",
    price: 79,
    image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=85",
    rating: 4.7,
    reviews: 105,
    stock: 22,
  },
];
