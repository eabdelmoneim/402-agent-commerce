import { 
  ThirdwebWalletResponse, 
  ClientWalletConfig, 
  X402PaymentRequirements,
  ThirdwebX402PrepareRequest,
  ThirdwebX402PrepareResponse
} from '../types/Payment.js';

export class ClientWalletService {
  private clientWallet: ClientWalletConfig | null = null;

  async createOrGetClientWallet(): Promise<ClientWalletConfig> {
    if (this.clientWallet) {
      return this.clientWallet;
    }

    const identifier = process.env.CLIENT_WALLET_IDENTIFIER;
    if (!identifier) {
      throw new Error('CLIENT_WALLET_IDENTIFIER environment variable is required');
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
        throw new Error(`Failed to create/get client wallet: ${response.status} ${errorText}`);
      }

      const data: ThirdwebWalletResponse = await response.json();

      this.clientWallet = {
        identifier,
        address: data.result.address,
        smartWalletAddress: data.result.smartWalletAddress,
        publicKey: data.result.publicKey,
        role: 'client_agent'
      };

      console.log('✅ Client wallet initialized:', {
        identifier: this.clientWallet.identifier,
        walletAddress: this.clientWallet.address,
        role: this.clientWallet.role
      });

      return this.clientWallet;
    } catch (error: any) {
      console.error('Error creating client wallet:', error);
      throw error;
    }
  }

  getClientWallet(): ClientWalletConfig | null {
    return this.clientWallet;
  }

  getWalletAddress(): string | null {
    return this.clientWallet?.address || null;
  }

  async prepareX402Payment(productId: string, requirements: X402PaymentRequirements): Promise<ThirdwebX402PrepareResponse> {
    if (!this.clientWallet) {
      throw new Error('Client wallet not initialized');
    }

    const thirdwebSecretKey = process.env.THIRDWEB_SECRET_KEY;
    const thirdwebApiUrl = process.env.THIRDWEB_API_URL || 'https://api.thirdweb.com/v1';

    if (!thirdwebSecretKey) {
      throw new Error('THIRDWEB_SECRET_KEY environment variable is required');
    }

    try {
      const prepareRequest: ThirdwebX402PrepareRequest = {
        from: this.clientWallet.address,
        paymentRequirements: requirements
      };

      const response = await fetch(`${thirdwebApiUrl}/payments/x402/prepare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-secret-key': thirdwebSecretKey
        },
        body: JSON.stringify(prepareRequest)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to prepare x402 payment: ${response.status} ${errorText}`);
      }

      const result: ThirdwebX402PrepareResponse = await response.json();

      console.log('✅ x402 payment prepared successfully:', {
        productId,
        fromWallet: this.clientWallet.address,
        toWallet: requirements.payTo,
        amount: requirements.maxAmountRequired
      });

      return result;
    } catch (error: any) {
      console.error('Error preparing x402 payment:', error);
      throw error;
    }
  }
}
