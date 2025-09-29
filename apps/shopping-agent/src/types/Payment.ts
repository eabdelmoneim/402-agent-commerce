export interface X402PaymentRequirements {
  scheme: 'exact';
  network: 'base-sepolia';
  maxAmountRequired: string;  // USDC amount in wei
  resource: string;           // Product/resource identifier
  description: string;        // Human readable description
  mimeType: 'application/json';
  outputSchema?: Record<string, any>;
  payTo: string;             // Merchant wallet address
  maxTimeoutSeconds: number; // Payment timeout
  asset: string;             // USDC contract address
  extra?: Record<string, any>;
}

export interface PaymentRequest {
  productId: string;
  amount: string;
  currency: 'USDC';
  network: 'base-sepolia';
  userWalletAddress: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionHash?: string;
  error?: string;
  x402Requirements?: X402PaymentRequirements;
}

export interface PaymentRequirementsResponse {
  success: boolean;
  x402Requirements: X402PaymentRequirements;
  error?: string;
}

export interface PurchaseResponse {
  success: boolean;
  productId: string;
  transactionId?: string;
  purchaseDetails?: {
    product: any;
    amount: string;
    currency: 'USDC';
    network: 'base-sepolia';
  };
  error?: string;
  data?: any; // For 402 responses containing x402 requirements
}

export interface ThirdwebWalletResponse {
  result: {
    address: string;
    createdAt: string;
    profiles: Array<{
      email: string;
      emailVerified: boolean;
      familyName: string;
      givenName: string;
      hd: string;
      id: string;
      locale: string;
      name: string;
      picture: string;
      type: 'google';
    }>;
    smartWalletAddress: string;
    publicKey: string;
  };
}

export interface AgentWalletConfig {
  identifier: string;
  address: string;
  smartWalletAddress: string;
  publicKey: string;
  role: 'client_agent';
}

export interface ThirdwebX402PrepareRequest {
  from: string;  // User wallet address
  paymentRequirements: X402PaymentRequirements;
}

export interface ThirdwebX402PrepareResponse {
  result: {
    paymentPayload: {
      x402Version: number;
      scheme: string;
      network: string;
      payload: {
        signature: string;
        authorization: {
          from: string;
          to: string;
          value: string;
          validAfter: string;
          validBefore: string;
          nonce: string;
        };
      };
    };
    paymentHeader: string;  // b64 encoded payment header for x-payment header
  };
}
