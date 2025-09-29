# Shopping Agent Setup Guide

This guide will help you set up and run the **ReAct Shopping Agent with x402 Payment Integration** using LangChain and thirdweb's official x402 SDK with thirdweb Server Wallets.

## Prerequisites

- **Node.js 18+**: Download from [nodejs.org](https://nodejs.org/)
- **pnpm 8+**: Install with `npm install -g pnpm`
- **OpenAI API Key**: Get from [platform.openai.com](https://platform.openai.com/)
- **thirdweb Secret Key**: Get from [thirdweb.com dashboard](https://thirdweb.com/)

## Quick Setup

### 1. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install
```

### 2. Configure Environment Variables

#### Server Environment (`apps/merchant/.env`)
```bash
cp apps/merchant/env.example apps/merchant/.env
```

Edit `apps/merchant/.env`:
```bash
PORT=3001
NODE_ENV=development

# OpenAI API Key for AI product generation
OPENAI_API_KEY=sk-your_openai_key_here

# thirdweb Configuration for x402 payments
THIRDWEB_SECRET_KEY=your_thirdweb_secret_key_here
THIRDWEB_API_URL=https://api.thirdweb.com/v1

# Merchant thirdweb Server Wallet Configuration
MERCHANT_WALLET_IDENTIFIER=merchant-sw

# Blockchain Configuration (Base Sepolia)
NETWORK=base-sepolia
USDC_CONTRACT_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
BASE_URL=http://localhost:3001
```

#### Client Environment (`apps/shopping-agent/.env`)
```bash
cp apps/shopping-agent/env.example apps/shopping-agent/.env
```

Edit `apps/shopping-agent/.env`:
```bash
API_BASE_URL=http://localhost:3001/api

# OpenAI API Key for LangChain ReAct reasoning
OPENAI_API_KEY=sk-your_openai_key_here

# thirdweb Configuration for smart wallet and payments
THIRDWEB_SECRET_KEY=your_thirdweb_secret_key_here
THIRDWEB_API_URL=https://api.thirdweb.com/v1

# Client thirdweb Server Wallet Configuration
CLIENT_WALLET_IDENTIFIER=client-sw

# Blockchain Configuration (Base Sepolia)
NETWORK=base-sepolia
USDC_CONTRACT=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

### 3. Start the Application

#### Option A: Start Both (Recommended)
```bash
pnpm dev
```

#### Option B: Start Individually
```bash
# Terminal 1: Start the server
pnpm dev:server

# Terminal 2: Start the client
pnpm dev:client
```

## Usage Examples

### 1. Test Server API

```bash
# Health check
curl http://localhost:3001/health

# API documentation
curl http://localhost:3001/api

# Search for TVs under $5
curl "http://localhost:3001/api/products?query=TV&maxPrice=5"

# Search for laptops
curl "http://localhost:3001/api/products?query=laptop&count=3"

# Get specific product details
curl "http://localhost:3001/api/products/prod_123"
```

### 2. Interact with LangChain Shopping Agent

Once the client starts, you can use natural language requests:

```
🛍️ Welcome to the ReAct Shopping Agent!

🔑 Wallet Information:
   Wallet Address: 0x84d09F004c1a139f326C1B25bF2d72c2166F40C8
   Role: client_agent

👤 You: Find me a TV under $5

🤖 Agent: I found 3 TVs within your $5 budget:

**1. Samsung 32" Smart TV** - $4.20 USDC
   Experience stunning 4K clarity with this Samsung Smart TV featuring advanced HDR technology and smart platform integration.
   Features: 4K Ultra HD, Smart TV Platform, HDR10+, Voice Remote

**2. LG 28" LED TV** - $3.80 USDC
   Compact LED TV perfect for bedrooms with crisp picture quality and energy-efficient design.
   Features: Full HD 1080p, LED Display, Multiple HDMI Ports, Energy Efficient

**3. TCL 24" TV** - $2.90 USDC
   Budget-friendly TV with reliable performance and clear audio for everyday viewing.
   Features: HD Ready, Built-in Speakers, HDMI & USB Ports, Compact Design

Which one would you like to purchase?
```

```
👤 You: I'll take the Samsung TV

🤖 Agent: Excellent choice! I'll process the purchase of the Samsung 32" Smart TV for $4.20 USDC.

💳 Processing x402 payment...
🔑 Preparing x402 payment signature...
💸 Retrying purchase with payment header...

✅ Payment successful! Purchased "Samsung 32" Smart TV" for $4.20 USDC.
🔗 Transaction Hash: 0x1a2b3c4d5e6f789a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f
💰 Amount: $4.20 USDC
🌐 Network: Base Sepolia

The transaction has been confirmed on the blockchain. Your smart TV purchase is complete!
```

### 3. Available Commands

- `quit` or `exit` - Exit the application
- `clear` - Clear conversation history
- `help` - Show help and examples

## Architecture Overview

```
┌─────────────────────────┐    HTTP/REST API    ┌─────────────────────────┐
│   ReAct Shopping Agent │ ───────────────────► │  Node Express Backend  │
│   (LangChain + AI)      │                     │  (Store API + x402)     │
│                         │                     │                         │
│ • LangChain ReAct Agent │                     │ • AI Product Generation │
│ • thirdweb Server Wallet Tools      │                     │ • thirdweb x402 SDK     │
│ • Global Wallet Service │                     │ • thirdweb Server Wallet Merchant   │
└─────────────────────────┘                     └─────────────────────────┘
```

## Key Features

### LangChain ReAct Shopping Agent (Client)
- **LangChain Integration**: Uses `createReactAgent` for professional ReAct implementation
- **OpenAI GPT-4o**: Advanced reasoning and natural language understanding
- **thirdweb Server Wallet Management**: Real blockchain transactions with thirdweb thirdweb Server Wallets
- **Dynamic Tools**: Extensible tool system for products and payments
- **Global Services**: Clean architecture with global wallet service

### Express Store API (Server)
- **AI Product Generation**: OpenAI-powered dynamic product catalog
- **thirdweb x402 SDK**: Official x402 facilitator and settlePayment integration
- **thirdweb Server Wallet Merchant**: Receives real USDC payments on Base Sepolia
- **Clean REST APIs**: Simplified endpoints for products and purchases

### Real x402 Payment Flow
1. **Product Discovery**: Agent searches catalog using natural language
2. **Purchase Intent**: User confirms purchase selection
3. **Payment Requirements**: Server generates x402 requirements automatically
4. **Payment Preparation**: Client thirdweb Server Wallet prepares signed x402 payment
5. **Blockchain Settlement**: thirdweb `settlePayment` processes real USDC transfer
6. **Confirmation**: Transaction hash and details returned to user

## Development Commands

```bash
# Build all workspaces
pnpm build

# Type check without building
pnpm --filter client typecheck
pnpm --filter server typecheck

# Clean build outputs
pnpm clean

# Add dependencies to specific workspace
pnpm --filter client add <package>
pnpm --filter server add <package>

# Remove dependencies
pnpm --filter client remove <package>
pnpm --filter server remove <package>

# Run specific workspace scripts
pnpm --filter client dev
pnpm --filter server dev
```

## Troubleshooting

### Common Issues

1. **"Backend server is not available"**
   - Ensure server is running on port 3001
   - Check server environment variables are configured
   - Verify: `curl http://localhost:3001/health`

2. **"Missing required environment variables"**
   - Copy `env.example` files to `.env` in both apps
   - Add your OpenAI and thirdweb API keys
   - Ensure all required variables are set

3. **"Failed to create wallet" or wallet errors**
   - Verify your thirdweb secret key is correct and active
   - Check network connectivity to thirdweb API
   - Ensure unique wallet identifiers (client-sw, merchant-sw)

4. **OpenAI API Errors**
   - Verify your OpenAI API key has available credits
   - Check rate limits haven't been exceeded
   - Ensure API key has proper permissions

5. **LangChain Agent Issues**
   - Check OpenAI API key is working for GPT-4 access
   - Verify tool definitions are properly loaded
   - Review agent conversation history for context issues

6. **x402 Payment Failures**
   - Ensure thirdweb secret key is valid
   - Check Base Sepolia network connectivity
   - Verify USDC contract address is correct
   - Confirm smart wallets are properly initialized

### Debug Tips

```bash
# Check server health and configuration
curl http://localhost:3001/health

# Test product API directly
curl "http://localhost:3001/api/products?query=test"

# Verify environment variables are loaded
# (Look for console output during startup)

# Check TypeScript compilation
pnpm --filter client typecheck
pnpm --filter server typecheck
```

### Environment Variable Checklist

**Required for Server:**
- ✅ `OPENAI_API_KEY` - For product generation
- ✅ `THIRDWEB_SECRET_KEY` - For merchant thirdweb Server Wallet and x402
- ✅ `MERCHANT_WALLET_IDENTIFIER` - Unique identifier for merchant thirdweb Server Wallet
- ✅ `USDC_CONTRACT_ADDRESS` - Base Sepolia USDC contract

**Required for Client:**
- ✅ `OPENAI_API_KEY` - For LangChain reasoning
- ✅ `THIRDWEB_SECRET_KEY` - For client thirdweb Server Wallet and payments
- ✅ `CLIENT_WALLET_IDENTIFIER` - Unique identifier for client thirdweb Server Wallet
- ✅ `API_BASE_URL` - Server API endpoint

## Getting Help

- Review the [main README](./README.md) for feature details
- Check [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) for architecture overview
- Examine [THIRDWEB_X402_INTEGRATION.md](./THIRDWEB_X402_INTEGRATION.md) for payment details
- Test individual components using development commands above

## Next Steps

1. **Customize Products**: Modify prompts in `apps/merchant/src/services/productGenerator.ts`
2. **Extend Agent Tools**: Add new LangChain tools in `apps/shopping-agent/src/agent/tools.ts`  
3. **Enhanced UI**: Build a web interface for the shopping agent
4. **Production Deploy**: Configure for mainnet with real USDC
5. **A2A Integration**: Transition to agent-to-agent communication (Phase 2)

## Test Wallet Addresses

Your smart wallet addresses will be displayed on startup:

```
🔑 Wallet Information:
   Wallet Address: 0x84d09F004c1a139f326C1B25bF2d72c2166F40C8
   Role: client_agent
```

These are **thirdweb Server Wallet addresses** created and managed by thirdweb, providing:
- ⚡ **Real blockchain transactions** for authentic payment processing
- 🔐 **Direct wallet control** with EOA address management
- 💰 **Transparent gas handling** with proper transaction fees
- 🛡️ **Standard security** with proven wallet patterns

**Happy shopping with AI and blockchain! 🤖💎⚡**