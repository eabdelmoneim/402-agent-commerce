import express from 'express';
import { ThirdwebX402Service } from '../services/thirdwebX402Service.js';
import { ThirdwebWalletService } from '../services/thirdwebWalletService.js';
import { PurchaseResponse } from '../types/payment.js';
import { productCache } from './products.js';

const router: express.Router = express.Router();

let thirdwebX402Service: ThirdwebX402Service;

export function initializePurchaseRouter(walletService: ThirdwebWalletService): express.Router {
  // Initialize thirdweb x402 service with wallet configuration
  const merchantWallet = walletService.getMerchantFacilitatorWallet();
  if (!merchantWallet) {
    throw new Error('Merchant wallet must be initialized before purchase router');
  }

  const thirdwebSecretKey = process.env.THIRDWEB_SECRET_KEY;
  const baseUrl = process.env.BASE_URL || 'http://localhost:3001';

  if (!thirdwebSecretKey) {
    throw new Error('THIRDWEB_SECRET_KEY environment variable is required');
  }

  thirdwebX402Service = new ThirdwebX402Service({
    secretKey: thirdwebSecretKey,
    walletConfig: merchantWallet,
    baseUrl
  });

  console.log('✅ Thirdweb x402 service initialized with facilitator');

  return router;
}

// POST /api/purchase/:productId - Execute purchase with x402 payment header
router.post('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const paymentData = req.headers['x-payment'] as string;

    const product = productCache.get(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        productId,
        error: 'Product not found'
      } as PurchaseResponse);
    }

    // Use thirdweb's settlePayment to handle the x402 payment
    const resourceUrl = `${process.env.BASE_URL}/api/purchase/${productId}`;
    const method = req.method.toUpperCase();

    console.log(`🔄 Processing payment for ${product.name} using thirdweb x402... with payment header: ${paymentData}`);

    const settlementResult = await thirdwebX402Service.settlePayment(
      resourceUrl,
      method,
      paymentData,
      product
    );

    if (settlementResult.status === 200) {
      // Payment successful - thirdweb handled the blockchain transaction
      console.log(`✅ Payment successful for product ${productId}:`, {
        product: product.name,
        amount: `$${product.price} USDC`,
        status: settlementResult.status
      });

      console.log(`✅ Settlement result for product ${productId}:`, settlementResult);

      // Transaction lookup now handled by Agents API proxy; return the transaction ID directly
      const transactionId = settlementResult.paymentReceipt?.transaction;

      const response: PurchaseResponse = {
        success: true,
        productId,
        transactionId,
        purchaseDetails: {
          product,
          amount: product.price,
          currency: 'USDC',
          network: 'base-sepolia'
        }
      };

      // Set any response headers from thirdweb
      if (settlementResult.responseHeaders) {
        for (const [key, value] of Object.entries(settlementResult.responseHeaders)) {
          res.set(key, value as string);
        }
      }

      return res.json(response);
    } else if(settlementResult.status === 402) {
      // Payment required - return thirdweb's response with proper x402 format
      console.log(`💳 Payment required for product ${productId}:`, {
        status: settlementResult.status,
        product: product.name
      });

      // Set response headers from thirdweb (important for x402 protocol)
      if (settlementResult.responseHeaders) {
        for (const [key, value] of Object.entries(settlementResult.responseHeaders)) {
          res.set(key, value as string);
        }
      }

      // Return thirdweb's response body with the status from thirdweb
      return res.status(settlementResult.status).json(settlementResult.responseBody);
    } else {
      console.log(`❌ Payment failed for product ${productId}:`, settlementResult.responseBody);
      return res.status(settlementResult.status).json(settlementResult.responseBody);
    }
  } catch (error: any) {
    console.error('Error processing purchase:', error);
    return res.status(500).json({
      success: false,
      productId: req.params.productId,
      error: error.message
    } as PurchaseResponse);
  }
});

export default router;
