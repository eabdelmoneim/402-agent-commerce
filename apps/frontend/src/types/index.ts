export interface Agent {
  id: string;
  name: string;
  walletAddress: string;
  balance?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'agent' | 'status';
  content: string;
  timestamp: number;
  data?: any;
}

export interface StatusMessage {
  type: 'searching' | 'found_products' | 'received_402' | 'preparing_payment' | 'sending_payment' | 'payment_success' | 'error' | 'processing' | 'completed';
  message: string;
  data?: any;
  timestamp: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  features: string[];
  imageUrl?: string;
}

export interface PaymentFlow {
  step: 'idle' | 'searching' | 'found_products' | 'received_402' | 'preparing' | 'sending' | 'success' | 'error';
  message: string;
  data?: any;
}
