# Shopping Agent with x402 Payment Integration

A modern monorepo showcasing a **ReAct (Reasoning and Acting) AI shopping agent** built with **LangChain** that interacts with a Node.js Express backend store API supporting **x402 payments**. This project demonstrates the integration of AI-powered reasoning with real blockchain transactions using **thirdweb's x402 SDK**.

## Architecture

```
┌─────────────────────────┐    HTTP/REST API    ┌─────────────────────────┐
│   ReAct Shopping Agent  │                     │  Node Express Backend   │
│   (LangChain + AI)      │─── get products ──► │   (Merchant API)        │
│                         │                     │                         │
│ • LangChain ReAct Agent │─ purchase(product)─►│ • Product Search API    │
│ • Agent Wallet          │                     │ • Purchase API (x402)   │
│ • Tools:                |◄─ 402 payment req. ─| • Merchant Wallet       | 
|   - Get Products.       |                     |                         |
|   - x402 Payment Handler│─ purchase(product)─►│                         │
│                         │ w/ x-payment header │                         │
└─────────────────────────┘                     |                         |
              |                                 |                         |
HTTP/REST API |                                 |                         |
              |                                 |                         | 
              ▼                                 |                         |
┌─────────────────────────┐                     |                         | 
|     thirdweb API        |                     |                         |
|                         |─ purchase(product)─►|                         |
| • create Agent Wallet   |                     |                         |
| • fetch w/ x402 payment |◄─ 402 payment req. ─|                         |
| • get balance, tx's.    |                     |                         |
|                         |─ purchase(product)─►│                         │
│                         │ w/ x-payment header |                         |
└─────────────────────────┘                     └─────────────────────────┘
```
## 📚 x402 Details and Documentation

- **[docs/THIRDWEB_X402_INTEGRATION.md](./docs/THIRDWEB_X402_INTEGRATION.md)** - Client/server x402 implementation details

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- OpenAI API key
- thirdweb Secret Key

### Installation

```bash
# Install all dependencies
pnpm install

# Copy environment files
cp apps/merchant/env.example apps/merchant/.env
cp apps/shopping-agent/env.example apps/shopping-agent/.env
cp apps/frontend/env.example apps/frontend/.env

# Add your API keys to the .env files
```

### Configuration

#### Server Environment (`apps/merchant/.env`)
```bash
PORT=3001
OPENAI_API_KEY=your_openai_key
THIRDWEB_SECRET_KEY=your_thirdweb_secret_key
THIRDWEB_API_URL=https://api.thirdweb.com/v1
MERCHANT_WALLET_IDENTIFIER=merchant-sw
USDC_CONTRACT_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
NETWORK=base-sepolia
BASE_URL=http://localhost:3001
```

#### Client Environment (`apps/shopping-agent/.env`)
```bash
API_BASE_URL=http://localhost:3001/api
OPENAI_API_KEY=your_openai_api_key
THIRDWEB_SECRET_KEY=your_thirdweb_secret_key
THIRDWEB_API_URL=https://api.thirdweb.com/v1
CLI_AGENT_WALLET_IDENTIFIER=cli-agent-sw
NETWORK=base-sepolia
USDC_CONTRACT=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

#### Frontend Environment (`apps/frontend/.env`)
```bash
VITE_AGENTS_API_URL=http://localhost:3002/api
VITE_WS_URL=ws://localhost:3002
VITE_FAUCET_URL=https://faucet.circle.com/
VITE_NETWORK=base-sepolia
VITE_USDC_CONTRACT=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

#### Shopping Agent Environment (`apps/shopping-agent/.env`)
```bash
# ... existing config ...
# Agents API Configuration
AGENTS_API_PORT=3002
MERCHANT_API_URL=http://localhost:3001/api
NODE_ENV=development
```

### Development

```bash
# Start all services (agent, merchant, frontend)
pnpm dev

# Start individual services
pnpm dev:server      # Merchant API only (port 3001)
pnpm dev:agents-api  # Agents API only (port 3002)
pnpm dev:cli         # Shopping agent CLI only
pnpm dev:frontend    # Web frontend only (port 3000)
```

### Usage

1. **Start the development environment**:
   ```bash
   pnpm dev
   ```

2. **Access the web demo**:
   - Open http://localhost:3000 in your browser
   - Create a shopping agent with a custom name
   - Fund the agent using the Circle USDC faucet
   - Chat with your agent to experience x402 payments

3. **API Endpoints**:
   - **Agents API**: http://localhost:3002/api (agent management and chat - uses merchant API internally)
   - **Merchant API**: http://localhost:3001/api (internal - used by agents API)
   - **Frontend**: http://localhost:3000 (web demo - only talks to agents API)

4. **Test the APIs directly**:
   ```bash
   # Test agents API
   curl "http://localhost:3002/api/agents" -X POST -H "Content-Type: application/json" -d '{"name":"TestAgent"}'
   
   # Test merchant API directly (internal)
   curl "http://localhost:3001/api/products?query=TV&maxPrice=5"
   ```

4. **Use the CLI shopping agent**:
   The shopping agent will start an interactive session where you can make natural language requests:
   - "I want to buy a TV under $5"
   - "Show me laptops with good reviews"  
   - "Purchase the Samsung TV"

## API Endpoints

### Products API
- `GET /api/products?query=TV&maxPrice=5` - Search products with smart filtering
- `GET /api/products/:productId` - Get specific product details

### Purchase API
- `POST /api/purchase/:productId` - Execute purchase (supports x402 payment protocol)

### Utility
- `GET /health` - Health check endpoint
- `GET /api` - API documentation endpoint

## Technology Stack

- **Runtime**: Node.js 18+ with ES Modules
- **Package Manager**: pnpm with workspaces  
- **Language**: TypeScript with strict typing
- **Agent Framework**: LangChain with `createReactAgent` for ReAct pattern
- **Backend**: Express.js with security middleware
- **AI Integration**: OpenAI GPT-4.1 API
- **Payments**: thirdweb SDK v5 with official x402 facilitator and settlePayment
- **Blockchain**: Base Sepolia testnet with thirdweb Server Wallet integration
- **Currency**: USDC (real transfers)

## Development Commands

```bash
# Workspace management
pnpm --filter client add <package>    # Add dependency to client
pnpm --filter server add <package>    # Add dependency to server
pnpm build                           # Build all workspaces
pnpm clean                           # Clean all build outputs

# Individual workspace commands
pnpm --filter client dev             # Start client in dev mode
pnpm --filter server dev             # Start server in dev mode
pnpm --filter client build           # Build client
pnpm --filter server build           # Build server
pnpm --filter client typecheck       # Type check client
pnpm --filter server typecheck       # Type check server
```

## License

MIT License - see LICENSE file for details

---

**Ready for real blockchain commerce with AI-powered shopping! 🤖💎⚡**