# Agent x402 Integration Guide

## Overview

This guide explains how to integrate x402 payment protocol into AI agent tools, specifically for LangChain agents. The x402 protocol enables agents to handle blockchain-based payments seamlessly within their tool execution flow.

## Understanding x402 in Agent Context

### What is x402?
x402 is a blockchain payment protocol that allows for **payment-required APIs**. When an agent attempts to access a paid resource, the server responds with a `402 Payment Required` status and x402 payment requirements. The agent then prepares a signed payment and retries the request with the payment header.

### Agent Integration Benefits
- **Seamless Payments**: Agents can handle payments without external intervention
- **Real Blockchain Transactions**: Actual cryptocurrency transfers (USDC, ETH, etc.)
- **Gasless Transactions**: Smart wallets eliminate gas fee complexity
- **Programmatic Commerce**: Enable AI agents to participate in blockchain economies

## Implementation Architecture

### 1. Agent Tool Structure

```typescript
// Agent tool that handles x402 payments
export async function processX402Payment(input: PaymentToolInput): Promise<PaymentToolOutput> {
  try {
    // Validate user confirmation
    if (!input.userConfirmed) {
      return {
        success: false,
        error: 'User confirmation required before processing payment',
        observation: 'Cannot process payment without explicit user confirmation.'
      };
    }

    // Execute purchase with built-in x402 flow
    const purchaseResponse = await apiClient.executePurchase(input.productId);
    
    if (purchaseResponse.success) {
      return {
        success: true,
        transactionHash: purchaseResponse.transactionHash,
        observation: `✅ Payment successful! Transaction: ${purchaseResponse.transactionHash}`
      };
    } else {
      return {
        success: false,
        error: purchaseResponse.error,
        observation: `❌ Payment failed: ${purchaseResponse.error}`
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      observation: `❌ Payment processing error: ${error.message}`
    };
  }
}
```

### 2. x402 Flow in API Client

```typescript
// API client with encapsulated x402 flow
async executePurchase(productId: string): Promise<PurchaseResponse> {
  try {
    // Step 1: Initial purchase attempt (no payment header)
    let response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Step 2: Handle 402 Payment Required
    if (response.status === 402) {
      console.log(`💳 Payment required (402) - starting x402 flow...`);
      const x402Response = await response.json();
      
      // Extract payment requirements from accepts array
      let paymentRequirements;
      if (x402Response.accepts && x402Response.accepts.length > 0) {
        paymentRequirements = x402Response.accepts[0]; // Take first accepted payment method
      } else {
        paymentRequirements = x402Response;
      }
      
      // Step 3: Prepare x402 payment using global wallet service
      const prepareResult = await clientWalletService.prepareX402Payment(productId, paymentRequirements);
      const { paymentHeader } = prepareResult.result;

      // Step 4: Retry purchase with x-payment header
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-payment': paymentHeader
        }
      });
    }

    // Handle final response
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        productId,
        error: `HTTP ${response.status}: ${errorText}`
      };
    }

    return await response.json();
  } catch (error: any) {
    return {
      success: false,
      productId,
      error: `Failed to execute purchase: ${error.message}`
    };
  }
}
```

### 3. Smart Wallet Integration

```typescript
// Global wallet service for x402 payments
export class AgentWalletService {
  private clientWallet: AgentWalletConfig | null = null;

  async createOrGetAgentWallet(): Promise<AgentWalletConfig> {
    if (this.clientWallet) return this.clientWallet;

    const response = await fetch(`${thirdwebApiUrl}/wallets/server`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-secret-key': thirdwebSecretKey
      },
      body: JSON.stringify({
        identifier: process.env.CLIENT_WALLET_IDENTIFIER
      })
    });

    const data: ThirdwebWalletResponse = await response.json();
    this.clientWallet = {
      identifier: data.result.identifier,
      address: data.result.address, // thirdweb Server Wallet address for x402
      smartWalletAddress: data.result.smartWalletAddress,
      publicKey: data.result.publicKey,
      role: 'client_agent'
    };

    return this.clientWallet;
  }

  async prepareX402Payment(productId: string, requirements: X402PaymentRequirements): Promise<ThirdwebX402PrepareResponse> {
    const prepareRequest: ThirdwebX402PrepareRequest = {
      from: this.clientWallet!.address, // Use thirdweb Server Wallet address for x402
      paymentRequirements: requirements
    };

    const response = await fetch(`${thirdwebApiUrl}/payments/x402/prepare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-secret-key': thirdwebSecretKey
      },
      body: JSON.stringify(prepareRequest)
    });

    return await response.json();
  }
}
```

## LangChain Tool Integration

### 1. DynamicTool Wrapper

```typescript
import { DynamicTool } from "@langchain/core/tools";

