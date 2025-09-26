import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { ThirdwebWalletService } from './services/thirdwebWalletService.js';
import { initializeProductsRouter } from './routes/products.js';
import { initializePurchaseRouter } from './routes/purchase.js';

// Load environment variables
dotenv.config();

const app: express.Application = express();

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-production-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Initialize services
const walletService = new ThirdwebWalletService();

// Initialize merchant wallet on server startup
export async function initializeServer() {
  try {
    console.log('🚀 Initializing Shopping Agent Server...');

    // Validate required environment variables
    const requiredEnvVars = [
      'OPENAI_API_KEY',
      'THIRDWEB_SECRET_KEY',
      'MERCHANT_WALLET_IDENTIFIER'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Initialize merchant facilitator wallet
    const merchantWallet = await walletService.createOrGetMerchantWallet();
    console.log('✅ Merchant wallet initialized:', {
      identifier: merchantWallet.identifier,
      walletAddress: merchantWallet.address,
      role: merchantWallet.role
    });

    // Initialize routes with dependencies
    const openaiApiKey = process.env.OPENAI_API_KEY!;
    console.log('🔧 Initializing products router...');
    const productsRouter = initializeProductsRouter(openaiApiKey);
    app.use('/api/products', productsRouter);
    console.log('✅ Products router mounted at /api/products');

    console.log('🔧 Initializing purchase router...');
    const purchaseRouter = initializePurchaseRouter(walletService);
    app.use('/api/purchase', purchaseRouter);
    console.log('✅ Purchase router mounted at /api/purchase');

    console.log('✅ Routes initialized successfully');

    // Add error handling and 404 handler AFTER routes are initialized
    // Error handling middleware
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('Unhandled error:', err);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
      });
    });

    // 404 handler - must be last
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.path} not found`,
        availableEndpoints: [
          'GET /health',
          'GET /api',
          'GET /api/products?query=<category>',
          'GET /api/products/:productId',
          'POST /api/purchase/:productId'
        ]
      });
    });

    console.log('✅ Server initialization complete');
  } catch (error: any) {
    console.error('❌ Server initialization failed:', error);
    throw error;
  }
}

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      merchantWallet: walletService.getMerchantFacilitatorWallet() ? 'initialized' : 'not_initialized'
    }
  });
});

// API info endpoint
app.get('/api', (_req, res) => {
  res.json({
    name: 'Shopping Agent Store API',
    version: '1.0.0',
    description: 'Node Express Store API with x402 Payment Integration',
    endpoints: {
      products: {
        search: 'GET /api/products?query=TV&maxPrice=5',
        details: 'GET /api/products/:productId'
      },
      purchase: {
        execute: 'POST /api/purchase/:productId (supports x402 payment protocol)'
      },
      utility: {
        health: 'GET /health',
        info: 'GET /api'
      }
    },
    examples: {
      searchTVs: '/api/products?query=TV&maxPrice=5&count=3',
      searchLaptops: '/api/products?query=laptop&minPrice=3&maxPrice=8',
      searchHeadphones: '/api/products?query=headphones'
    }
  });
});


export default app;
