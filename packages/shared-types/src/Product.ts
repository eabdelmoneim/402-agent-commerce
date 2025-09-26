/**
 * Shared Product types for Shopping Agent ecosystem
 * Used by both client and server applications
 */

export interface Product {
  id: string;
  name: string;
  description: string;
  features: string[];
  price: string;           // USDC amount (e.g., "4.20")
  priceWei: string;        // Price in wei format for blockchain
  currency: 'USDC';
  network: 'base-sepolia';
  category: string;
  image_url?: string;
}

export interface ProductQuery {
  query: string;
  count?: number;
  maxPrice?: number;
  minPrice?: number;
  category?: string;
}

export interface ProductResponse {
  success: boolean;
  products: Product[];
  message?: string;
}
