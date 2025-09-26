export interface AgentWalletConfig {
  identifier: string;
  address: string;
  smartWalletAddress: string;
  publicKey: string;
  role: 'client_agent';
}

export class AgentManager {
  private agents: Map<string, AgentWalletConfig> = new Map();
  private merchantApiUrl: string;

  constructor() {
    // Initialize any required services here
    this.merchantApiUrl = process.env.MERCHANT_API_URL || 'http://localhost:3001/api';
    console.log('AgentManager initialized with merchant API:', this.merchantApiUrl);
  }

  private getThirdwebConfig() {
    const thirdwebSecretKey = process.env.THIRDWEB_SECRET_KEY;
    if (!thirdwebSecretKey) {
      throw new Error('THIRDWEB_SECRET_KEY environment variable is required');
    }

    const thirdwebApiUrl = process.env.THIRDWEB_API_URL || 'https://api.thirdweb.com/v1';

    return {
      secretKey: thirdwebSecretKey,
      apiUrl: thirdwebApiUrl
    };
  }

  async createAgent(agentName: string): Promise<AgentWalletConfig> {
    // Check if agent already exists
    if (this.agents.has(agentName)) {
      return this.agents.get(agentName)!;
    }

    try {
      // Use agent name as the identifier (sanitized for thirdweb)
      const identifier = agentName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      
      // Create actual thirdweb server wallet
      const { secretKey, apiUrl } = this.getThirdwebConfig();

      const response = await fetch(`${apiUrl}/wallets/server`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-secret-key': secretKey
        },
        body: JSON.stringify({
          identifier: identifier
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create agent wallet: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      console.log('🔍 Thirdweb API response:', JSON.stringify(data, null, 2));

      const agentConfig: AgentWalletConfig = {
        identifier,
        address: data.result.address,
        smartWalletAddress: data.result.smartWalletAddress,
        publicKey: data.result.publicKey,
        role: 'client_agent'
      };

      // Store the agent configuration
      this.agents.set(agentName, agentConfig);

      console.log('✅ Agent created:', {
        name: agentName,
        identifier,
        address: agentConfig.address,
        addressLength: agentConfig.address.length
      });

      return agentConfig;
    } catch (error: any) {
      console.error('Error creating agent:', error);
      throw new Error(`Failed to create agent: ${error.message}`);
    }
  }

  getAgent(agentName: string): AgentWalletConfig | null {
    return this.agents.get(agentName) || null;
  }

  getAllAgents(): AgentWalletConfig[] {
    return Array.from(this.agents.values());
  }

  async getAgentBalance(agentName: string): Promise<{ balance: string; currency: string }> {
    const agent = this.getAgent(agentName);
    if (!agent) {
      throw new Error('Agent not found');
    }

    console.log('🔍 Checking balance for agent:', {
      name: agentName,
      address: agent.address,
      addressLength: agent.address.length
    });

    try {
      const { secretKey, apiUrl } = this.getThirdwebConfig();
      const chainId = 84532; // Base Sepolia
      const usdcContractAddress = process.env.USDC_CONTRACT || '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

      const balanceUrl = `${apiUrl}/wallets/${agent.address}/balance?chainId=${chainId}&tokenAddress=${usdcContractAddress}`;
      console.log('🌐 Balance API URL:', balanceUrl);

      const response = await fetch(balanceUrl, {
        method: 'GET',
        headers: {
          'x-secret-key': secretKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get agent balance: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      // Find USDC token in the result array
      const usdcToken = data.result?.find((token: any) => 
        token.tokenAddress?.toLowerCase() === usdcContractAddress.toLowerCase()
      );

      if (usdcToken) {
        // Use the displayValue which is already formatted
        return {
          balance: usdcToken.displayValue || '0',
          currency: usdcToken.symbol || 'USDC'
        };
      } else {
        // No USDC token found, return zero balance
        return {
          balance: '0',
          currency: 'USDC'
        };
      }
    } catch (error: any) {
      console.error('Error getting agent balance:', error);
      // Return zero balance on error rather than throwing
      return {
        balance: '0',
        currency: 'USDC'
      };
    }
  }

  // Method to search products through merchant API
  async searchProducts(query: string, maxPrice?: number, minPrice?: number, count?: number): Promise<any> {
    try {
      const params = new URLSearchParams({ query });
      if (maxPrice !== undefined) params.append('maxPrice', maxPrice.toString());
      if (minPrice !== undefined) params.append('minPrice', minPrice.toString());
      if (count !== undefined) params.append('count', count.toString());

      const response = await fetch(`${this.merchantApiUrl}/products?${params}`);
      if (!response.ok) {
        throw new Error(`Merchant API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  // Method to get product details through merchant API
  async getProductDetails(productId: string): Promise<any> {
    try {
      const response = await fetch(`${this.merchantApiUrl}/products/${productId}`);
      if (!response.ok) {
        throw new Error(`Merchant API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting product details:', error);
      throw error;
    }
  }

  // Method to make a purchase through merchant API
  async makePurchase(productId: string, agentName: string): Promise<any> {
    const agent = this.getAgent(agentName);
    if (!agent) {
      throw new Error('Agent not found');
    }

    try {
      const response = await fetch(`${this.merchantApiUrl}/purchase/${productId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userWalletAddress: agent.address,
          // Add any other required fields for the purchase
        }),
      });

      if (!response.ok) {
        throw new Error(`Purchase failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error making purchase:', error);
      throw error;
    }
  }
}
