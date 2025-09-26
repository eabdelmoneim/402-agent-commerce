import { ThirdwebWalletResponse, WalletConfig } from '../types/payment.js';

export class ThirdwebWalletService {
  private merchantFacilitatorWallet: WalletConfig | null = null;

  async createOrGetMerchantWallet(): Promise<WalletConfig> {
    if (this.merchantFacilitatorWallet) {
      return this.merchantFacilitatorWallet;
    }

    const identifier = process.env.MERCHANT_WALLET_IDENTIFIER;
    if (!identifier) {
      throw new Error('MERCHANT_WALLET_IDENTIFIER environment variable is required');
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
        throw new Error(`Failed to create/get merchant wallet: ${response.status} ${errorText}`);
      }

      const data: ThirdwebWalletResponse = await response.json();

      this.merchantFacilitatorWallet = {
        identifier,
        address: data.result.address,
        smartWalletAddress: data.result.smartWalletAddress,
        publicKey: data.result.publicKey,
        role: 'merchant_facilitator'
      };

      return this.merchantFacilitatorWallet;
    } catch (error) {
      console.error('Error creating merchant wallet:', error);
      throw error;
    }
  }

  getMerchantFacilitatorWallet(): WalletConfig | null {
    return this.merchantFacilitatorWallet;
  }
}
