/**
 * Type declarations for thirdweb v5 modules
 * This helps IDEs resolve thirdweb module types properly
 */

declare module 'thirdweb' {
  export interface ThirdwebClient {
    // Minimal type definition for client
    secretKey?: string;
  }
  
  export function createThirdwebClient(config: { secretKey: string }): ThirdwebClient;
}

declare module 'thirdweb/x402' {
  import { ThirdwebClient } from 'thirdweb';
  
  export interface FacilitatorConfig {
    client: ThirdwebClient;
    serverWalletAddress: string;
  }
  
  export interface SettlePaymentConfig {
    resourceUrl: string;
    method: string;
    paymentData: string | null;
    payTo: string;
    network: any;
    price: string;
    routeConfig: {
      description: string;
      mimeType: string;
      outputSchema: Record<string, any>;
    };
    facilitator: any;
  }
  
  export interface SettlePaymentResult {
    status: number;
    responseHeaders?: Record<string, string>;
    responseBody?: any;
  }
  
  export function facilitator(config: FacilitatorConfig): any;
  export function settlePayment(config: SettlePaymentConfig): Promise<SettlePaymentResult>;
}

declare module 'thirdweb/chains' {
  export interface Chain {
    name: string;
    id: number;
    rpcUrls: string[];
  }
  
  export const baseSepolia: Chain;
}
