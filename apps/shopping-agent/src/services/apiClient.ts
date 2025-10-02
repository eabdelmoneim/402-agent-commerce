import { ProductSearchResponse, ProductDetailsResponse } from '../types/Product.js';
import { PurchaseResponse } from '../types/Payment.js';
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
      // Construct the merchant purchase URL
      // Use NGROK_FETCH_URL in development for external access, otherwise use baseUrl
      const isDevelopment = process.env.NODE_ENV === 'development';
      const baseUrlForFetch = isDevelopment && process.env.NGROK_FETCH_URL 
        ? process.env.NGROK_FETCH_URL 
        : this.baseUrl;
      const merchantPurchaseUrl = `${baseUrlForFetch}/purchase/${productId}`;
      console.log(`💳 Executing purchase via thirdweb x402/fetch for product: ${productId}`);
      console.log(`🔗 Merchant URL: ${merchantPurchaseUrl}${isDevelopment ? ' (using NGROK_FETCH_URL)' : ''}`);

      // Get wallet address - use agent wallet if available, otherwise use global wallet
      let walletAddress: string;
      if (this.agentWallet) {
        walletAddress = this.agentWallet.address;
        console.log(`🔑 Using agent wallet: ${walletAddress}`);
      } else {
        const address = await clientWalletService.getWalletAddress();
        if (!address) {
          throw new Error('No wallet address available. Please initialize wallet first.');
        }
        walletAddress = address;
        console.log(`🔑 Using global wallet: ${walletAddress}`);
      }

      // Get thirdweb secret key from environment
      const thirdwebSecretKey = process.env.THIRDWEB_SECRET_KEY;
      if (!thirdwebSecretKey) {
        throw new Error('THIRDWEB_SECRET_KEY not found in environment');
      }

      // Call thirdweb x402/fetch API
      const thirdwebApiUrl = 'https://api.thirdweb.com/v1/payments/x402/fetch';
      const queryParams = new URLSearchParams({
        url: merchantPurchaseUrl,
        method: 'POST',
        from: walletAddress
      });

      console.log(`🌐 Calling thirdweb x402/fetch: ${thirdwebApiUrl}?${queryParams.toString()}`);
      
      const response = await fetch(`${thirdwebApiUrl}?${queryParams.toString()}`, {
        method: 'POST',
        headers: {
          'x-secret-key': thirdwebSecretKey,
          'Content-Type': 'application/json'
        }
      });

      // Handle successful payment (200)
      if (response.status === 200) {
        const data: PurchaseResponse = await response.json();
        console.log(`✅ Purchase successful! Transaction ID: ${data.transactionId}`);
        return data;
      }

      // Handle funding required (402)
      if (response.status === 402) {
        console.log(`💰 Wallet funding required (402) - insufficient balance`);
        const fundingResponse = await response.json();
        console.log('🔍 Funding response:', fundingResponse);
        
        // TODO: if on mainnet thirdweb api will return id, link, quote that can be used
        // to fund the wallet. for testnet we will use the base sepolia faucet to fund the wallet.
        // const { id, link } = fundingResponse.result;
        
        // console.log(`📋 Payment ID: ${id}`);
        // console.log(`🔗 Funding link: ${link}`);
        
        return {
          success: false,
          productId,
          fundingRequired: true,
          fundingLink: "https://faucet.circle.com/",
          paymentId: "",
          error: 'Insufficient wallet balance - funding required to complete purchase'
        };
      }

      // Handle other error responses
      const errorText = await response.text();
      console.log(`❌ Purchase failed with status ${response.status}: ${errorText}`);
      return {
        success: false,
        productId,
        error: `HTTP ${response.status}: ${errorText}`
      };
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
}
