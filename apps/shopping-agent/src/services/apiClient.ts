import { ProductSearchResponse, ProductDetailsResponse } from '../types/Product.js';
import { PurchaseResponse, X402PaymentRequirements, ThirdwebX402PrepareResponse } from '../types/Payment.js';
import { clientWalletService } from './globalWallet.js';
import { AgentWalletConfig } from '../agents-api/services/agentManager.js';

export class ApiClient {
  private baseUrl: string;
  private agentWallet: AgentWalletConfig | null = null;

  constructor(agentWallet?: AgentWalletConfig) {
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3001/api';
    this.agentWallet = agentWallet || null;
  }

  async searchProducts(query: string, options?: {
    count?: number;
    maxPrice?: string;
    minPrice?: string;
    category?: string;
  }): Promise<ProductSearchResponse> {
    try {
      const params = new URLSearchParams({
        query
      });

      if (options?.count) {
        params.append('count', options.count.toString());
      }
      if (options?.maxPrice) {
        params.append('maxPrice', options.maxPrice);
      }
      if (options?.minPrice) {
        params.append('minPrice', options.minPrice);
      }

      const url = `${this.baseUrl}/products?${params.toString()}`;
      console.log(`🔍 Searching products: ${url}`);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ProductSearchResponse = await response.json();
      console.log(`✅ Found ${data.products?.length || 0} products`);
      
      return data;
    } catch (error: any) {
      console.error('Error searching products:', error);
      return {
        success: false,
        products: [],
        message: `Failed to search products: ${error.message}`
      };
    }
  }

  async getProduct(productId: string): Promise<ProductDetailsResponse> {
    try {
      const url = `${this.baseUrl}/products/${productId}`;
      console.log(`🔍 Getting product details: ${url}`);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ProductDetailsResponse = await response.json();
      console.log(`✅ Retrieved product: ${data.product?.name || productId}`);
      
      return data;
    } catch (error: any) {
      console.error('Error getting product:', error);
      throw new Error(`Failed to get product: ${error.message}`);
    }
  }


  async executePurchase(productId: string): Promise<PurchaseResponse> {
    try {
      const url = `${this.baseUrl}/purchase/${productId}`;
      console.log(`💳 Executing purchase: ${url}`);

      // Step 1: Initial purchase attempt (no payment header)
      let response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Handle 402 Payment Required (trigger x402 flow)
      if (response.status === 402) {
        console.log(`💳 Payment required (402) - starting x402 flow...`);
        const x402Response = await response.json();
        console.log('🔍 Received x402 response:', x402Response);
        
        // Extract payment requirements from the accepts array
        let paymentRequirements;
        if (x402Response.accepts && x402Response.accepts.length > 0) {
          paymentRequirements = x402Response.accepts[0]; // Take the first accepted payment method
          console.log('✅ Extracted payment requirements:', paymentRequirements);
        } 
        
        try {
          // Step 2: Prepare x402 payment using agent-specific wallet
          console.log(`🔑 Preparing x402 payment signature...`);
          const prepareResult = await this.prepareX402Payment(productId, paymentRequirements);
          const { paymentHeader } = prepareResult.result;

          // Step 3: Retry purchase with x-payment header
          console.log(`💸 Retrying purchase with payment header...`);
          response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-payment': paymentHeader
            }
          });
        } catch (prepareError: any) {
          return {
            success: false,
            productId,
            error: `Failed to prepare x402 payment: ${prepareError.message}`
          };
        }
      }

      // Handle other non-success responses
      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          productId,
          error: `HTTP ${response.status}: ${errorText}`
        };
      }

      const data: PurchaseResponse = await response.json();
      
      if (data.success) {
        console.log(`✅ Purchase successful! Transaction: ${data.transactionHash}`);
      } else {
        console.log(`❌ Purchase failed: ${data.error}`);
      }
      
      return data;
    } catch (error: any) {
      console.error('Error executing purchase:', error);
      return {
        success: false,
        productId,
        error: `Failed to execute purchase: ${error.message}`
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const url = this.baseUrl.replace('/api', '/health');
      const response = await fetch(url);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async prepareX402Payment(productId: string, requirements: X402PaymentRequirements): Promise<ThirdwebX402PrepareResponse> {
    // Use agent-specific wallet if available, otherwise fall back to global wallet service
    if (this.agentWallet) {
      // Create a temporary AgentWalletService instance with the agent's wallet
      const { AgentWalletService } = await import('./agentWalletService.js');
      const tempWalletService = new AgentWalletService();
      // Set the wallet directly (bypassing the createOrGetAgentWallet method)
      (tempWalletService as any).agentWallet = this.agentWallet;
      return await tempWalletService.prepareX402Payment(productId, requirements);
    } else {
      // Fall back to global wallet service for CLI usage
      return await clientWalletService.prepareX402Payment(productId, requirements);
    }
  }
}
