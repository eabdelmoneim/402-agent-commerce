import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { AgentManager } from './services/agentManager.js';
import { ShoppingAgent } from '../agent/ShoppingAgent.js';
import { StatusStreamer } from './services/statusStreamer.js';
import { StatusEmitter } from './services/statusEmitter.js';

// Load environment variables
dotenv.config();

const app: Application = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// WebSocket connection management
const agentConnections = new Map<string, Set<any>>();

wss.on('connection', (ws: any, _req: any) => {
  console.log('🔌 New WebSocket connection');
  
  ws.on('message', (data: any) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 WebSocket message received:', message);
      if (message.type === 'subscribe' && message.agentName) {
        // Subscribe to updates for specific agent
        if (!agentConnections.has(message.agentName)) {
          agentConnections.set(message.agentName, new Set());
        }
        agentConnections.get(message.agentName)!.add(ws);
        console.log(`📡 Agent ${message.agentName} subscribed to updates`);
        
        // Subscribe to status streamer
        const unsubscribe = statusStreamer.subscribe(message.agentName, (status) => {
          if (ws.readyState === ws.OPEN) {
            const statusMessage = {
              type: 'status',
              agentName: message.agentName,
              status,
              timestamp: Date.now()
            };
            console.log('📤 Broadcasting status update:', statusMessage);
            ws.send(JSON.stringify(statusMessage));
          } else {
            console.warn('⚠️ WebSocket not open for status broadcast. State:', ws.readyState);
          }
        });
        
        // Store unsubscribe function
        ws.unsubscribe = unsubscribe;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    // Unsubscribe from status streamer
    if (ws.unsubscribe) {
      ws.unsubscribe();
    }
    
    // Remove connection from all agent subscriptions
    for (const [agentName, connections] of agentConnections.entries()) {
      connections.delete(ws);
      if (connections.size === 0) {
        agentConnections.delete(agentName);
      }
    }
    console.log('🔌 WebSocket connection closed');
  });
});

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
let allowedOrigins: string[];

if (process.env.FRONTEND_URL) {
  // Production: Only allow the specified frontend URL
  allowedOrigins = [process.env.FRONTEND_URL];
  console.log('🔒 CORS: Production mode - only allowing:', process.env.FRONTEND_URL);
} else {
  // Development: Allow localhost variants
  allowedOrigins = [
    'http://localhost:3000',           // Local frontend development
    'http://localhost:5173',           // Vite dev server
    'https://localhost:3000',          // Local HTTPS
    'https://localhost:5173',          // Local HTTPS Vite
  ];
  console.log('🔓 CORS: Development mode - allowing localhost origins');
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-payment']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Initialize agent manager and status streamer
const agentManager = new AgentManager();
const statusStreamer = StatusStreamer.getInstance();
const statusEmitter = StatusEmitter.getInstance();

// Shopping agent session management
const agentSessions = new Map<string, ShoppingAgent>();

async function getOrCreateShoppingAgent(agentName: string): Promise<ShoppingAgent | null> {
  try {
    // Check if agent session already exists
    if (agentSessions.has(agentName)) {
      return agentSessions.get(agentName)!;
    }

    // Get agent wallet configuration
    const agentWallet = agentManager.getAgent(agentName);
    if (!agentWallet) {
      console.error(`❌ Agent wallet not found for: ${agentName}`);
      return null;
    }

    // Create new shopping agent session for this agent
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY is required for shopping agent');
      return null;
    }
    
    // Create shopping agent with agent-specific wallet
    const shoppingAgent = new ShoppingAgent(openaiApiKey, agentWallet);
    await shoppingAgent.initialize();
    
    // Store the session
    agentSessions.set(agentName, shoppingAgent);
    console.log(`✅ Created new shopping agent session for: ${agentName} with wallet: ${agentWallet.address}`);
    
    return shoppingAgent;
  } catch (error) {
    console.error(`❌ Failed to create shopping agent session for ${agentName}:`, error);
    return null;
  }
}

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'agents-api',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API info endpoint
app.get('/api', (_req, res) => {
  res.json({
    name: 'Shopping Agents API',
    version: '1.0.0',
    description: 'Agent management and chat API for shopping agents',
    endpoints: {
      agents: {
        create: 'POST /api/agents',
        get: 'GET /api/agents/:name',
        balance: 'GET /api/agents/:name/balance',
        address: 'GET /api/agents/:name/address',
        chat: 'POST /api/agents/:name/chat'
      },
      utility: {
        health: 'GET /health',
        info: 'GET /api'
      }
    }
  });
});

// Create a new agent
app.post('/api/agents', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Agent name is required and must be a non-empty string' 
      });
    }

    const agent = await agentManager.createAgent(name.trim());
    
    return res.json({
      success: true,
      agent: {
        id: agent.identifier,
        name: name.trim(),
        walletAddress: agent.address,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Error creating agent:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create agent'
    });
  }
});

