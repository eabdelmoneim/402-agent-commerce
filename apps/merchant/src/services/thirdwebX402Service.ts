import { createThirdwebClient, ThirdwebClient } from "thirdweb";
import { facilitator, settlePayment } from "thirdweb/x402";
import { baseSepolia } from "thirdweb/chains";
import { WalletConfig } from '../types/payment.js';
import { GeneratedProduct } from '../types/product.js';

export interface ThirdwebX402Config {
  secretKey: string;
  walletConfig: WalletConfig;
  baseUrl: string;
}

export class ThirdwebX402Service {
  private config: ThirdwebX402Config;
  private client: ThirdwebClient;
  private thirdwebFacilitator: any;

  constructor(config: ThirdwebX402Config) {
    // Validate configuration
    if (!config.secretKey) {
      throw new Error('THIRDWEB_SECRET_KEY is required for x402 service');
    }
    if (!config.walletConfig?.address) {
      throw new Error('Wallet configuration with address is required for x402');
    }
    if (!config.walletConfig.address.startsWith('0x')) {
      throw new Error('EOA address must be a valid Ethereum address (0x...)');
    }
    if (!config.baseUrl) {
      throw new Error('Base URL is required for x402 service');
    }

    this.config = config;
    
    try {
      this.client = createThirdwebClient({ 
        secretKey: config.secretKey 
      });
      
        this.thirdwebFacilitator = facilitator({
          client: this.client,
          serverWalletAddress: config.walletConfig.address as `0x${string}`,
        });
        
        console.log('✅ ThirdwebX402Service initialized successfully with EOA wallet:', config.walletConfig.address);
    } catch (error: any) {
      console.error('❌ Failed to initialize ThirdwebX402Service:', error);
      throw new Error(`ThirdwebX402Service initialization failed: ${error.message}`);
    }
  }

  async settlePayment(
    resourceUrl: string,
    method: string,
    paymentData: string | null,
    product: GeneratedProduct
  ) {
    try {
      console.log(`🔄 Settling payment for ${product.name}...`);
      
      // Validate inputs
      if (!resourceUrl || !method || !product) {
        throw new Error('Missing required parameters for payment settlement');
      }

      // Ensure EOA address is in correct format
      const payToAddress = this.config.walletConfig.address;
      if (!payToAddress || !payToAddress.startsWith('0x')) {
        throw new Error('Invalid EOA address format');
      }
      
      const result = await settlePayment({
        resourceUrl,
        method: method.toUpperCase(),
        paymentData,
        payTo: payToAddress as `0x${string}`,
        network: baseSepolia,
        price: `$${product.price}`,
        routeConfig: {
          description: `Purchase of ${product.name} for $${product.price} USDC`,
          mimeType: "application/json" as const,
          outputSchema: {
            productId: product.id,
            productName: product.name,
            price: product.price,
            currency: 'USDC',
            productCategory: product.category,
            merchantName: 'Shopping Agent Store',
            merchantWalletRole: 'facilitator'
          }
        },
        facilitator: this.thirdwebFacilitator,
      });

      console.log(`✅ Payment settlement result:`, {
        status: result.status,
        product: product.name,
        amount: `$${product.price} USDC`
      });

      return result;
    } catch (error: any) {
      console.error('❌ Error settling payment:', error);
      
      // Provide more specific error information
      if (error.message?.includes('insufficient funds')) {
        throw new Error('Insufficient funds for payment');
      } else if (error.message?.includes('invalid signature')) {
        throw new Error('Invalid payment signature');
      } else if (error.message?.includes('network')) {
        throw new Error('Network error during payment processing');
      } else {
        throw new Error(`Payment settlement failed: ${error.message || 'Unknown error'}`);
      }
    }
  }

  validatePaymentHeader(paymentHeader: string): boolean {
    try {
      // Basic validation - thirdweb will handle detailed validation
      if (!paymentHeader || typeof paymentHeader !== 'string') {
        return false;
      }

      // Check if it's base64 encoded (thirdweb x402 format)
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      return base64Regex.test(paymentHeader);
    } catch (error) {
      console.error('Error validating payment header:', error);
      return false;
    }
  }

  getFacilitator() {
    return this.thirdwebFacilitator;
  }

  getClient() {
    return this.client;
  }

  getWalletAddress(): string {
    return this.config.walletConfig.address;
  }
}
