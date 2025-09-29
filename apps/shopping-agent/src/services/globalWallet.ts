import { AgentWalletService } from './agentWalletService.js';

// Global agent wallet service instance
export const clientWalletService = new AgentWalletService();

// Initialize the wallet service on module load
export async function initializeWalletService(): Promise<void> {
  try {
    console.log('🔑 Initializing global agent wallet service...');
    await clientWalletService.createOrGetAgentWallet();
    console.log('✅ Global agent wallet service initialized');
  } catch (error: any) {
    console.error('❌ Failed to initialize global agent wallet service:', error);
    throw error;
  }
}
