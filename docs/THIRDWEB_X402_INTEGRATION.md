# Thirdweb x402 Integration - Complete Implementation Details

## ✅ **Production-Ready thirdweb x402 SDK Integration**

Successfully implemented **complete x402 payment integration** using thirdweb's official SDK, providing real blockchain transaction processing with thirdweb Server Wallets on Base Sepolia network.

## ■■ **thirdweb x402 Developer Docs**
[Link](https://portal.thirdweb.com/payments/x402)

## 🤖 **Client-Side: AI Agent with thirdweb Server Wallet & x402 Tool**

### Overview
The client-side implementation focuses on **AI agent wallet management** and **payment preparation** using thirdweb's APIs. The agent uses a thirdweb Server Wallet for all x402 payment operations.

In this template, the AI agent uses a dedicated **thirdweb x402 tool** that fully handles the 402 protocol end‑to‑end: tool uses single thirdweb api that detects `402 Payment Required`, prepares the x402 payment , and retries the request with the `x-payment` header.

### Key Components

#### 1. **thirdweb Server Wallet for Agent**
Each shopping AI agent has a server wallet identified by the agent name

```typescript
// apps/shopping-agent/src/services/agentWalletService.ts
    // Create thirdweb Server Wallet via thirdweb API
    const response = await fetch(`${thirdwebApiUrl}/wallets/server`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-secret-key': thirdwebSecretKey
      },
      body: JSON.stringify({
        identifier: "<agent_name>"
      })
    });
```

#### 2. **thirdweb API for fetching with x402 Payment **
When the agent receives a 402 status back from the merchant API it calls the prepare method in the thirdweb api to create the signed payment header to be sent back to the merchant API.

```typescript
// apiClient.ts
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
```

### Client-Side Flow
1. **Wallet Initialization**: Agent creates thirdweb Server Wallet via thirdweb API
2. **Product Search**: Agent searches for products using natural language
3. **Fetch with x402 Payment**: Agent uses x402/fetch via thirdweb API to handle x402
4. **If wallet needs funding**: thirdweb api responds with `402` with link to fund wallet 

---

## 🏪 **Server-Side: x402 API Endpoint with settlePayment**

### Overview
The server-side implementation focuses on **x402 payment processing** using thirdweb's `settlePayment` SDK. The server acts as a payment facilitator using a merchant thirdweb Server Wallet.

### Key Components

#### 1. **Merchant Wallet (x402 Facilitator)**
Merchant creates a server wallet on the thirdweb Dashboard which will be used to gaslessly facilitate x402 payment transfers from purchasors.

#### 2. **Wrapping Merchant Purchase API with thirdweb x402 Service**
In the purchase API endpoint implementation the `settlePayment` typescript function is used to check the request for required payment.  if payment is not provided it returns a `402` status otherwise if present the request will be passed to facilitator merchant wallet to settle the transfer.

```typescript
// apps/merchant/src/services/thirdwebX402Service.ts

    // Connect x402 facilitator with merchant thirdweb Server Wallet
    this.thirdwebFacilitator = facilitator({
      client: this.client,
      serverWalletAddress: config.walletConfig.address as `0x${string}`, // Merchant wallet
    });
  }

    // Use thirdweb's settlePayment for real blockchain transactions
    const result = await settlePayment({
        resourceUrl,
        method: method.toUpperCase(),
        paymentData,
        payTo: this.config.walletConfig.address as `0x${string}`, // Merchant receives payment
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
            merchantName: 'Shopping Agent Store'
          }
        },
        facilitator: this.thirdwebFacilitator,
      });
```

### Server-Side Flow
1. **Merchant Wallet Setup**: Server creates merchant thirdweb Server Wallet
2. **x402 Facilitator**: Initialize thirdweb facilitator with merchant wallet
3. **Purchase Request**: Receive purchase request with optional `x-payment` header
4. **Payment Settlement**: Use `settlePayment` to process real blockchain transaction
5. **Response**: Return success with transaction hash or 402 with payment requirements