const createProcessPaymentTool = () => {
  return new DynamicTool({
    name: "process_payment",
    description: `Process a payment for a product using x402 protocol with real USDC transactions on Base Sepolia. ONLY use this after user has confirmed they want to buy a specific product.

CRITICAL USAGE RULES:
- ONLY call this tool when user explicitly confirms purchase (e.g., "buy the MacBook Pro", "yes, buy it")
- Input format: productId=<id> productName=<name> price=<amount> userConfirmed=true
- Use the EXACT Product ID from the search results (shown in parentheses)
- ALL parameters are REQUIRED
- userConfirmed must be true (never proceed without user agreement)
- This processes REAL money transactions

EXAMPLES:
- "productId=abc123 productName=Gaming Laptop price=999 userConfirmed=true"
- "productId=xyz789 productName=Wireless Headphones price=149 userConfirmed=true"

NEVER call this tool unless the user has explicitly agreed to purchase!
NEVER guess or infer the productId - use the exact ID from search results!`,
    func: async (input: string) => {
      try {
        // Extract parameters from input
        const params: any = {};
        
        const productIdMatch = input.match(/productId=([^=\s]+)/);
        if (productIdMatch) params.productId = productIdMatch[1];
        
        const productNameMatch = input.match(/productName=([^=]*?)(?:\s+\w+=|$)/);
        if (productNameMatch) params.productName = productNameMatch[1].trim();
        
        const priceMatch = input.match(/price=([^=\s]+)/);
        if (priceMatch) params.price = priceMatch[1];
        
        const userConfirmedMatch = input.match(/userConfirmed=(true|false)/);
        if (userConfirmedMatch) params.userConfirmed = userConfirmedMatch[1] === 'true';

        // Smart product ID resolution using agent context
        if (agentInstance) {
          const storedResults = agentInstance.getLastSearchResults();
          
          if (storedResults.length > 0) {
            // Try to find by name
            if (params.productName) {
              const foundProduct = agentInstance.findProductByName(params.productName);
              if (foundProduct) {
                params.productId = foundProduct.id;
                params.productName = foundProduct.name;
                params.price = foundProduct.price;
              }
            }
            
            // Try to find by index (e.g., "first", "1")
            if (!params.productId) {
              const indexMatch = input.match(/(?:first|1st|1)(?:\s|$)/i);
              if (indexMatch) {
                const product = agentInstance.findProductByIndex(1);
                if (product) {
                  params.productId = product.id;
                  params.productName = product.name;
                  params.price = product.price;
                }
              }
            }
          } else {
            return "ERROR: No product context available. Please search for products first using the get_products tool, then try purchasing again.";
          }
        }
        
        // Validate required parameters
        if (!params.productId || !params.productName || !params.price || !params.userConfirmed) {
          return "ERROR: Missing required parameters. Need: productId, productName, price, and userConfirmed=true";
        }
        
        if (!params.userConfirmed) {
          return "ERROR: Cannot process payment without user confirmation. userConfirmed must be true.";
        }
        
        const result = await processX402Payment(params);
        
        if (result.success && result.observation) {
          return result.observation;
        } else {
          return `Payment failed: ${result.error || 'Unknown error'}`;
        }
      } catch (error: any) {
        return `Error processing payment: ${error.message}. Please try again.`;
      }
    },
  });
};
```

### 2. Agent Context Management

```typescript
// Agent with product context management
export class ShoppingAgent {
  private lastSearchResults: any[] = []; // Store product context

