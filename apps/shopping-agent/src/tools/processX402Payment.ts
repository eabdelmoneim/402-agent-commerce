import { ToolResult } from '../types/Tool.js';

export interface PaymentToolInput {
  productId: string;
  productName: string;
  price: string;
  userConfirmed: boolean;
}

export interface PaymentToolOutput extends ToolResult {
  paymentHeader?: string;
  paymentPayload?: any;
  transactionId?: string;
}

export async function processX402Payment(
  input: PaymentToolInput
): Promise<PaymentToolOutput> {
  try {
    console.log('💳 Processing x402 payment:', input);

    // Validate user confirmation
    if (!input.userConfirmed) {
      return {
        success: false,
        data: null,
        error: 'User confirmation required before processing payment',
        observation: 'Cannot process payment without explicit user confirmation. Please confirm the purchase first.'
      };
    }

    // Validate required parameters
    const { productId, productName, price } = input;
    if (!productId || !productName || !price) {
      return {
        success: false,
        data: null,
        error: 'Missing required payment parameters',
        observation: 'Payment failed: Missing product information. Please select a product first.'
      };
    }

    // Get the agent instance to access its ApiClient
    const { agentInstance } = await import('../agent/tools.js');
    if (!agentInstance || !agentInstance.apiClient) {
      return {
        success: false,
        data: null,
        error: 'Agent instance not available',
        observation: 'Payment failed: Agent instance not properly initialized. Please try again.'
      };
    }

    // Execute purchase - this handles the entire x402 flow internally
    console.log(`💸 Executing purchase for ${productName}...`);
    const purchaseResponse = await agentInstance.apiClient.executePurchase(productId);

    if (purchaseResponse.success) {
      return {
        success: true,
        data: {
          purchaseResponse
        },
        transactionId: purchaseResponse.transactionId,
        observation: `✅ Payment successful! Purchased "${productName}" for $${price} USDC.\n🧾 Transaction ID: ${purchaseResponse.transactionId}\n💰 Amount: $${price} USDC\n🌐 Network: Base Sepolia`
      };
    } else if (purchaseResponse.fundingRequired) {
      // Handle case where wallet needs funding
      return {
        success: false,
        data: purchaseResponse,
        error: 'Wallet funding required',
        observation: `💰 Insufficient wallet balance to purchase "${productName}" ($${price} USDC)

⚠️ Your agent wallet needs USDC on Base Sepolia testnet.

🚰 Get free testnet USDC from Circle's faucet:
${purchaseResponse.fundingLink}

After funding your wallet, simply ask me to buy this product again and I'll retry the purchase!`
      };
    } else {
      return {
        success: false,
        data: purchaseResponse,
        error: purchaseResponse.error || 'Purchase failed',
        observation: `❌ Payment failed for "${productName}": ${purchaseResponse.error || 'Unknown error occurred'}`
      };
    }
  } catch (error: any) {
    console.error('Error in processX402Payment tool:', error);
    return {
      success: false,
      data: null,
      error: error.message,
      observation: `❌ Payment processing error: ${error.message}. Please try again or check your wallet configuration.`
    };
  }
}