// Get agent by name
app.get('/api/agents/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const agent = agentManager.getAgent(name);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    return res.json({
      success: true,
      agent: {
        id: agent.identifier,
        name: name,
        walletAddress: agent.address,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Error getting agent:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get agent'
    });
  }
});

// Get agent balance
app.get('/api/agents/:name/balance', async (req, res) => {
  try {
    const { name } = req.params;
    const balance = await agentManager.getAgentBalance(name);
    
    return res.json({
      success: true,
      balance: balance.balance,
      currency: balance.currency
    });
  } catch (error: any) {
    console.error('Error getting agent balance:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get agent balance'
    });
  }
});

// Get agent wallet address
app.get('/api/agents/:name/address', async (req, res) => {
  try {
    const { name } = req.params;
    const agent = agentManager.getAgent(name);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    return res.json({
      success: true,
      address: agent.address
    });
  } catch (error: any) {
    console.error('Error getting agent address:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get agent address'
    });
  }
});


// Chat with agent
app.post('/api/agents/:name/chat', async (req, res) => {
  try {
    const { name } = req.params;
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const agent = agentManager.getAgent(name);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    // Get or create shopping agent session for this specific agent
    const shoppingAgent = await getOrCreateShoppingAgent(name);
    if (!shoppingAgent) {
      return res.status(500).json({
        success: false,
        error: 'Failed to initialize shopping agent session. Please check server logs.'
      });
    }

    console.log(`🤖 Processing message for agent ${name}: "${message}"`);
    
    // Set up console capture for this agent
    statusEmitter.setupConsoleCapture(name);
    
    // Broadcast initial status
    statusStreamer.processing(name, 'Agent is thinking...');
    
    try {
      // Process the message through the agent-specific shopping agent
      const response = await shoppingAgent.processRequest(message);
      
      console.log(`🤖 Agent ${name} response: ${response}`);
      
      // Broadcast completion status
      statusStreamer.completed(name, 'Response ready');
      
      return res.json({
        success: true,
        response: response,
        status: [] // Status updates are now streamed via WebSocket
      });
    } finally {
      // Restore console (optional, as it's a singleton)
      // statusEmitter.restoreConsole();
    }
  } catch (error: any) {
    console.error('Error processing chat:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process chat'
    });
  }
});

// Clear agent session (for testing/debugging)
app.delete('/api/agents/:name/session', async (req, res) => {
  try {
    const { name } = req.params;
    
    if (agentSessions.has(name)) {
      agentSessions.delete(name);
      console.log(`🗑️ Cleared shopping agent session for: ${name}`);
      return res.json({
        success: true,
        message: `Session cleared for agent ${name}`
      });
    } else {
      return res.status(404).json({
        success: false,
        error: 'Agent session not found'
      });
    }
  } catch (error: any) {
    console.error('Error clearing agent session:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to clear agent session'
    });
  }
});

// Get active agent sessions (for debugging)
app.get('/api/agents/sessions', (_req, res) => {
  try {
    const sessions = Array.from(agentSessions.keys());
    return res.json({
      success: true,
      activeSessions: sessions,
      count: sessions.length
    });
  } catch (error: any) {
    console.error('Error getting agent sessions:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get agent sessions'
    });
  }
});

// Proxy: Get transaction details by ID (secure, uses secret key)
app.get('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const thirdwebSecretKey = process.env.THIRDWEB_SECRET_KEY;
    const thirdwebApiUrl = process.env.THIRDWEB_API_URL || 'https://api.thirdweb.com/v1';

    if (!thirdwebSecretKey) {
      return res.status(500).json({ success: false, error: 'Server not configured for transaction lookup' });
    }

    const resp = await fetch(`${thirdwebApiUrl}/transactions/${id}`, {
      method: 'GET',
      headers: { 'x-secret-key': thirdwebSecretKey }
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ success: false, error: text });
    }

    const data = await resp.json();
    return res.json({ success: true, result: data.result });
  } catch (error: any) {
    console.error('Error fetching transaction by id:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch transaction' });
  }
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler - must be last
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    availableEndpoints: [
      'GET /health',
      'GET /api',
      'POST /api/agents',
      'GET /api/agents/:name',
      'GET /api/agents/:name/balance',
      'GET /api/agents/:name/address',
      'POST /api/agents/:name/chat'
    ]
  });
});

// Start server
const PORT = process.env.PORT || process.env.AGENTS_API_PORT || 3002;
server.listen(PORT, () => {
  console.log(`🚀 Agents API server running on port ${PORT}`);
  console.log(`📡 WebSocket server running on ws://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/api`);
});

export default app;
