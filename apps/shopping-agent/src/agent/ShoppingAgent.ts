import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "langchain/agents";
import { AgentExecutor } from "langchain/agents";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { PromptTemplate } from "@langchain/core/prompts";

import { getAgentTools, setAgentInstance } from './tools.js';
import { ApiClient } from '../services/apiClient.js';
import { clientWalletService } from '../services/globalWallet.js';
import { AgentWalletConfig } from '../agents-api/services/agentManager.js';

export class ShoppingAgent {
  private llm: ChatOpenAI;
  private agent: AgentExecutor | null = null;
  private apiClient: ApiClient;
  private conversationHistory: BaseMessage[] = [];
  private lastSearchResults: any[] = []; // Store last product search results
  private agentWallet: AgentWalletConfig | null = null; // Agent-specific wallet

  constructor(openaiApiKey: string, agentWallet?: AgentWalletConfig) {
    this.llm = new ChatOpenAI({
      openAIApiKey: openaiApiKey,
      modelName: "gpt-4.1",
      temperature: 0,
    });
    this.agentWallet = agentWallet || null;
    this.apiClient = new ApiClient(this.agentWallet || undefined);
  }

  async initialize(): Promise<void> {
      console.log('🤖 Initializing Shopping Agent...');
    
    try {
      // Check if backend is available
      const isBackendHealthy = await this.apiClient.healthCheck();
      if (!isBackendHealthy) {
        throw new Error('Backend server is not available. Please start the server first.');
      }

      // Create the shopping agent with custom prompt
      const tools = getAgentTools();
      
      // Set this agent instance for context sharing
      setAgentInstance(this);

      // Create a custom prompt for shopping assistant
      const prompt = PromptTemplate.fromTemplate(`You are a shopping assistant. You MUST use the provided tools to search for products and process payments.

Available tools: {tools}

Use the following format EXACTLY:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

CRITICAL RULES:
1. You MUST end with "Final Answer:" followed by your response. Never provide direct responses without this format.
2. WORKFLOW: Search → Present Results → Wait for User Confirmation → Process Payment (in separate requests)
3. When users ask about products, you MUST use the get_products tool first. Never assume what's available.
4. After getting search results, you MUST include the complete product list from the tool observation in your Final Answer. Do NOT summarize or paraphrase the product list.
5. PRODUCT LIST FORMAT: Each product must be on its own line in this exact format: "1. Product Name - $X.XX USDC (ID: product-id)"
6. Present the complete product list clearly and ask which product they want to buy. Do NOT process payment yet.
7. When users confirm a purchase (e.g., "buy the MacBook Pro", "yes, buy it"), then use process_payment tool.
8. For payments, you MUST include all required parameters: productId, productName, price, and userConfirmed=true.
9. Use conversation context to remember previous search results and product details.
10. NEVER process payment without explicit user confirmation. Always ask "Which product would you like to buy?" after showing search results.

Previous conversation context: {chat_history}

Question: {input}
Thought: {agent_scratchpad}`);

      // Create the ReAct agent
      const reactAgent = await createReactAgent({
        llm: this.llm,
        tools,
        prompt,
      });

      // Wrap in executor
      this.agent = new AgentExecutor({
        agent: reactAgent,
        tools,
        verbose: false, // Temporarily enable to debug duplicates
        maxIterations: 3, // Force single iteration - immediate answer after one tool call
        returnIntermediateSteps: false,
        handleParsingErrors: "Check your output and make sure it conforms to the format instructions!", // Custom parsing error message
      });
      
      console.log('✅ Shopping Agent initialized successfully!');
      console.log('💡 You can now ask me to search for products or make purchases.');
      console.log('📝 Examples:');
      console.log('   - "Find me a TV under $5"');
      console.log('   - "Show me laptops"');
      console.log('   - "I want to buy headphones"');
      console.log('');
    } catch (error: any) {
      console.error('❌ Failed to initialize Shopping Agent:', error.message);
      throw error;
    }
  }

  async processRequest(userInput: string): Promise<string> {
    if (!this.agent) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    try {
      console.log(`👤 User: ${userInput}`);
      
      // Add user message to conversation history
      this.conversationHistory.push(new HumanMessage(userInput));
      
      // Format conversation history for the prompt
      const chatHistory = this.conversationHistory
        .slice(-10) // Keep last 10 messages for context
        .map(msg => {
          if (msg instanceof HumanMessage) {
            return `Human: ${msg.content}`;
          } else if (msg instanceof AIMessage) {
            return `Assistant: ${msg.content}`;
          }
          return '';
        })
        .join('\n');

      // Process the request through LangChain's ReAct agent
      const result = await this.agent.invoke({
        input: userInput,
        chat_history: chatHistory
      });

      const response = result.output || 'I apologize, but I encountered an issue processing your request.';
      
      // Add AI response to conversation history
      this.conversationHistory.push(new AIMessage(response));
      
      return response;
    } catch (error: any) {
      console.error('Error processing request:', error);
      const errorMessage = `I apologize, but I encountered an error: ${error.message}. Please try again with a different request.`;
      
      // Add error to conversation history
      this.conversationHistory.push(new AIMessage(errorMessage));
      
      return errorMessage;
    }
  }

  async getWalletInfo() {
    // Use agent-specific wallet if available, otherwise fall back to global wallet
    if (this.agentWallet) {
      return {
        walletAddress: this.agentWallet.address,
        role: this.agentWallet.role,
        identifier: this.agentWallet.identifier
      };
    }
    
    // Fallback to global wallet service for CLI compatibility
    const wallet = clientWalletService.getClientWallet();
    if (wallet) {
      return {
        walletAddress: wallet.address,
        role: wallet.role
      };
    }
    return null;
  }

  clearHistory(): void {
    this.conversationHistory = [];
    console.log('🧹 Conversation history cleared.');
  }

  getConversationHistory(): BaseMessage[] {
    return [...this.conversationHistory];
  }

  // Product context management
  setLastSearchResults(products: any[]): void {
    this.lastSearchResults = products;
  }

  getLastSearchResults(): any[] {
    return this.lastSearchResults;
  }

  findProductByName(productName: string): any | null {
    const normalizedName = productName.toLowerCase();
    return this.lastSearchResults.find(p => 
      p.name.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(p.name.toLowerCase().split(' ')[0]) // Match brand name
    );
  }

  findProductByIndex(index: number): any | null {
    return this.lastSearchResults[index - 1] || null; // 1-based index
  }
}
