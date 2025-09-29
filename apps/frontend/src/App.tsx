import { useState, useEffect } from 'react';
import { Agent } from './types';
import { AgentCreation } from './components/AgentCreation';
import { ChatInterface } from './components/ChatInterface';
import { AgentSelector } from './components/AgentSelector';
import './App.css';

function App() {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showAgentSelector, setShowAgentSelector] = useState(false);

  // Load agents from localStorage on mount
  useEffect(() => {
    const savedAgents = localStorage.getItem('shopping-agents');
    if (savedAgents) {
      const parsedAgents = JSON.parse(savedAgents);
      setAgents(parsedAgents);
      
      // If there's only one agent, auto-select it
      if (parsedAgents.length === 1) {
        setAgent(parsedAgents[0]);
      } else if (parsedAgents.length > 1) {
        setShowAgentSelector(true);
      }
    }
    
    // Add global function for logout from console
    (window as any).logout = () => {
      handleLogout();
      console.log('✅ Logged out! Refresh the page to see the changes.');
    };
  }, []);

  const handleAgentCreated = (createdAgent: Agent) => {
    const updatedAgents = [...agents, createdAgent];
    setAgents(updatedAgents);
    setAgent(createdAgent);
    setShowAgentSelector(false);
    
    // Save to localStorage
    localStorage.setItem('shopping-agents', JSON.stringify(updatedAgents));
  };

  const handleAgentSelected = (selectedAgent: Agent) => {
    setAgent(selectedAgent);
    setShowAgentSelector(false);
  };

  const handleCreateNewAgent = () => {
    setAgent(null);
    setShowAgentSelector(false);
  };

  const handleBackToAgents = () => {
    setAgent(null);
    setShowAgentSelector(true);
  };

  const handleLogout = () => {
    // Clear all localStorage data
    localStorage.removeItem('shopping-agents');
    
    // Clear all chat histories
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('chat-')) {
        localStorage.removeItem(key);
      }
    });
    
    // Reset state
    setAgents([]);
    setAgent(null);
    setShowAgentSelector(false);
    
    console.log('🚪 Logged out - all agents and chat histories cleared');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Shopping Agent x402 Demo</h1>
        <p>Experience AI-powered shopping with blockchain payments</p>
      </header>

      <main className="app-main">
              {showAgentSelector ? (
                <AgentSelector 
                  agents={agents}
                  onAgentSelected={handleAgentSelected}
                  onCreateNewAgent={handleCreateNewAgent}
                  onLogout={handleLogout}
                />
              ) : !agent ? (
          <AgentCreation onAgentCreated={handleAgentCreated} />
        ) : (
          <ChatInterface 
            agent={agent} 
            onBackToAgents={handleBackToAgents}
            onSwitchAgent={() => setShowAgentSelector(true)}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>
          Built with React, LangChain, and thirdweb x402 protocol
        </p>
      </footer>
    </div>
  );
}

export default App;
