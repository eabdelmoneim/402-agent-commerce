import { ClientWalletService } from './clientWalletService.js';

// Global client wallet service instance
export const clientWalletService = new ClientWalletService();

// Initialize the wallet service on module load
export async function initializeWalletService(): Promise<void> {
  try {
    console.log('🔑 Initializing global client wallet service...');
    await clientWalletService.createOrGetClientWallet();
    console.log('✅ Global client wallet service initialized');
  } catch (error: any) {
    console.error('❌ Failed to initialize global client wallet service:', error);
    throw error;
  }
}
