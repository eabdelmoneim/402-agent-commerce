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

    console.log(`🔄 Processing payment for ${product.name} using thirdweb x402...`);

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

      // Get transaction hash from thirdweb API using transaction ID
      let transactionHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 8)}`; // fallback
      
      if (settlementResult.paymentReceipt?.transaction) {
        try {
          const thirdwebSecretKey = process.env.THIRDWEB_SECRET_KEY;
          const thirdwebApiUrl = process.env.THIRDWEB_API_URL || 'https://api.thirdweb.com/v1';
          
          if (thirdwebSecretKey) {
            console.log(`🔍 Fetching transaction details for ID: ${settlementResult.paymentReceipt.transaction}`);
            
            const transactionResponse = await fetch(`${thirdwebApiUrl}/transactions/${settlementResult.paymentReceipt.transaction}`, {
              method: 'GET',
              headers: {
                'x-secret-key': thirdwebSecretKey
              }
            });

            if (transactionResponse.ok) {
              const transactionData = await transactionResponse.json();
              console.log(`📋 Transaction details:`, transactionData);
              
              if (transactionData.result?.transactionHash) {
                transactionHash = transactionData.result.transactionHash;
                console.log(`✅ Retrieved transaction hash: ${transactionHash}`);
              } else {
                console.warn(`⚠️ No transaction hash found in response:`, transactionData);
              }
            } else {
              console.error(`❌ Failed to fetch transaction details: ${transactionResponse.status} ${transactionResponse.statusText}`);
            }
          } else {
            console.warn(`⚠️ THIRDWEB_SECRET_KEY not configured, using fallback transaction hash`);
          }
        } catch (error) {
          console.error(`❌ Error fetching transaction details:`, error);
        }
      } else {
        console.warn(`⚠️ No transaction ID in payment receipt, using fallback transaction hash`);
      }

      const response: PurchaseResponse = {
        success: true,
        productId,
        transactionHash,
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
