import React from 'react';
import { Bot, Plus, LogOut } from 'lucide-react';
import { Agent } from '../types';

interface AgentSelectorProps {
  agents: Agent[];
  onAgentSelected: (agent: Agent) => void;
  onCreateNewAgent: () => void;
  onLogout: () => void;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({ 
  agents, 
  onAgentSelected, 
  onCreateNewAgent,
  onLogout
}) => {
  return (
    <div className="agent-selector">
      <div className="selector-header">
        <Bot className="header-icon" />
        <h1>Select Your Agent</h1>
        <p>Choose an existing agent or create a new one</p>
        <button 
          onClick={onLogout}
          className="logout-btn"
          title="Logout and clear all agents (useful after server restart)"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>

      <div className="agents-grid">
        {agents.map((agent) => (
          <div 
            key={agent.id} 
            className="agent-card"
            onClick={() => onAgentSelected(agent)}
          >
            <div className="agent-card-header">
              <Bot className="agent-icon" />
              <h3>{agent.name}</h3>
            </div>
            
            <div className="agent-card-details">
              <div className="wallet-info">
                <span className="label">Wallet:</span>
                <code className="address">
                  {agent.walletAddress.slice(0, 6)}...{agent.walletAddress.slice(-4)}
                </code>
              </div>
              
              {agent.balance && (
                <div className="balance-info">
                  <span className="label">Balance:</span>
                  <span className={`balance ${agent.balance.startsWith('0') ? 'zero' : 'has-balance'}`}>
                    {agent.balance}
                  </span>
                </div>
              )}
              
              <div className="created-info">
                <span className="label">Created:</span>
                <span className="date">
                  {new Date(agent.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            <div className="agent-card-actions">
              <button className="select-btn">
                Chat with Agent
              </button>
            </div>
          </div>
        ))}
        
        <div 
          className="agent-card create-new"
          onClick={onCreateNewAgent}
        >
          <div className="create-new-content">
            <Plus className="create-icon" />
            <h3>Create New Agent</h3>
            <p>Start a new shopping agent</p>
          </div>
        </div>
      </div>
    </div>
  );
};