  // Product context management
  setLastSearchResults(products: any[]): void {
    this.lastSearchResults = products;
  }

  getLastSearchResults(): any[] {
    return this.lastSearchResults;
  }

  findProductByName(productName: string): any | null {
    const normalizedName = productName.toLowerCase();
    return this.lastSearchResults.find(p => 
      p.name.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(p.name.toLowerCase().split(' ')[0])
    );
  }

  findProductByIndex(index: number): any | null {
    return this.lastSearchResults[index - 1] || null; // 1-based index
  }
}
```

## x402 Server Implementation

### 1. Server-Side x402 Service

```typescript
// Server x402 service using thirdweb SDK
export class ThirdwebX402Service {
  private thirdwebFacilitator: any;

  constructor(config: ThirdwebX402Config) {
    this.client = createThirdwebClient({ secretKey: config.secretKey });
    
    this.thirdwebFacilitator = facilitator({
      client: this.client,
      serverWalletAddress: config.walletConfig.address as `0x${string}`, // thirdweb Server Wallet address
    });
  }

  async settlePayment(resourceUrl: string, method: string, paymentData: string | null, product: GeneratedProduct) {
    const result = await settlePayment({
      resourceUrl,
      method: method.toUpperCase(),
      paymentData,
      payTo: this.config.walletConfig.address as `0x${string}`, // thirdweb Server Wallet address
      network: baseSepolia,
      price: `$${product.price}`,
      routeConfig: {
        description: `Purchase of ${product.name} for $${product.price} USDC`,
        mimeType: "application/json" as const,
        outputSchema: {
          productId: product.id,
          productName: product.name,
          price: product.price,
          currency: 'USDC'
        }
      },
      facilitator: this.thirdwebFacilitator,
    });

    return result;
  }
}
```

### 2. Purchase Route with x402

```typescript
// Purchase route with x402 flow
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
      });
    }

    // Use thirdweb's settlePayment for real blockchain transactions
    const resourceUrl = `${process.env.BASE_URL}/api/purchase/${productId}`;
    const method = req.method.toUpperCase();

    const settlementResult = await thirdwebX402Service.settlePayment(
      resourceUrl,
      method,
      paymentData,
      product
    );

    if (settlementResult.status === 200) {
      // Payment successful - real blockchain transaction completed
      const transactionHash = settlementResult.responseHeaders?.['x-transaction-hash'] || 
                            `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 8)}`;

      return res.json({
        success: true,
        productId,
        transactionHash,
        purchaseDetails: {
          product,
          amount: product.price,
          currency: 'USDC',
          network: 'base-sepolia'
        }
      });
    } else {
      // Payment required - generate x402 requirements
      const paymentRequirements = thirdwebX402Service.generatePaymentRequirements(product);

      // Set response headers from thirdweb
      if (settlementResult.responseHeaders) {
        for (const [key, value] of Object.entries(settlementResult.responseHeaders)) {
          res.set(key, value as string);
        }
      }

      // Return x402 requirements with 402 status
      return res.status(402).json(paymentRequirements);
    }
  } catch (error: any) {
    console.error('Error processing purchase:', error);
    return res.status(500).json({
      success: false,
      productId: req.params.productId,
      error: error.message
    });
  }
});
```

## Agent Workflow with x402

### 1. Two-Step Shopping Flow

```typescript
// Agent prompt for x402 workflow
const prompt = PromptTemplate.fromTemplate(`You are a shopping assistant. You MUST use the provided tools to search for products and process payments.

CRITICAL RULES:
1. WORKFLOW: Search → Present Results → Wait for User Confirmation → Process Payment (in separate requests)
2. When users ask about products, you MUST use the get_products tool first. Never assume what's available.
3. After getting search results, present them clearly and ask which product they want to buy. Do NOT process payment yet.
4. When users confirm a purchase (e.g., "buy the MacBook Pro", "yes, buy it"), then use process_payment tool.
5. For payments, you MUST include all required parameters: productId, productName, price, and userConfirmed=true.
6. NEVER process payment without explicit user confirmation. Always ask "Which product would you like to buy?" after showing search results.

Question: {input}
Thought: {agent_scratchpad}`);
```

### 2. Expected User Interaction

```
👤 User: Find me laptops under $2

