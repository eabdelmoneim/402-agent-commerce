import { Product, ProductSearchResponse } from '../types/Product.js';
import { ToolResult } from '../types/Tool.js';
import { ApiClient } from '../services/apiClient.js';

export interface GetProductsToolInput {
  query: string;
  maxPrice?: string;
  minPrice?: string;
  category?: string;
  count?: string;
}

export interface GetProductsToolOutput extends ToolResult {
  products?: Product[];
}

export async function getProducts(input: GetProductsToolInput): Promise<GetProductsToolOutput> {
  try {
    console.log('🔍 Searching for products:', input);
    
    const apiClient = new ApiClient();
    
    // Convert string parameters to appropriate types
    const options: any = {};
    if (input.count) {
      const countNum = parseInt(input.count);
      if (countNum >= 1 && countNum <= 10) {
        options.count = countNum;
      }
    }
    if (input.maxPrice) {
      options.maxPrice = input.maxPrice;
    }
    if (input.minPrice) {
      options.minPrice = input.minPrice;
    }
    if (input.category) {
      options.category = input.category;
    }

    const result: ProductSearchResponse = await apiClient.searchProducts(input.query, options);

    if (result.success && result.products?.length > 0) {
      const productList = result.products.map((p, i) =>
        `${i + 1}. ${p.name} - $${p.price} USDC (ID: ${p.id})`
      ).join('\n');

      const observation = `Found ${result.products.length} products:\n${productList}\n\nTo buy a product, use the ID shown above.`;
      
      console.log('🔧 Generated observation:', observation);
      console.log('🔧 First product:', result.products[0]);
      
      return {
        success: true,
        data: result,
        products: result.products,
        observation
      };
    } else {
      return {
        success: true,
        data: result,
        products: [],
        observation: `No products found matching "${input.query}". ${result.message || 'Consider broader search terms or different price range.'}`
      };
    }
  } catch (error: any) {
    console.error('Error in getProducts tool:', error);
    return {
      success: false,
      data: null,
      error: error.message,
      observation: `Error searching for products: ${error.message}. Please try again with different search terms.`
    };
  }
}
