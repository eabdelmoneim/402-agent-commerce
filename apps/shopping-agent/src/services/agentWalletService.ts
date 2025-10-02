import { 
  ThirdwebWalletResponse, 
  AgentWalletConfig
} from '../types/Payment.js';

export class AgentWalletService {
  private agentWallet: AgentWalletConfig | null = null;

  async createOrGetAgentWallet(): Promise<AgentWalletConfig> {
    if (this.agentWallet) {
      return this.agentWallet;
    }

    const identifier = process.env.CLI_AGENT_WALLET_IDENTIFIER;
    if (!identifier) {
      throw new Error('CLI_AGENT_WALLET_IDENTIFIER environment variable is required');
    }

    const thirdwebSecretKey = process.env.THIRDWEB_SECRET_KEY;
    if (!thirdwebSecretKey) {
      throw new Error('THIRDWEB_SECRET_KEY environment variable is required');
    }

    const thirdwebApiUrl = process.env.THIRDWEB_API_URL || 'https://api.thirdweb.com/v1';

    try {
      const response = await fetch(`${thirdwebApiUrl}/wallets/server`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-secret-key': thirdwebSecretKey
        },
        body: JSON.stringify({
          identifier: identifier
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create/get agent wallet: ${response.status} ${errorText}`);
      }

      const data: ThirdwebWalletResponse = await response.json();

      this.agentWallet = {
        identifier,
        address: data.result.address,
        smartWalletAddress: data.result.smartWalletAddress,
        publicKey: data.result.publicKey,
        role: 'client_agent'
      };

      console.log('✅ Agent wallet initialized:', {
        identifier: this.agentWallet.identifier,
        walletAddress: this.agentWallet.address,
        role: this.agentWallet.role
      });

      return this.agentWallet;
    } catch (error: any) {
      console.error('Error creating agent wallet:', error);
      throw error;
    }
  }

  getClientWallet(): AgentWalletConfig | null {
    return this.agentWallet;
  }

  getWalletAddress(): string | null {
    return this.agentWallet?.address || null;
  }
}
