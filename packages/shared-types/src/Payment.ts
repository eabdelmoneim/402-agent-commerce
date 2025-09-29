/**
 * Shared Payment types for Shopping Agent ecosystem
 * Used by both client and server applications for x402 integration
 */

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

export interface WalletConfig {
  identifier: string;
  address: string;
  smartWalletAddress: string;
  publicKey: string;
  role: 'client_agent' | 'merchant_facilitator';
}

export interface AgentWalletConfig {
  identifier: string;
  address: string;
  smartWalletAddress: string;
  publicKey: string;
  role: 'client_agent';
}
