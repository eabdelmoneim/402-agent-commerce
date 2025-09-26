# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Workspace Management
```bash
# Install all dependencies (use this for setup)
pnpm install

# Start both client and server in development
pnpm dev

# Start components individually
pnpm dev:client    # LangChain ReAct shopping agent
pnpm dev:server    # Express API with x402 payments

# Build all workspaces
pnpm build

# Type checking
pnpm --filter client typecheck
pnpm --filter server typecheck

# Clean build outputs
pnpm clean
```

### Testing Commands
```bash
# Run tests for specific workspace
pnpm --filter client test
pnpm --filter server test

# Server API health check
curl http://localhost:3001/health

# Test product search API
curl "http://localhost:3001/api/products?query=TV&maxPrice=5"
```

## Project Architecture

### Monorepo Structure
- **`apps/client/`**: LangChain ReAct shopping agent using GPT-4o and thirdweb smart wallets
- **`apps/server/`**: Express.js API with AI-generated products and real x402 blockchain payments
- **`packages/shared-types/`**: Shared TypeScript types between client and server

### Key Architecture Patterns

1. **LangChain ReAct Agent** (`apps/client/src/agent/ShoppingAgent.ts`)
   - Uses `createReactAgent` with `DynamicTool` wrappers
   - Tools: `get_products` for search, `process_payment` for x402 transactions
   - GPT-4o for natural language reasoning and action planning

2. **Global Wallet Service** (`apps/client/src/services/globalWallet.ts`)
   - Global `clientWalletService` instance to avoid parameter passing
   - Smart wallet creation and management via thirdweb API
   - Must be initialized before agent tools can function

3. **Real x402 Payments** (`apps/server/src/services/thirdwebX402Service.ts`)
   - Uses official thirdweb SDK `facilitator` and `settlePayment`
   - Processes actual USDC transactions on Base Sepolia
   - Smart wallet architecture for gasless transactions

### Payment Flow Architecture
```
1. Client ReAct agent searches products
2. User confirms purchase via natural language
3. Client POSTs to /api/purchase/:productId
4. Server responds with 402 + x402 requirements
5. Client prepares payment via thirdweb API
6. Client retries with x-payment header
7. Server calls thirdweb settlePayment() for blockchain execution
8. Real USDC transfer occurs, transaction hash returned
```

## Environment Configuration

Both client and server require these key environment variables:
- `OPENAI_API_KEY`: For GPT-4o reasoning and AI product generation
- `THIRDWEB_SECRET_KEY`: For smart wallet creation and x402 payments
- Client needs `CLIENT_WALLET_IDENTIFIER`, server needs `MERCHANT_WALLET_IDENTIFIER`
- `USDC_CONTRACT_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Base Sepolia)

Copy from `apps/client/env.example` and `apps/server/env.example` to respective `.env` files.

## Key Implementation Details

### Smart Wallet Exclusive Design
- Both client and server use **smart wallet addresses only**
- All payment flows use `smartWalletAddress` property
- No EOA addresses to avoid confusion
- Gasless transactions for better UX

### LangChain Tool Integration
```typescript
// apps/client/src/agent/tools.ts
export function getAgentTools(): DynamicTool[] {
  return [
    new DynamicTool({
      name: "get_products",
      description: "Search for products in the catalog",
      func: async (input) => {
        // Uses global clientWalletService
        return await getProducts(JSON.parse(input));
      },
    }),
    // ... other tools
  ];
}
```

### Type Safety
- Strict TypeScript configuration across all workspaces
- Custom type declarations in `apps/server/src/types/thirdweb.d.ts` for thirdweb modules
- Shared types in `packages/shared-types/` for cross-workspace consistency

## Common Development Tasks

### Adding New Agent Tools
1. Create tool function in `apps/client/src/tools/`
2. Add `DynamicTool` wrapper in `apps/client/src/agent/tools.ts`
3. Update tool description for LangChain prompt context

### Extending Product Catalog
- Modify prompts in `apps/server/src/services/productGenerator.ts`
- Product generation uses OpenAI to create realistic catalog data

### Testing Payment Integration
1. Ensure both client and server have valid thirdweb secret keys
2. Fund smart wallets with test USDC on Base Sepolia
3. Use natural language with client: "Buy a TV under $5"
4. Verify transaction hash on Base Sepolia explorer

### Debugging Common Issues
- **"Backend server is not available"**: Check server running on port 3001
- **Wallet creation failures**: Verify thirdweb secret key and network connectivity
- **LangChain agent errors**: Check OpenAI API key has GPT-4 access
- **Payment failures**: Ensure USDC contract address and Base Sepolia network configuration

## Technology Stack

- **Runtime**: Node.js 18+ with ES Modules
- **Package Manager**: pnpm workspaces
- **Language**: TypeScript with strict mode
- **Agent Framework**: LangChain with `createReactAgent`
- **Backend**: Express.js with security middleware
- **AI**: OpenAI GPT-4o API
- **Blockchain**: thirdweb SDK v5, Base Sepolia, smart wallets
- **Payments**: Real x402 protocol with USDC transfers