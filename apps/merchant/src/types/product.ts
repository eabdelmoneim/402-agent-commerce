export interface GeneratedProduct {
  id: string;
  name: string;
  description: string;
  features: string[];
  price: string;        // USDC amount (e.g., "4.20")
  priceWei: string;     // Price in wei format for blockchain
  category: string;
  image_url?: string;
}

export interface ProductGeneratorInput {
  category: string;  // "TV", "laptop", etc.
  count?: number;    // Default: 3
  maxPrice?: number; // Default: 9
  minPrice?: number; // Default: 1
}

export interface ProductsQuery {
  query: string;       // Product category/name (required)
  count?: string;      // Number of products (optional, default: 3)
  maxPrice?: string;   // Maximum price in USDC (optional, default: 9)
  minPrice?: string;   // Minimum price in USDC (optional, default: 1)
}

export interface ProductsResponse {
  products: GeneratedProduct[];
  success: boolean;
  message?: string;
}
