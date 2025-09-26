import express from 'express';
import { ProductGeneratorService } from '../services/productGenerator.js';
import { ProductsQuery, ProductsResponse, GeneratedProduct } from '../types/product.js';

const router: express.Router = express.Router();

// In-memory storage for demo purposes
// In a real app, you'd use a database
const productCache: Map<string, GeneratedProduct> = new Map();

// Initialize product generator service
let productGenerator: ProductGeneratorService;

export function initializeProductsRouter(openaiApiKey: string): express.Router {
  productGenerator = new ProductGeneratorService(openaiApiKey);
  return router;
}

// GET /api/products?query=TV&count=3&maxPrice=5
router.get('/', async (req: express.Request<{}, ProductsResponse, {}, ProductsQuery>, res) => {
  try {
    const { query, count, maxPrice, minPrice } = req.query;

    // Validate required parameters
    if (!query) {
      return res.status(400).json({
        success: false,
        products: [],
        message: 'Query parameter is required (e.g., ?query=TV)'
      });
    }

    // Parse optional parameters
    const productCount = count ? parseInt(count) : 3;
    const maxPriceNum = maxPrice ? parseFloat(maxPrice) : 9;
    const minPriceNum = minPrice ? parseFloat(minPrice) : 1;

    // Validate parameters
    if (productCount < 1 || productCount > 10) {
      return res.status(400).json({
        success: false,
        products: [],
        message: 'Count must be between 1 and 10'
      });
    }

    if (maxPriceNum <= minPriceNum) {
      return res.status(400).json({
        success: false,
        products: [],
        message: 'maxPrice must be greater than minPrice'
      });
    }

    console.log(`Generating ${productCount} ${query} products ($${minPriceNum}-$${maxPriceNum} USDC)`);

    // Generate products using OpenAI
    const products = await productGenerator.generateProducts({
      category: query,
      count: productCount,
      maxPrice: maxPriceNum,
      minPrice: minPriceNum
    });

    // Cache products for later retrieval
    products.forEach(product => {
      productCache.set(product.id, product);
    });

    console.log(`Generated ${products.length} products successfully`);

    return res.json({
      success: true,
      products,
      message: `Generated ${products.length} ${query} products`
    });

  } catch (error: any) {
    console.error('Error generating products:', error);
    return res.status(500).json({
      success: false,
      products: [],
      message: `Failed to generate products: ${error.message}`
    });
  }
});

// GET /api/products/:productId - Get specific product details
router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    // Check cache first
    const cachedProduct = productCache.get(productId);
    if (cachedProduct) {
      return res.json({
        success: true,
        product: cachedProduct
      });
    }

    // If not in cache, generate a single product based on the ID
    const category = productId.includes('tv') ? 'TV' :
                    productId.includes('laptop') ? 'laptop' :
                    productId.includes('headphone') ? 'headphones' : 'electronics';

    const products = await productGenerator.generateProducts({
      category,
      count: 1
    });

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Override the generated ID with the requested one for consistency
    const product = { ...products[0], id: productId };

    // Cache for future requests
    productCache.set(productId, product);

    return res.json({
      success: true,
      product
    });

  } catch (error: any) {
    console.error('Error fetching product:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to fetch product: ${error.message}`
    });
  }
});

// Export product cache for use in other routes
export { productCache };
export default router;
