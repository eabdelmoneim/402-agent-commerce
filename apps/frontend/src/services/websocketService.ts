export interface StatusUpdate {
  type: 'searching' | 'found_products' | 'received_402' | 'preparing_payment' | 'sending_payment' | 'payment_success' | 'error' | 'processing' | 'completed';
  message: string;
  data?: any;
  timestamp: number;
}

export interface WebSocketMessage {
  type: 'status';
  agentName: string;
  status: StatusUpdate;
  timestamp: number;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private ws: WebSocket | null = null;
  private subscribers: Map<string, Set<(status: StatusUpdate) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  connect(): void {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3002';
    console.log('🔌 Attempting WebSocket connection to:', wsUrl);
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('🔌 WebSocket connected successfully to:', wsUrl);
        this.reconnectAttempts = 0;
      };
      
      this.ws.onmessage = (event) => {
        try {
          console.log('📨 WebSocket message received:', event.data);
          const message: WebSocketMessage = JSON.parse(event.data);
          if (message.type === 'status') {
            console.log('📡 Status update for agent:', message.agentName, message.status);
            this.notifySubscribers(message.agentName, message.status);
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.attemptReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  subscribe(agentName: string, callback: (status: StatusUpdate) => void): () => void {
    console.log(`📡 Frontend subscribing to agent: ${agentName}`);
    
    if (!this.subscribers.has(agentName)) {
      this.subscribers.set(agentName, new Set());
    }
    
    this.subscribers.get(agentName)!.add(callback);
    console.log(`📡 Frontend now has ${this.subscribers.get(agentName)!.size} subscribers for agent ${agentName}`);
    
    // Subscribe to agent updates on the server
    this.subscribeToAgent(agentName);
    
    // Return unsubscribe function
    return () => {
      const agentSubscribers = this.subscribers.get(agentName);
      if (agentSubscribers) {
        agentSubscribers.delete(callback);
        if (agentSubscribers.size === 0) {
          this.subscribers.delete(agentName);
        }
        console.log(`📡 Frontend unsubscribed from agent ${agentName}. Remaining: ${agentSubscribers.size}`);
      }
    };
  }

  private subscribeToAgent(agentName: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const subscribeMessage = {
        type: 'subscribe',
        agentName
      };
      console.log('📡 Subscribing to agent:', agentName, subscribeMessage);
      this.ws.send(JSON.stringify(subscribeMessage));
    } else {
      console.warn('⚠️ WebSocket not ready for subscription. State:', this.ws?.readyState);
      // Retry subscription after a short delay
      setTimeout(() => {
        console.log('🔄 Retrying subscription to agent:', agentName);
        this.subscribeToAgent(agentName);
      }, 1000);
    }
  }

  private notifySubscribers(agentName: string, status: StatusUpdate): void {
    console.log(`📡 Frontend notifying subscribers for agent ${agentName}:`, status);
    const agentSubscribers = this.subscribers.get(agentName);
    if (agentSubscribers) {
      console.log(`📡 Frontend found ${agentSubscribers.size} subscribers for agent ${agentName}`);
      agentSubscribers.forEach(callback => {
        try {
          callback(status);
        } catch (error) {
          console.error('Error notifying subscriber:', error);
        }
      });
    } else {
      console.warn(`⚠️ Frontend: No subscribers found for agent ${agentName}`);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
  }
}
