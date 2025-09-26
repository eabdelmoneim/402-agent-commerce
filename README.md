# Shopping Agent with x402 Payment Integration

A modern monorepo showcasing a **ReAct (Reasoning and Acting) AI shopping agent** built with **LangChain** that interacts with a Node.js Express backend store API supporting **x402 payments**. This project demonstrates the integration of AI-powered reasoning with real blockchain transactions using **thirdweb's x402 SDK**.

## 📚 Documentation

- **[docs/SETUP.md](./docs/SETUP.md)** - Complete setup guide with environment configuration and troubleshooting
- **[docs/PROJECT_SUMMARY.md](./docs/PROJECT_SUMMARY.md)** - Comprehensive project overview and architecture details
- **[docs/THIRDWEB_X402_INTEGRATION.md](./docs/THIRDWEB_X402_INTEGRATION.md)** - Client/server x402 implementation details
- **[docs/AGENT_X402_INTEGRATION.md](./docs/AGENT_X402_INTEGRATION.md)** - Guide for integrating x402 payments into AI agents

## Architecture

```
┌─────────────────────────┐    HTTP/REST API    ┌─────────────────────────┐
│   ReAct Shopping Agent │ ───────────────────► │  Node Express Backend  │
│   (LangChain + AI)      │                     │  (Store API)            │
│                         │                     │                         │
│ • LangChain ReAct Agent │                     │ • Product Search API    │
│ • thirdweb Server Wallet Tools      │                     │ • x402 Purchase API     │
│ • x402 Payment Handler  │                     │ • thirdweb Integration  │
└─────────────────────────┘                     └─────────────────────────┘
```

## Project Structure

```
shopping-agent-x402/
├── package.json                 # Root workspace configuration
├── pnpm-workspace.yaml          # pnpm workspace configuration
├── README.md
├── .gitignore
├── docs/                        # Documentation
│   ├── SETUP.md                 # Detailed setup guide
│   ├── PROJECT_SUMMARY.md       # Complete project overview
│   ├── THIRDWEB_X402_INTEGRATION.md # x402 implementation details
│   └── AGENT_X402_INTEGRATION.md # Agent integration guide
├── apps/
│   ├── shopping-agent/          # ReAct AI Shopping Agent (LangChain) + Agents API
│   ├── merchant/                # Node Express Store API (thirdweb x402)
│   └── frontend/                # React Web Demo (x402 Protocol Showcase)
└── packages/                    # Shared packages (future A2A integration)
    └── shared-types/
```

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

## Features

### ReAct AI Shopping Agent (Client)
- **LangChain ReAct Agent**: Professional-grade ReAct implementation using `createReactAgent`
- **OpenAI Integration**: Uses GPT-4o for natural language understanding and reasoning
- **Dynamic Agent Tools**: 
  - `get_products`: Search product catalog with smart filtering
  - `process_payment`: Handle x402 cryptocurrency payments with real blockchain transactions
- **thirdweb Server Wallet**: Manages buyer thirdweb Server Wallet for x402 transactions
- **Global Service Architecture**: Clean, maintainable codebase with global wallet service

### Express Store API (Server)
- **AI Product Generation**: Uses OpenAI to generate realistic product catalogs
- **thirdweb x402 Integration**: Real blockchain payment processing using official thirdweb SDK
- **thirdweb Server Wallet Facilitator**: Manages merchant thirdweb Server Wallet for receiving payments
- **Simplified RESTful APIs**: Clean API design focused on products and purchases

### x402 Payment Flow
1. Client requests product information and identifies desired purchase
2. Client attempts purchase via `POST /api/purchase/:productId`
3. Server responds with 402 status and x402 requirements if payment needed
4. Client prepares x402 payment using thirdweb API with thirdweb Server Wallet
5. Client retries purchase with `x-payment` header containing signed payment
6. Server uses thirdweb's `settlePayment` for real blockchain transaction
7. **Actual USDC transfer occurs on Base Sepolia network**
8. Transaction hash returned for verification

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
- **AI Integration**: OpenAI GPT-4o API
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

## Key Improvements from v1

### ✅ LangChain Integration
- Replaced custom ReAct implementation with production-ready LangChain `createReactAgent`
- Professional prompt engineering and tool integration
- Better conversation management and error handling

### ✅ thirdweb Server Wallet Architecture  
- **thirdweb Server Wallet addresses used exclusively** for all x402 operations
- Real blockchain transactions with proper gas handling
- Clear separation between smart wallets and thirdweb Server Wallet addresses

### ✅ thirdweb x402 SDK
- Real blockchain transactions using official thirdweb `settlePayment`
- Production-ready payment facilitation with `facilitator`
- Actual USDC transfers on Base Sepolia network

### ✅ Simplified API Design
- Removed unnecessary endpoints to focus on core functionality
- Single purchase endpoint with built-in x402 flow
- Clean separation of concerns

### ✅ Global Service Architecture
- Global wallet service eliminates parameter passing
- Cleaner, more maintainable codebase
- Simplified tool implementations

## Example Interaction

```
🛍️ Welcome to the ReAct Shopping Agent!

🔑 Wallet Information:
   Wallet Address: 0x84d09F004c1a139f326C1B25bF2d72c2166F40C8
   Role: client_agent

👤 You: Find me a TV under $5

🤖 Agent: I found 3 TVs within your $5 budget:

**1. Samsung 32" Smart TV** - $4.20 USDC
   Experience stunning 4K clarity with this Samsung Smart TV...
   Features: 4K Ultra HD, Smart TV Platform, HDR10+, Voice Remote

**2. LG 28" LED TV** - $3.80 USDC  
   Compact LED TV perfect for bedrooms with crisp picture quality...
   Features: Full HD 1080p, LED Display, Multiple HDMI Ports

**3. TCL 24" TV** - $2.90 USDC
   Budget-friendly TV with reliable performance and clear audio...
   Features: HD Ready, Built-in Speakers, HDMI & USB Ports

Which one would you like to purchase?

👤 You: I'll take the Samsung TV

🤖 Agent: ✅ Payment successful! Purchased "Samsung 32" Smart TV" for $4.20 USDC.
🔗 Transaction Hash: 0x1a2b3c4d5e6f789a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f
💰 Amount: $4.20 USDC  
🌐 Network: Base Sepolia
```

## Future Enhancements (Phase 2)

- Convert backend to A2A merchant agent
- Implement A2A protocol communication  
- Agent-to-agent payment negotiation
- Multi-agent marketplace
- Enhanced product search capabilities
- Web interface for the shopping agent

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

---

**Ready for real blockchain commerce with AI-powered shopping! 🤖💎⚡**