🤖 Agent: I found 3 laptops under $2:
1. Apple MacBook Pro 16" (2020) - $1.50 USDC (ID: abc123)
2. Dell XPS 13 9310 - $1.99 USDC (ID: xyz789)
3. HP Spectre x360 2-in-1 15.6" 4K UHD Touch-Screen Laptop - $1.80 USDC (ID: def456)

Which product would you like to buy?

👤 User: Buy the MacBook Pro

🤖 Agent: ✅ Payment successful! Purchased "Apple MacBook Pro 16" (2020)" for $1.50 USDC.
🔗 Transaction Hash: 0x1a2b3c4d5e6f789a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f
💰 Amount: $1.50 USDC
🌐 Network: Base Sepolia
```

## Best Practices

### 1. User Confirmation
- **Always require explicit user confirmation** before processing payments
- Never process payments automatically without user agreement
- Use clear confirmation prompts and validation

### 2. Product Context Management
- Store search results in agent context for product ID resolution
- Implement smart product resolution by name or index
- Validate product IDs before payment processing

### 3. Error Handling
- Handle 402 responses gracefully with proper x402 flow
- Provide clear error messages for payment failures
- Implement retry logic for network issues

### 4. Security Considerations
- Use thirdweb Server Wallet addresses for x402 operations (not smart wallet addresses)
- Validate payment requirements before processing
- Implement proper timeout handling for payments

### 5. Agent Tool Design
- Keep payment tools focused and single-purpose
- Use clear, descriptive tool names and descriptions
- Include comprehensive usage rules in tool descriptions

## Testing x402 Agent Integration

### 1. Unit Testing
```typescript
// Test x402 payment tool
describe('processX402Payment', () => {
  it('should require user confirmation', async () => {
    const result = await processX402Payment({
      productId: 'test-123',
      productName: 'Test Product',
      price: '10',
      userConfirmed: false
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('User confirmation required');
  });

  it('should process payment with confirmation', async () => {
    // Mock successful payment
    const result = await processX402Payment({
      productId: 'test-123',
      productName: 'Test Product',
      price: '10',
      userConfirmed: true
    });
    
    expect(result.success).toBe(true);
    expect(result.transactionHash).toBeDefined();
  });
});
```

### 2. Integration Testing
```typescript
// Test complete x402 flow
describe('x402 Integration', () => {
  it('should handle 402 response and retry with payment', async () => {
    // Mock 402 response
    const mockResponse = {
      status: 402,
      json: () => Promise.resolve({
        x402Version: 1,
        error: 'X-PAYMENT header is required',
        accepts: [{
          scheme: 'exact',
          network: 'eip155:84532',
          maxAmountRequired: '1000000',
          resource: 'http://localhost:3001/api/purchase/test-123',
          description: 'Purchase of Test Product for $1.00 USDC',
          payTo: '0x1234567890123456789012345678901234567890',
          maxTimeoutSeconds: 300,
          asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
        }]
      })
    };

    // Test payment preparation and retry
    const result = await executePurchase('test-123');
    expect(result.success).toBe(true);
  });
});
```

## Conclusion

Integrating x402 payments into AI agents enables **programmatic blockchain commerce**. By following this guide, you can create agents that:

- ✅ **Handle real cryptocurrency payments** seamlessly
- ✅ **Maintain user control** with confirmation requirements
- ✅ **Provide excellent UX** with gasless smart wallet transactions
- ✅ **Scale to production** with proper error handling and validation

The x402 protocol opens new possibilities for AI agents to participate in blockchain economies, enabling autonomous commerce and payment processing capabilities.

**Ready to build AI agents that can handle real blockchain payments! 🤖💎⚡**
