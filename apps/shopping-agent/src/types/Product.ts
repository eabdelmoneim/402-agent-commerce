export interface Product {
  id: string;
  name: string;
  description: string;
  features: string[];
  price: string;           // USDC amount (e.g., "4.20")
  priceWei?: string;       // Price in wei format for blockchain
  currency?: 'USDC';
  network?: 'base-sepolia';
  category: string;
  image_url?: string;
}

export interface ProductSearchResponse {
  success: boolean;
  products: Product[];
  message?: string;
}

export interface ProductDetailsResponse {
  success: boolean;
  product: Product;
  message?: string;
}
