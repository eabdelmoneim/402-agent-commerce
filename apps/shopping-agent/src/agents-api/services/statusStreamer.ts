export interface StatusUpdate {
  type: 'searching' | 'found_products' | 'received_402' | 'preparing_payment' | 'sending_payment' | 'payment_success' | 'error' | 'processing' | 'completed';
  message: string;
  data?: any;
  timestamp: number;
}

export class StatusStreamer {
  private static instance: StatusStreamer;
  private subscribers: Map<string, Set<(status: StatusUpdate) => void>> = new Map();

  static getInstance(): StatusStreamer {
    if (!StatusStreamer.instance) {
      StatusStreamer.instance = new StatusStreamer();
    }
    return StatusStreamer.instance;
  }

  subscribe(agentName: string, callback: (status: StatusUpdate) => void): () => void {
    if (!this.subscribers.has(agentName)) {
      this.subscribers.set(agentName, new Set());
    }
    
    this.subscribers.get(agentName)!.add(callback);
    console.log(`📡 Subscribed to status updates for agent ${agentName}. Total subscribers: ${this.subscribers.get(agentName)!.size}`);
    
    // Return unsubscribe function
    return () => {
      const agentSubscribers = this.subscribers.get(agentName);
      if (agentSubscribers) {
        agentSubscribers.delete(callback);
        if (agentSubscribers.size === 0) {
          this.subscribers.delete(agentName);
        }
        console.log(`📡 Unsubscribed from status updates for agent ${agentName}. Remaining subscribers: ${agentSubscribers.size}`);
      }
    };
  }

  broadcast(agentName: string, status: StatusUpdate): void {
    console.log(`📡 Broadcasting status for agent ${agentName}:`, status);
    const agentSubscribers = this.subscribers.get(agentName);
    if (agentSubscribers) {
      console.log(`📡 Found ${agentSubscribers.size} subscribers for agent ${agentName}`);
      agentSubscribers.forEach(callback => {
        try {
          callback(status);
        } catch (error) {
          console.error('Error broadcasting status:', error);
        }
      });
    } else {
      console.warn(`⚠️ No subscribers found for agent ${agentName}`);
    }
  }

  // Helper methods for common status types
  searching(agentName: string, message: string = 'Searching for products...'): void {
    this.broadcast(agentName, {
      type: 'searching',
      message,
      timestamp: Date.now()
    });
  }

  foundProducts(agentName: string, products: any[]): void {
    this.broadcast(agentName, {
      type: 'found_products',
      message: `Found ${products.length} products`,
      data: { products },
      timestamp: Date.now()
    });
  }

  received402(agentName: string, paymentInfo: any): void {
    this.broadcast(agentName, {
      type: 'received_402',
      message: 'Payment required - preparing x402 payment',
      data: paymentInfo,
      timestamp: Date.now()
    });
  }

  preparingPayment(agentName: string, productName: string): void {
    this.broadcast(agentName, {
      type: 'preparing_payment',
      message: `Preparing payment for ${productName}...`,
      timestamp: Date.now()
    });
  }

  sendingPayment(agentName: string, productName: string): void {
    this.broadcast(agentName, {
      type: 'sending_payment',
      message: `Sending payment for ${productName}...`,
      timestamp: Date.now()
    });
  }

  paymentSuccess(agentName: string, productName: string, amount: string): void {
    this.broadcast(agentName, {
      type: 'payment_success',
      message: `Successfully purchased ${productName} for ${amount}`,
      data: { productName, amount },
      timestamp: Date.now()
    });
  }

  error(agentName: string, error: string): void {
    this.broadcast(agentName, {
      type: 'error',
      message: `Error: ${error}`,
      timestamp: Date.now()
    });
  }

  processing(agentName: string, message: string = 'Agent is thinking...'): void {
    this.broadcast(agentName, {
      type: 'processing',
      message,
      timestamp: Date.now()
    });
  }

  completed(agentName: string, message: string = 'Response ready'): void {
    this.broadcast(agentName, {
      type: 'completed',
      message,
      timestamp: Date.now()
    });
  }
}
