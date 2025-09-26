import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, RefreshCw, AlertCircle, Check, Copy, ArrowLeft, Users } from 'lucide-react';
import { ChatMessage, Agent, StatusMessage } from '../types';
import { AgentService } from '../services/agentService';
import { WebSocketService, StatusUpdate } from '../services/websocketService';
import { StatusIndicator } from './StatusIndicator';

interface ChatInterfaceProps {
  agent: Agent;
  onBackToAgents: () => void;
  onSwitchAgent: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ agent, onBackToAgents, onSwitchAgent }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<StatusMessage | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsService = WebSocketService.getInstance();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages from localStorage when component mounts
  useEffect(() => {
    const savedMessages = localStorage.getItem(`chat-${agent.name}`);
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
    checkBalance();
  }, [agent]);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat-${agent.name}`, JSON.stringify(messages));
    }
  }, [messages, agent.name]);

  // WebSocket subscription for status updates
  useEffect(() => {
    // Connect WebSocket if not already connected
    wsService.connect();
    
    // Subscribe to status updates for this agent
    const unsubscribe = wsService.subscribe(agent.name, (status: StatusUpdate) => {
      // Convert StatusUpdate to StatusMessage for current status
      setCurrentStatus({
        type: status.type as any,
        message: status.message,
        data: status.data,
        timestamp: status.timestamp
      });
      
      // Clear current status after a delay for non-persistent statuses
      if (status.type === 'completed' || status.type === 'error') {
        setTimeout(() => {
          setCurrentStatus(null);
        }, 3000);
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [agent.name, wsService]);

  const addMessage = (message: Omit<ChatMessage, 'id'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const checkBalance = async () => {
    setIsCheckingBalance(true);
    setBalanceError(null);
    
    try {
      const balanceData = await AgentService.getAgentBalance(agent.name);
      setBalance(`${balanceData.balance} ${balanceData.currency}`);
    } catch (err: any) {
      setBalanceError('Failed to check balance');
      console.error('Balance check error:', err);
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const refreshBalance = async () => {
    await checkBalance();
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(agent.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openFaucet = () => {
    window.open('https://faucet.circle.com/', '_blank', 'noopener,noreferrer');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message
    addMessage({
      type: 'user',
      content: userMessage,
      timestamp: Date.now(),
    });

    setIsLoading(true);
    setCurrentStatus({
      type: 'searching',
      message: 'Agent is thinking...',
      timestamp: Date.now(),
    });

    try {
      const response = await AgentService.sendMessage(agent.name, userMessage);
      
      // Add agent response
      addMessage({
        type: 'agent',
        content: response.response,
        timestamp: Date.now(),
        data: response.status,
      });

      // Clear status
      setCurrentStatus(null);
    } catch (error: any) {
      addMessage({
        type: 'agent',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
      });
      setCurrentStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAgentMessage = (content: string) => {
    // Debug: Log the full content to see what we're working with
    console.log('🔍 Full agent response content:', content);
    
    // Split content into lines
    const lines = content.split('\n').filter(line => line.trim());
    console.log('🔍 Split into lines:', lines);
    
    return lines.map((line, index) => {
      console.log(`🔍 Processing line ${index}:`, line);
      
      // Check if line is a numbered list item (e.g., "1. Product Name - $price")
      const numberedItemMatch = line.match(/^(\d+)\.\s+(.+?)\s+-\s+\$([\d.]+)\s+USDC\s+\(ID:\s+(.+?)\)$/);
      
      if (numberedItemMatch) {
        console.log('✅ Matched numbered item:', numberedItemMatch);
        const [, number, productName, price, productId] = numberedItemMatch;
        return (
          <div key={index} className="product-item">
            <div className="product-header">
              <span className="product-number">{number}.</span>
              <span className="product-name">{productName}</span>
              <span className="product-price">${price} USDC</span>
            </div>
            <div className="product-id">ID: {productId}</div>
          </div>
        );
      }
      
      // Try a more flexible pattern for product items
      const flexibleProductMatch = line.match(/^(\d+)\.\s+(.+?)\s+-\s+\$([\d.]+)/);
      if (flexibleProductMatch) {
        console.log('✅ Matched flexible product:', flexibleProductMatch);
        const [, number, productName, price] = flexibleProductMatch;
        return (
          <div key={index} className="product-item">
            <div className="product-header">
              <span className="product-number">{number}.</span>
              <span className="product-name">{productName}</span>
              <span className="product-price">${price}</span>
            </div>
          </div>
        );
      }
      
      // Check if line is a question (ends with ?)
      if (line.endsWith('?')) {
        return (
          <div key={index} className="agent-question">
            {line}
          </div>
        );
      }
      
      // Check if line is a header (contains "available" or "found")
      if (line.includes('available') || line.includes('found')) {
        return (
          <div key={index} className="agent-header">
            {line}
          </div>
        );
      }
      
      // Regular text
      return (
        <div key={index} className="agent-text">
          {line}
        </div>
      );
    });
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user';
    
    return (
      <div key={message.id} className={`message ${isUser ? 'user-message' : 'agent-message'}`}>
        <div className="message-avatar">
          {isUser ? <User size={20} /> : <Bot size={20} />}
        </div>
        <div className="message-content">
          <div className="message-text">
            {isUser ? message.content : formatAgentMessage(message.content)}
          </div>
          <div className="message-time">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <div className="chat-header-top">
          <div className="nav-buttons">
            <button onClick={onBackToAgents} className="nav-btn" title="Back to agents">
              <ArrowLeft size={16} />
            </button>
            <button onClick={onSwitchAgent} className="nav-btn" title="Switch agent">
              <Users size={16} />
            </button>
          </div>
        </div>
        
        <div className="agent-info-row">
          <Bot className="agent-icon" />
          <div className="info-items">
            <span className="agent-name">{agent.name}</span>
            <div className="wallet-info">
              <code className="wallet-address">
                {agent.walletAddress.slice(0, 6)}...{agent.walletAddress.slice(-4)}
              </code>
              <button 
                onClick={copyToClipboard}
                className={`copy-btn ${copied ? 'copied' : ''}`}
                title="Copy full address"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
            <div className="balance-info">
              {isCheckingBalance ? (
                <span className="balance-loading">Loading...</span>
              ) : balanceError ? (
                <span className="balance-error">
                  <AlertCircle size={12} />
                  Error
                </span>
              ) : balance ? (
                <span className={`balance-amount ${balance.startsWith('0') ? 'zero-balance' : 'has-balance'}`}>
                  {balance}
                </span>
              ) : (
                <span className="balance-loading">Loading...</span>
              )}
              <button 
                onClick={refreshBalance} 
                className="refresh-btn"
                disabled={isCheckingBalance}
                title="Refresh balance"
              >
                <RefreshCw className={`refresh-icon ${isCheckingBalance ? 'spinning' : ''}`} size={12} />
              </button>
            </div>
            {balance && balance.startsWith('0') && (
              <div className="funding-alert-inline">
                <AlertCircle className="alert-icon" size={12} />
                <span>Needs Base Sepolia USDC</span>
                <button onClick={openFaucet} className="faucet-btn-inline">
                  Get USDC
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 && (
          <div className="welcome-message">
            <Bot className="welcome-icon" />
            <h3>Welcome to your shopping agent!</h3>
            <p>Ask me to find products, compare prices, or make purchases using x402 payments.</p>
            <div className="example-prompts">
              <p>Try saying:</p>
              <ul>
                <li>"Find me a TV under $5"</li>
                <li>"Show me laptops with good reviews"</li>
                <li>"I want to buy a smartphone"</li>
              </ul>
            </div>
          </div>
        )}

        {messages.map(renderMessage)}

        {currentStatus && (
          <div className="status-message">
            <StatusIndicator status={currentStatus} />
          </div>
        )}

        {isLoading && !currentStatus && (
          <div className="loading-message">
            <Loader2 className="loading-spinner" />
            <span>Agent is thinking...</span>
          </div>
        )}


        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="message-form">
        <div className="input-container">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask your agent to find products or make purchases..."
            className="message-input"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className="send-btn"
            disabled={isLoading || !inputMessage.trim()}
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};
