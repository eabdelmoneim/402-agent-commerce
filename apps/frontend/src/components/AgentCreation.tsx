import React, { useState } from 'react';
import { Bot, Wallet, Copy, Check } from 'lucide-react';
import { AgentService } from '../services/agentService';
import { Agent } from '../types';

interface AgentCreationProps {
  onAgentCreated: (agent: Agent) => void;
}

export const AgentCreation: React.FC<AgentCreationProps> = ({ onAgentCreated }) => {
  const [agentName, setAgentName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdAgent, setCreatedAgent] = useState<Agent | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const agent = await AgentService.createAgent(agentName.trim());
      setCreatedAgent(agent);
      onAgentCreated(agent);
      
      // Balance will be checked in the chat interface
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create agent');
    } finally {
      setIsCreating(false);
    }
  };


  const copyToClipboard = async () => {
    if (createdAgent) {
      await navigator.clipboard.writeText(createdAgent.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };


  if (createdAgent) {
    return (
      <div className="agent-creation-success">
        <div className="success-header">
          <Bot className="success-icon" />
          <h2>Agent Created Successfully!</h2>
        </div>
        
        <div className="agent-info">
          <div className="agent-name">
            <strong>Agent Name:</strong> {createdAgent.name}
          </div>
          
          <div className="wallet-section">
            <div className="wallet-header">
              <Wallet className="wallet-icon" />
              <span>Agent Wallet Address</span>
            </div>
            <div className="wallet-address">
              <code>{createdAgent.walletAddress}</code>
              <button 
                onClick={copyToClipboard}
                className={`copy-btn ${copied ? 'copied' : ''}`}
                title="Copy address"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div className="next-steps">
            <h3>Next Steps</h3>
            <p>
              Your agent is ready! You can now start chatting and the balance will be displayed in the chat interface.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-creation">
      <div className="creation-header">
        <Bot className="header-icon" />
        <h1>Create Your Shopping Agent</h1>
        <p>Give your AI shopping agent a name to get started</p>
      </div>

      <form onSubmit={handleCreateAgent} className="creation-form">
        <div className="input-group">
          <label htmlFor="agentName">Agent Name</label>
          <input
            id="agentName"
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="e.g., My Shopping Assistant"
            className="agent-name-input"
            disabled={isCreating}
            required
          />
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <button 
          type="submit" 
          className="create-btn"
          disabled={isCreating || !agentName.trim()}
        >
          {isCreating ? 'Creating Agent...' : 'Create Agent'}
        </button>
      </form>
    </div>
  );
};
