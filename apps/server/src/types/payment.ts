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

export interface PaymentRequirementsResponse {
  success: boolean;
  x402Requirements: X402PaymentRequirements;
  error?: string;
}

export interface PurchaseRequest {
  // Payment header sent as 'x-payment' header (b64 encoded)
}

export interface PurchaseResponse {
  success: boolean;
  productId: string;
  transactionHash?: string;
  purchaseDetails?: {
    product: any;
    amount: string;
    currency: 'USDC';
    network: 'base-sepolia';
  };
  error?: string;
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

export interface WalletConfig {
  identifier: string;
  address: string;
  smartWalletAddress: string;
  publicKey: string;
  role: 'client_agent' | 'merchant_facilitator';
}
